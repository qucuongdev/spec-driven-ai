const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

// A compact adaptation, not AWS's 33-stage engine.
const STAGES = {
  context: { phase: 'Initialization', outputs: [] },
  framing: { phase: 'Ideation', outputs: ['framing.md'] },
  discovery: { phase: 'Inception', outputs: ['discovery.md'] },
  requirements: { phase: 'Inception', outputs: ['spec.md'] },
  plan: { phase: 'Inception', outputs: ['design.md', 'plan.json'] },
  tests: { phase: 'Construction', outputs: ['test-plan.md'] },
  implement: { phase: 'Construction', outputs: ['implementation.md'] },
  verify: { phase: 'Construction', outputs: ['verification.md'] },
  pr: { phase: 'Construction', outputs: ['pr.md'] },
  deploy: { phase: 'Operation', outputs: ['operations.md'] },
  feedback: { phase: 'Operation', outputs: ['feedback.md'] }
};
const PROFILES = {
  feature: Object.keys(STAGES),
  bugfix: ['context', 'discovery', 'requirements', 'plan', 'tests', 'implement', 'verify', 'pr', 'deploy', 'feedback'],
  refactor: ['context', 'discovery', 'requirements', 'plan', 'tests', 'implement', 'verify', 'pr', 'deploy', 'feedback'],
  express: ['context', 'requirements', 'plan', 'tests', 'implement', 'verify', 'pr']
};
const ACTIVE_DIR = '.aidlc/specs/active';
const CONTEXT_RECEIPT = '.aidlc/specs/project-context.json';
const CONTEXT_FILES = ['.aidlc/context/business/overview.md', '.aidlc/context/business/glossary.md', '.aidlc/context/business/rules.md', '.aidlc/context/architecture/system.md'];
const DEPENDENCIES = new Set(['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'requirements.txt', 'Pipfile', 'Pipfile.lock', 'poetry.lock', 'pyproject.toml', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'go.mod', 'go.sum', 'Cargo.toml', 'Cargo.lock']);
const now = () => new Date().toISOString();
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  try {
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
function git(root, args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
function repo(root) {
  let top;
  try { top = git(root, ['rev-parse', '--show-toplevel']).trim(); }
  catch { throw new Error('Run this command in a Git repository.'); }
  if (path.resolve(top).toLowerCase() !== path.resolve(root).toLowerCase()) throw new Error('Run from the repository root.');
}
function ticketId(value) {
  if (!value || !/^[a-z0-9][a-z0-9_-]*$/i.test(value)) throw new Error('Ticket must contain only letters, digits, hyphens and underscores.');
  return value.toUpperCase();
}
function intentDir(root, id) { return path.join(root, ACTIVE_DIR, ticketId(id)); }
function statePath(root, id) { return path.join(intentDir(root, id), 'state.json'); }
function select(root, id) {
  if (id) {
    const file = statePath(root, id);
    if (!fs.existsSync(file)) throw new Error(`No lifecycle state for ${id}. Legacy Markdown specs need migration; see .aidlc/docs/USER_GUIDE.md.`);
    return read(file);
  }
  const active = path.join(root, ACTIVE_DIR);
  const states = fs.existsSync(active) ? fs.readdirSync(active).filter(name => fs.existsSync(path.join(active, name, 'state.json'))) : [];
  if (states.length !== 1) throw new Error(`Specify a ticket: found ${states.length} active lifecycle records. No spec is selected implicitly when ambiguous.`);
  return read(path.join(active, states[0], 'state.json'));
}
function withTicketLock(root, id, operation) {
  const selected = select(root, id);
  const lock = path.join(intentDir(root, selected.id), '.state.lock');
  let descriptor;
  try { descriptor = fs.openSync(lock, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Ticket ${selected.id} is busy. Retry after the other writer finishes. If a process crashed, confirm it has stopped before removing ${lock}.`);
    throw error;
  }
  try { return operation(select(root, selected.id)); }
  finally { fs.closeSync(descriptor); fs.unlinkSync(lock); }
}
function attest(by, note) {
  if (!by || !by.trim() || !note || !note.trim()) throw new Error('A human checkpoint requires --by and --note. Names are attestations, not authentication.');
  return { by: by.trim(), note: note.trim(), at: now() };
}
function completedText(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing required output: ${file}`);
  const content = fs.readFileSync(file, 'utf8');
  if (!content.trim() || /\bTODO\b|\[TICKET_ID\]/.test(content)) throw new Error(`Complete the TODOs in ${file}; use a reasoned N/A when appropriate.`);
  return content;
}
function contextDigest(root) {
  return hash(CONTEXT_FILES.map(file => file + '\0' + completedText(path.join(root, file))).join('\0'));
}
function contextStatus(root) {
  try {
    const digest = contextDigest(root);
    const file = path.join(root, CONTEXT_RECEIPT);
    const receipt = fs.existsSync(file) ? read(file) : null;
    return { ready: !!receipt && receipt.digest === digest, files: CONTEXT_FILES, receipt };
  } catch (error) { return { ready: false, files: CONTEXT_FILES, reason: error.message }; }
}
function approveContext(root, by, note) {
  repo(root);
  const receipt = { ...attest(by, note), digest: contextDigest(root) };
  write(path.join(root, CONTEXT_RECEIPT), receipt);
}
function createIntent(root, ticket, profile = 'feature') {
  repo(root);
  const id = ticketId(ticket);
  if (!Object.prototype.hasOwnProperty.call(PROFILES, profile)) throw new Error(`Unknown profile: ${profile}. Choose ${Object.keys(PROFILES).join(', ')}.`);
  const dir = intentDir(root, id);
  if (fs.existsSync(dir)) throw new Error(`Intent already exists: ${dir}`);
  const templates = path.join(__dirname, '..', 'specs', 'templates', 'intent');
  const localTemplates = path.join(root, '.aidlc', 'specs', 'templates', 'intent');
  const outputs = [...new Set(PROFILES[profile].flatMap(stage => STAGES[stage].outputs))];
  const contents = outputs.map(file => {
    const local = path.join(localTemplates, file);
    const source = fs.existsSync(local) ? local : path.join(templates, file);
    return [file, fs.readFileSync(source, 'utf8').replace(/\[TICKET_ID\]/g, id)];
  });
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  try { fs.mkdirSync(dir); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Intent already exists: ${dir}`);
    throw error;
  }
  for (const [file, content] of contents) fs.writeFileSync(path.join(dir, file), content, 'utf8');
  let baseCommit = null;
  try { baseCommit = git(root, ['rev-parse', 'HEAD']).trim(); } catch { /* init may precede the first commit */ }
  const state = { schemaVersion: 2, id, profile, route: PROFILES[profile], current: 0, baseCommit, createdAt: now(), history: [], verifications: [] };
  write(statePath(root, id), state);
  return state;
}
function plan(root, state) {
  const value = read(path.join(intentDir(root, state.id), 'plan.json'));
  for (const key of ['allowedFiles', 'testFiles', 'dependencyFiles', 'verificationCommands']) {
    if (!Array.isArray(value[key]) || !value[key].every(item => typeof item === 'string' && item.trim())) throw new Error(`plan.json requires ${key}: an array of nonempty strings.`);
  }
  for (const name of [...value.allowedFiles, ...value.testFiles, ...value.dependencyFiles]) {
    if (name.includes('\\') || name.includes('\0') || name.includes(':') || name.startsWith('/') || name.split('/').some(p => !p || p === '.' || p === '..') || /[*?\[\]]/.test(name)) throw new Error(`Use exact repository-relative paths in plan.json: ${name}`);
  }
  if (!value.allowedFiles.length || !Number.isInteger(value.maxFiles) || value.maxFiles < 1) throw new Error('plan.json requires allowedFiles and a positive integer maxFiles.');
  if (!value.verificationCommands.length) throw new Error('Record at least one verification command in plan.json.');
  for (const file of [...value.testFiles, ...value.dependencyFiles]) if (!value.allowedFiles.includes(file)) throw new Error(`${file} must also appear in allowedFiles.`);
  if (new Set(value.allowedFiles).size !== value.allowedFiles.length) throw new Error('Duplicate allowedFiles entries.');
  return value;
}
function metadata(file, id) {
  return file.startsWith(`${ACTIVE_DIR}/${id}/`) || file === CONTEXT_RECEIPT;
}
function changedFiles(root, base) {
  repo(root);
  const paths = new Set();
  const add = output => output.split('\0').filter(Boolean).forEach(file => paths.add(file));
  // Both sides of renames are inspected. NUL records preserve spaces and Unicode.
  add(git(root, ['diff', '--cached', '--name-only', '--no-renames', '-z', 'HEAD', '--']));
  add(git(root, ['diff', '--name-only', '--no-renames', '-z', '--']));
  add(git(root, ['ls-files', '--others', '--exclude-standard', '-z']));
  if (base) {
    if (base.startsWith('-')) throw new Error('Invalid base ref.');
    const commit = git(root, ['rev-parse', '--verify', `${base}^{commit}`]).trim();
    add(git(root, ['diff', '--name-only', '--no-renames', '-z', `${commit}...HEAD`, '--']));
  }
  return [...paths].sort();
}
function isTest(file) { return /(^|\/)(__tests__|tests?|spec)\//.test(file) || /\.(test|spec)\.[^/]+$|_test\.go$|(^|\/)test_[^/]+\.py$/.test(file); }
function validateReceipts(root, state) {
  const errors = [];
  const context = contextStatus(root);
  for (const receipt of state.history.filter(item => !item.invalidated)) {
    if (receipt.contextDigest !== (context.receipt && context.receipt.digest)) errors.push(`Project context changed after ${receipt.stage}; reopen context.`);
    for (const [file, digest] of Object.entries(receipt.outputs || {})) {
      const absolute = path.join(intentDir(root, state.id), file);
      if (!fs.existsSync(absolute) || hash(fs.readFileSync(absolute, 'utf8')) !== digest) errors.push(`Approved output changed: ${file}; reopen ${receipt.stage}.`);
    }
  }
  return errors;
}
function check(root, id, base) {
  const state = select(root, id);
  const value = plan(root, state);
  const files = changedFiles(root, base || state.baseCommit).filter(file => !metadata(file, state.id));
  const errors = validateReceipts(root, state);
  if (!contextStatus(root).ready) errors.push('Project context is missing, incomplete or changed since acknowledgement.');
  const approval = [...state.history].reverse().find(item => item.stage === 'plan' && !item.invalidated);
  if (!approval) errors.push('The implementation plan has no recorded checkpoint.');
  else if (approval.planDigest !== hash(JSON.stringify(value))) errors.push('Plan changed: reopen plan and record a new checkpoint.');
  for (const file of files) {
    if (!value.allowedFiles.includes(file)) errors.push(`Outside allowedFiles: ${file}`);
    if (isTest(file) && !value.testFiles.includes(file)) errors.push(`Test change not declared in testFiles: ${file}`);
    if (DEPENDENCIES.has(path.posix.basename(file)) && !value.dependencyFiles.includes(file)) errors.push(`Dependency change not declared in dependencyFiles: ${file}`);
  }
  if (files.length > value.maxFiles) errors.push(`Changed ${files.length} files; maxFiles is ${value.maxFiles}. All non-record files count, including tests and docs.`);
  return { files, errors };
}
function fingerprint(root, state) {
  // Hash the current tree, not just the diff; record files do not invalidate tests.
  const files = git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  const digest = crypto.createHash('sha256');
  // A metadata-only commit must not create an endless verify/commit cycle.
  // Source commits still invalidate receipts, even if the worktree bytes match.
  digest.update(git(root, ['log', '-1', '--format=%H', '--', '.', `:(exclude)${ACTIVE_DIR}/${state.id}/`, `:(exclude)${CONTEXT_RECEIPT}`]).trim());
  for (const file of [...new Set(files)].sort()) {
    if (metadata(file, state.id)) continue;
    digest.update(file + '\0');
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) digest.update('DELETED');
    else if (fs.lstatSync(absolute).isSymbolicLink()) digest.update('LINK:' + fs.readlinkSync(absolute));
    else if (fs.statSync(absolute).isFile()) digest.update(fs.readFileSync(absolute));
    else digest.update('NONFILE');
  }
  digest.update(JSON.stringify(plan(root, state)));
  digest.update(contextDigest(root));
  return digest.digest('hex');
}
function status(root, id) {
  const state = select(root, id);
  const currentStage = state.route[state.current];
  return { ...state, currentStage: currentStage || 'complete', phase: currentStage ? STAGES[currentStage].phase : 'Complete', requiredOutputs: currentStage ? STAGES[currentStage].outputs : [], projectContext: contextStatus(root).ready };
}
function validVerification(root, state, record, command, digest) {
  if (record.command !== command || record.exitCode !== 0 || record.fingerprint !== digest ||
      typeof record.log !== 'string' || !/^logs\/verify-\d+-[a-f0-9]+\.txt$/.test(record.log)) return false;
  try {
    if (fs.lstatSync(path.join(intentDir(root, state.id), 'logs')).isSymbolicLink()) return false;
    const file = path.join(intentDir(root, state.id), record.log);
    const stat = fs.lstatSync(file);
    return stat.isFile() && !stat.isSymbolicLink() && hash(fs.readFileSync(file)) === record.outputDigest;
  } catch { return false; }
}
function advance(root, id, by, note) {
  repo(root);
  const receipt = attest(by, note);
  return withTicketLock(root, id, state => {
    const stage = state.route[state.current];
    if (!stage) throw new Error('Workflow is complete.');
    if (!contextStatus(root).ready) throw new Error('Complete and acknowledge project context first. Run context.');
    const stale = validateReceipts(root, state);
    if (stale.length) throw new Error(stale.join('\n'));
    receipt.contextDigest = contextStatus(root).receipt.digest;
    const dir = intentDir(root, state.id);
    const outputs = {};
    for (const file of STAGES[stage].outputs) outputs[file] = hash(completedText(path.join(dir, file)));
    if (stage === 'plan') receipt.planDigest = hash(JSON.stringify(plan(root, state)));
    if (state.current > state.route.indexOf('plan')) {
      const result = check(root, state.id);
      if (result.errors.length) throw new Error(result.errors.join('\n'));
    }
    if (['verify', 'pr'].includes(stage)) {
      const digest = fingerprint(root, state);
      for (const command of plan(root, state).verificationCommands) {
        if (!state.verifications.some(record => validVerification(root, state, record, command, digest))) throw new Error(`Missing successful, current verification (intact log required): ${command}. Run verify with this exact command.`);
      }
    }
    state.history.push({ stage, ...receipt, outputs });
    state.current++;
    write(statePath(root, state.id), state);
    return status(root, state.id);
  });
}
function reopen(root, id, stage, by, note) {
  repo(root);
  const receipt = attest(by, note);
  return withTicketLock(root, id, state => {
    const index = state.route.indexOf(stage);
    if (index < 0 || index > state.current) throw new Error('Reopen a current or previously completed stage in this profile.');
    for (const record of state.history) if (state.route.indexOf(record.stage) >= index) record.invalidated = true;
    state.history.push({ event: 'reopen', stage, ...receipt, invalidated: true });
    state.current = index;
    state.verifications = [];
    write(statePath(root, state.id), state);
    return status(root, state.id);
  });
}
function verify(root, id, command) {
  repo(root);
  const state = select(root, id);
  const stateAtStart = JSON.stringify(state);
  if (!command || !command.trim()) throw new Error('Provide --command explicitly; commands are never executed automatically from documents.');
  if (!['implement', 'verify', 'pr'].includes(state.route[state.current])) throw new Error('Verification runs during implement, verify or pr.');
  const result = check(root, state.id);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  if (!plan(root, state).verificationCommands.includes(command)) throw new Error('Command is not in the acknowledged plan. Reopen plan to change commands.');
  const before = fingerprint(root, state);
  const run = spawnSync(command, { cwd: root, shell: true, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const after = fingerprint(root, state);
  const output = (run.stdout || '') + (run.stderr || '') + (run.error ? run.error.message : '');
  let exitCode = run.status === 0 && before === after ? 0 : (run.status || 1);
  const log = `logs/verify-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.txt`;
  fs.mkdirSync(path.join(intentDir(root, state.id), 'logs'), { recursive: true });
  fs.writeFileSync(path.join(intentDir(root, state.id), log), output, 'utf8');
  let stateChanged = false;
  try {
    withTicketLock(root, state.id, current => {
      if (JSON.stringify(current) !== stateAtStart) {
        stateChanged = true;
        exitCode = 1;
        return; // Preserve the newer checkpoint and history; never restore stale state.
      }
      current.verifications.push({ command, at: now(), exitCode, processExitCode: run.status, fingerprint: before, changedDuringRun: before !== after, log, outputDigest: hash(output) });
      write(statePath(root, current.id), current);
    });
  } catch (error) {
    exitCode = 1;
    console.error(`Could not record verification: ${error.message}`);
  }
  process.stdout.write(output);
  if (stateChanged) console.error('Ticket state changed during verification. The result was not recorded; complete the reopened checkpoints and rerun.');
  if (before !== after) console.error('Verification changed repository files. Review generated files, then rerun on a stable tree.');
  console.log(`Verification exit: ${exitCode}; evidence: .aidlc/specs/active/${state.id}/${log}`);
  return exitCode;
}

module.exports = { STAGES, PROFILES, CONTEXT_FILES, createIntent, contextStatus, approveContext, status, advance, reopen, verify, check, changedFiles, fingerprint };
