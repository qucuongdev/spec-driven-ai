const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');
const policy = require('./policy');

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
const CONTEXT_LOCK = '.aidlc/specs/.context.lock';
const MODES = ['autonomous', 'reviewed'];
const CONTEXT_FILES = ['.aidlc/context/business/overview.md', '.aidlc/context/business/glossary.md', '.aidlc/context/business/rules.md', '.aidlc/context/architecture/system.md'];
const DEPENDENCIES = new Set(['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'requirements.txt', 'Pipfile', 'Pipfile.lock', 'poetry.lock', 'pyproject.toml', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'go.mod', 'go.sum', 'Cargo.toml', 'Cargo.lock']);
const now = () => new Date().toISOString();
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function plainMetadataPath(root, file) {
  const base = path.resolve(root);
  const absolute = path.resolve(file);
  const relative = path.relative(base, absolute);
  if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error(`Unsafe metadata path outside the repository: ${file}`);
  let current = base;
  const components = relative.split(path.sep);
  for (let index = 0; index < components.length; index++) {
    current = path.join(current, components[index]);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) { if (error.code === 'ENOENT') break; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`Refusing a metadata symlink/junction: ${current}`);
    if (index < components.length - 1 && !stat.isDirectory()) throw new Error(`Unsafe metadata ancestor is not a directory: ${current}`);
  }
  return absolute;
}
function metadataPath(root, relative) { return plainMetadataPath(root, path.join(root, relative)); }
function artifactPath(root, id, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes('\0') || relative.includes(':') || relative.split('/').some(part => !part || part === '.' || part === '..') || path.isAbsolute(relative)) throw new Error(`Unsafe ticket metadata path: ${relative}`);
  return plainMetadataPath(root, path.join(intentDir(root, id), relative));
}
function write(root, file, data) {
  plainMetadataPath(root, file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  plainMetadataPath(root, file);
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`);
  try {
    plainMetadataPath(root, temporary);
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    plainMetadataPath(root, file);
    fs.renameSync(temporary, file);
  } finally {
    plainMetadataPath(root, temporary);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
function git(root, args) { return execFileSync('git', ['-c', 'diff.autoRefreshIndex=false', ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, stdio: ['ignore', 'pipe', 'pipe'] }); }
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
function intentDir(root, id) { return metadataPath(root, `${ACTIVE_DIR}/${ticketId(id)}`); }
function statePath(root, id) { return artifactPath(root, id, 'state.json'); }
function readState(root, id) {
  const expected = ticketId(id);
  const state = read(statePath(root, expected));
  if (!state || typeof state !== 'object' || state.id !== expected) throw new Error(`Ticket state identity mismatch: expected ${expected}.`);
  return state;
}
function select(root, id) {
  if (id) {
    const file = statePath(root, id);
    if (!fs.existsSync(file)) throw new Error(`No lifecycle state for ${id}. Legacy Markdown specs need migration; see .aidlc/docs/USER_GUIDE.md.`);
    return readState(root, id);
  }
  const active = metadataPath(root, ACTIVE_DIR);
  const states = fs.existsSync(active) ? fs.readdirSync(active, { withFileTypes: true }).filter(entry => {
    if (entry.isSymbolicLink()) plainMetadataPath(root, path.join(active, entry.name));
    return entry.isDirectory() && fs.existsSync(statePath(root, entry.name));
  }).map(entry => entry.name) : [];
  if (states.length !== 1) throw new Error(`Specify a ticket: found ${states.length} active lifecycle records. No spec is selected implicitly when ambiguous.`);
  return readState(root, states[0]);
}
function withTicketLock(root, id, operation) {
  const selected = select(root, id);
  const lock = artifactPath(root, selected.id, '.state.lock');
  let descriptor;
  try { descriptor = fs.openSync(lock, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Ticket ${selected.id} is busy. Retry after the other writer finishes. If a process crashed, confirm it has stopped before removing ${lock}.`);
    throw error;
  }
  try { return operation(select(root, selected.id)); }
  finally { fs.closeSync(descriptor); fs.unlinkSync(plainMetadataPath(root, lock)); }
}
function attest(by, note) {
  if (!by || !by.trim() || !note || !note.trim()) throw new Error('A human checkpoint requires --by and --note. Names are attestations, not authentication.');
  return { by: by.trim(), note: note.trim(), at: now() };
}
function agentRecord(agent, note) {
  if (typeof agent !== 'string' || !agent.trim() || typeof note !== 'string' || !note.trim()) throw new Error('An agent record requires --agent and --note; it is not human approval.');
  return { kind: 'agent', agent: agent.trim(), note: note.trim(), at: now() };
}
function executionMode(state) {
  const mode = state.mode === undefined ? 'reviewed' : state.mode;
  if (!MODES.includes(mode)) throw new Error(`Unknown execution mode: ${mode}`);
  return mode;
}
function withContextLock(root, operation) {
  const lock = metadataPath(root, CONTEXT_LOCK);
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  plainMetadataPath(root, lock);
  let descriptor;
  try { descriptor = fs.openSync(lock, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('Project context is busy; retry after the other writer finishes.'); throw error; }
  try { return operation(); }
  finally { fs.closeSync(descriptor); fs.unlinkSync(plainMetadataPath(root, lock)); }
}
function completedText(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing required output: ${file}`);
  const content = fs.readFileSync(file, 'utf8');
  const templateMarker = /^\s*(?:[-*+]\s+)?TODO(?:\s*:|\s*$)|(?:^|\|)\s*TODO\s*(?=\||$)|\[TICKET_ID\]/m;
  if (!content.trim() || templateMarker.test(content)) throw new Error(`Complete the TODOs in ${file}; use a reasoned N/A when appropriate.`);
  return content;
}
function contextDigest(root) {
  return hash(CONTEXT_FILES.map(file => file + '\0' + completedText(path.join(root, file))).join('\0'));
}
function contextStatus(root) {
  try {
    const digest = contextDigest(root);
    const file = metadataPath(root, CONTEXT_RECEIPT);
    const receipt = fs.existsSync(file) ? read(file) : null;
    const ready = !!receipt && receipt.digest === digest && (receipt.kind === 'agent' || receipt.kind === 'human' || receipt.kind === undefined);
    return { ready, observedReady: ready, humanReady: ready && receipt.kind !== 'agent', files: CONTEXT_FILES, receipt };
  } catch (error) { return { ready: false, observedReady: false, humanReady: false, files: CONTEXT_FILES, reason: error.message }; }
}
function approveContext(root, by, note) {
  repo(root);
  policy.load(root);
  const decision = { kind: 'human', ...attest(by, note) };
  return withContextLock(root, () => {
    const receipt = { ...decision, digest: contextDigest(root) };
    write(root, metadataPath(root, CONTEXT_RECEIPT), receipt);
    return receipt;
  });
}
function observeContext(root, agent, note) {
  repo(root);
  policy.load(root);
  const observation = agentRecord(agent, note);
  return withContextLock(root, () => {
    const current = contextStatus(root);
    if (current.humanReady) return current.receipt; // Never downgrade unchanged human evidence.
    const receipt = { ...observation, digest: contextDigest(root) };
    write(root, metadataPath(root, CONTEXT_RECEIPT), receipt);
    return receipt;
  });
}
function contextReady(root, state) {
  const context = contextStatus(root);
  return executionMode(state) === 'autonomous' ? context.observedReady : context.humanReady;
}
function createIntent(root, ticket, profile, mode) {
  repo(root);
  const company = policy.load(root).config;
  if (profile === undefined) profile = company.workflow.defaultProfile;
  if (mode === undefined) mode = company.workflow.defaultMode;
  if (!MODES.includes(mode)) throw new Error(`Unknown execution mode: ${mode}`);
  const id = ticketId(ticket);
  if (!Object.prototype.hasOwnProperty.call(PROFILES, profile)) throw new Error(`Unknown profile: ${profile}. Choose ${Object.keys(PROFILES).join(', ')}.`);
  const dir = intentDir(root, id);
  if (fs.existsSync(dir)) throw new Error(`Intent already exists: ${dir}`);
  const templates = path.join(__dirname, '..', 'specs', 'templates', 'intent');
  const localTemplates = metadataPath(root, '.aidlc/specs/templates/intent');
  const initialChanges = mode === 'autonomous' ? snapshotChanges(root, id) : undefined;
  const optionalReports = company.delivery.mode === 'pull-request' ? ['review.md', 'delivery.md'] : [];
  const outputs = [...new Set([...PROFILES[profile].flatMap(stage => STAGES[stage].outputs), ...optionalReports])];
  const contents = outputs.map(file => {
    const local = plainMetadataPath(root, path.join(localTemplates, file));
    const source = fs.existsSync(local) ? local : path.join(templates, file);
    if (optionalReports.includes(file) && !fs.existsSync(source)) return null;
    return [file, fs.readFileSync(source, 'utf8').replace(/\[TICKET_ID\]/g, id)];
  }).filter(Boolean);
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  plainMetadataPath(root, dir);
  try { fs.mkdirSync(dir); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Intent already exists: ${dir}`);
    throw error;
  }
  for (const [file, content] of contents) fs.writeFileSync(artifactPath(root, id, file), content, { encoding: 'utf8', flag: 'wx' });
  let baseCommit = null;
  try { baseCommit = git(root, ['rev-parse', 'HEAD']).trim(); } catch { /* init may precede the first commit */ }
  const state = { schemaVersion: 2, id, mode, initialChanges, profile, route: PROFILES[profile], current: 0, baseCommit, createdAt: now(), history: [], verifications: [] };
  write(root, statePath(root, id), state);
  return state;
}
function plan(root, state) {
  const value = read(artifactPath(root, state.id, 'plan.json'));
  for (const key of ['allowedFiles', 'testFiles', 'dependencyFiles', 'verificationCommands']) {
    if (!Array.isArray(value[key]) || !value[key].every(item => typeof item === 'string' && item.trim())) throw new Error(`plan.json requires ${key}: an array of nonempty strings.`);
  }
  for (const name of [...value.allowedFiles, ...value.testFiles, ...value.dependencyFiles]) {
    if (name.includes('\\') || name.includes('\0') || name.includes(':') || name.startsWith('/') || name.split('/').some(p => !p || p === '.' || p === '..') || /[*?\[\]]/.test(name)) throw new Error(`Use exact repository-relative paths in plan.json: ${name}`);
  }
  if (!value.allowedFiles.length || !Number.isInteger(value.maxFiles) || value.maxFiles < 1) throw new Error('plan.json requires allowedFiles and a positive integer maxFiles.');
  if (!value.verificationCommands.length) throw new Error('Record at least one verification command in plan.json.');
  for (const command of policy.load(root).config.quality.requiredCommands) {
    if (!value.verificationCommands.includes(command)) throw new Error(`Company policy requires verification command: ${command}`);
  }
  for (const file of [...value.testFiles, ...value.dependencyFiles]) if (!value.allowedFiles.includes(file)) throw new Error(`${file} must also appear in allowedFiles.`);
  if (new Set(value.allowedFiles).size !== value.allowedFiles.length) throw new Error('Duplicate allowedFiles entries.');
  return value;
}
function metadata(file, id) {
  return file.startsWith(`${ACTIVE_DIR}/${id}/`) || file === CONTEXT_RECEIPT || file === CONTEXT_LOCK;
}
function blobHash(bytes, objectId) {
  const algorithm = objectId.length === 40 ? 'sha1' : objectId.length === 64 ? 'sha256' : null;
  if (!algorithm) throw new Error('Unsupported Git object format.');
  return crypto.createHash(algorithm).update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}
function worktreeChanges(root, index) {
  // Disabling index refresh keeps diagnostics read-only, but raw diff then also
  // lists clean files with stale stat data. Compare candidate blobs with Git's
  // own per-path clean filters rather than treating those cache misses as edits.
  const records = git(root, ['diff', '--raw', '--no-abbrev', '--no-renames', '--no-ext-diff', '--no-textconv', '--ignore-submodules=none', '-z', '--']).split('\0').filter(Boolean);
  const changed = new Set(), candidates = [];
  for (let offset = 0; offset < records.length; offset += 2) {
    const details = records[offset].match(/^:([0-9]{6}) ([0-9]{6}) [a-f0-9]+ [a-f0-9]+ ([A-Z][0-9]*)$/);
    const file = records[offset + 1];
    if (!details || !file || /^[RC]/.test(details[3])) throw new Error('Cannot safely parse Git worktree diff.');
    const entry = index[file] && index[file].length === 1 && index[file][0].match(/^(100644|100755|120000) ([a-f0-9]+) 0$/);
    if (!entry || details[1] !== details[2] || details[1] !== entry[1]) { changed.add(file); continue; }
    const absolute = safeWorktreePath(root, file);
    let stat;
    try { stat = fs.lstatSync(absolute); }
    catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') { changed.add(file); continue; } throw error; }
    if (entry[1] === '120000' && (stat.isSymbolicLink() || stat.isFile())) {
      const bytes = stat.isSymbolicLink() ? fs.readlinkSync(absolute, { encoding: 'buffer' }) : fs.readFileSync(absolute);
      if (blobHash(bytes, entry[2]) !== entry[2]) changed.add(file);
    } else if (stat.isFile() && !stat.isSymbolicLink()) candidates.push({ file, objectId: entry[2] });
    else changed.add(file);
  }
  // Named file arguments apply each file's attributes/filters just like --path.
  // Small argv batches avoid Windows command-line limits without shell quoting.
  for (let offset = 0; offset < candidates.length;) {
    const batch = [];
    let length = 0;
    while (offset < candidates.length && (!batch.length || length + candidates[offset].file.length + 3 <= 6000)) {
      const candidate = candidates[offset++];
      if (candidate.file.length > 24000) throw new Error('Git path is too long for safe hash verification.');
      length += candidate.file.length + 3;
      batch.push(candidate);
    }
    const hashes = git(root, ['hash-object', '--', ...batch.map(item => item.file)]).trim().split(/\r?\n/);
    if (hashes.length !== batch.length || hashes.some(value => !/^[a-f0-9]+$/.test(value))) throw new Error('Cannot safely read Git candidate blob hashes.');
    for (let position = 0; position < batch.length; position++) if (hashes[position] !== batch[position].objectId) changed.add(batch[position].file);
  }
  return [...changed];
}
function changedFiles(root, base) {
  repo(root);
  const index = indexEntries(root);
  validateSubmoduleAvailability(root, index);
  const paths = new Set();
  const add = output => output.split('\0').filter(Boolean).forEach(file => paths.add(file));
  // Both sides of renames are inspected. NUL records preserve spaces and Unicode.
  add(git(root, ['diff', '--cached', '--name-only', '--no-renames', '--no-ext-diff', '--no-textconv', '--ignore-submodules=none', '-z', '--']));
  worktreeChanges(root, index).forEach(file => paths.add(file));
  add(git(root, ['ls-files', '--others', '--exclude-standard', '-z']));
  if (base) {
    if (base.startsWith('-')) throw new Error('Invalid base ref.');
    const commit = git(root, ['rev-parse', '--verify', `${base}^{commit}`]).trim();
    add(git(root, ['diff', '--name-only', '--no-renames', '--no-ext-diff', '--no-textconv', '--ignore-submodules=none', '-z', `${commit}...HEAD`, '--']));
  } else if (base === null) {
    // An intent created on an unborn branch has an empty committed baseline.
    // Enumerating HEAD is object-format independent and needs no synthetic commit.
    // Omitted base (initial dirty snapshot) deliberately retains its old meaning.
    Object.keys(treeEntries(root)).forEach(file => paths.add(file));
  }
  return [...paths].sort();
}
function indexEntries(root) {
  const entries = Object.create(null);
  for (const record of git(root, ['ls-files', '-v', '--stage', '-z']).split('\0').filter(Boolean)) {
    const separator = record.indexOf('\t');
    if (record[1] !== ' ' || separator < 2 || !/^[0-9]{6} [a-f0-9]+ [0-3]$/.test(record.slice(2, separator))) throw new Error('Cannot safely parse Git index entries.');
    if (/[a-z]/.test(record[0]) || record[0] === 'S') throw new Error(`Git index flag hides worktree changes: ${record.slice(separator + 1)}. Clear assume-unchanged/skip-worktree explicitly or use a full checkout; sparse checkout is unsupported by the scope helper.`);
    const name = record.slice(separator + 1);
    (entries[name] || (entries[name] = [])).push(record.slice(2, separator));
  }
  return entries;
}
function treeEntries(root) {
  try { git(root, ['rev-parse', '--verify', '--quiet', 'HEAD']); }
  catch (error) { if (error.status === 1) return Object.create(null); throw error; }
  const entries = Object.create(null);
  for (const record of git(root, ['ls-tree', '--full-tree', '-r', '-z', 'HEAD']).split('\0').filter(Boolean)) {
    const separator = record.indexOf('\t');
    entries[record.slice(separator + 1)] = record.slice(0, separator);
  }
  return entries;
}
function safeWorktreePath(root, file) {
  const base = path.resolve(root);
  const absolute = path.resolve(base, file);
  const relative = path.relative(base, absolute);
  if (!relative || relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error(`Unsafe repository path: ${file}`);
  let parent = base;
  for (const component of relative.split(path.sep).slice(0, -1)) {
    parent = path.join(parent, component);
    let stat;
    try { stat = fs.lstatSync(parent); }
    catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') break; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`Refusing to follow a worktree symlink ancestor: ${file}`);
  }
  return absolute;
}
function samePath(left, right) {
  const normalize = value => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
  return normalize(left) === normalize(right);
}
function submoduleLocation(root, file, seen) {
  const absolute = safeWorktreePath(root, file);
  const directory = fs.lstatSync(absolute);
  if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error('worktree is missing or is not a real directory');
  const marker = fs.lstatSync(path.join(absolute, '.git'));
  if (marker.isSymbolicLink() || (!marker.isDirectory() && !marker.isFile())) throw new Error('invalid or symbolic .git marker');
  // Upward Git discovery must never substitute the parent for a deinitialized
  // module. --show-toplevel also rejects bare repositories without a worktree.
  const top = git(absolute, ['rev-parse', '--show-toplevel']).trim();
  if (!samePath(top, absolute)) throw new Error('not an initialized repository at this path');
  const identity = fs.realpathSync(absolute);
  if (seen.has(identity) || seen.size >= 64) throw new Error('recursive or excessively nested submodule');
  const nestedSeen = new Set(seen);
  nestedSeen.add(identity);
  return { absolute, nestedSeen };
}
function validateSubmoduleAvailability(root, index, seen = new Set()) {
  for (const [file, entries] of Object.entries(index)) {
    if (!entries.some(entry => entry.startsWith('160000 '))) continue;
    try {
      const { absolute, nestedSeen } = submoduleLocation(root, file, seen);
      git(absolute, ['rev-parse', '--verify', 'HEAD']);
      validateSubmoduleAvailability(absolute, indexEntries(absolute), nestedSeen);
    } catch (error) {
      throw new Error(`Submodule unavailable or unsafe at ${file}: ${error.message}. Initialize/restore it explicitly before verification; no submodules are fetched or initialized automatically.`);
    }
  }
}
function submoduleState(root, file, seen) {
  try {
    const { absolute, nestedSeen } = submoduleLocation(root, file, seen);
    const head = git(absolute, ['rev-parse', '--verify', 'HEAD']).trim();
    const index = indexEntries(absolute);
    const tree = treeEntries(absolute);
    const names = git(absolute, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
    const files = [...new Set([...names, ...Object.keys(tree)])].sort();
    const digest = crypto.createHash('sha256');
    digest.update(head + '\0' + JSON.stringify(index) + '\0');
    for (const name of files) {
      digest.update(name + '\0');
      digest.update(JSON.stringify(fileState(absolute, name, index, tree, nestedSeen)));
    }
    return digest.digest('hex');
  } catch (error) {
    throw new Error(`Submodule unavailable or unsafe at ${file}: ${error.message}. Initialize/restore it explicitly before verification; no submodules are fetched or initialized automatically.`);
  }
}
function fileState(root, file, index, tree = {}, seen = new Set()) {
  // Only a current index gitlink is live. HEAD still supplies removed path names
  // to fingerprint(), but must not resurrect a staged deletion/replacement.
  if ((index[file] || []).some(entry => entry.startsWith('160000 '))) {
    return { worktree: 'SUBMODULE:' + submoduleState(root, file, seen), mode: '160000', index: index[file] || [] };
  }
  let worktree, mode = null;
  const absolute = safeWorktreePath(root, file);
  try {
    const stat = fs.lstatSync(absolute);
    mode = stat.isSymbolicLink() ? '120000' : stat.isFile() ? (stat.mode & 0o111 ? '100755' : '100644') : 'NONFILE';
    worktree = stat.isSymbolicLink() ? 'LINK:' + fs.readlinkSync(absolute) : stat.isFile() ? hash(fs.readFileSync(absolute)) : 'NONFILE';
  } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error; worktree = 'DELETED'; }
  return { worktree, mode, index: index[file] || [] };
}
function snapshotChanges(root, id) {
  const files = changedFiles(root).filter(file => !metadata(file, id));
  const index = files.length ? indexEntries(root) : {};
  const tree = files.length ? treeEntries(root) : {};
  return Object.fromEntries(files.map(file => [file, fileState(root, file, index, tree)]));
}
function isTest(file) { return /(^|\/)(__tests__|tests?|spec)\//.test(file) || /\.(test|spec)\.[^/]+$|_test\.go$|(^|\/)test_[^/]+\.py$/.test(file); }
function validateReceipts(root, state) {
  const errors = [];
  const context = contextStatus(root);
  for (const receipt of state.history.filter(item => !item.invalidated)) {
    if (receipt.contextDigest !== (context.receipt && context.receipt.digest)) errors.push(`Project context changed after ${receipt.stage}; reopen context.`);
    for (const [file, digest] of Object.entries(receipt.outputs || {})) {
      const absolute = artifactPath(root, state.id, file);
      if (!fs.existsSync(absolute) || hash(fs.readFileSync(absolute, 'utf8')) !== digest) errors.push(`Approved output changed: ${file}; reopen ${receipt.stage}.`);
    }
  }
  return errors;
}
function check(root, id, base) {
  const state = select(root, id);
  const mode = executionMode(state);
  const value = plan(root, state);
  let files = changedFiles(root, base || state.baseCommit).filter(file => !metadata(file, state.id));
  if (mode === 'autonomous' && state.initialChanges && Object.keys(state.initialChanges).length) {
    const index = indexEntries(root);
    const tree = treeEntries(root);
    files = [...new Set([...files, ...Object.keys(state.initialChanges)])].sort().filter(file => !Object.prototype.hasOwnProperty.call(state.initialChanges, file) || JSON.stringify(fileState(root, file, index, tree)) !== JSON.stringify(state.initialChanges[file]));
  }
  const errors = validateReceipts(root, state);
  if (!contextReady(root, state)) errors.push('Project context is missing, incomplete or changed; reviewed mode requires human acknowledgement.');
  if (mode === 'reviewed' && state.history.some(item => !item.invalidated && item.kind === 'agent')) errors.push('Agent checkpoints cannot satisfy reviewed mode.');
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
  const tree = treeEntries(root);
  const files = [...git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean), ...Object.keys(tree)];
  const digest = crypto.createHash('sha256');
  // A metadata-only commit must not create an endless verify/commit cycle.
  // Source commits still invalidate receipts, even if the worktree bytes match.
  let revision;
  try { revision = git(root, ['log', '-1', '--format=%H', '--', '.', `:(exclude)${ACTIVE_DIR}/${state.id}/`, `:(exclude)${CONTEXT_RECEIPT}`, `:(exclude)${CONTEXT_LOCK}`]).trim(); }
  catch (error) {
    try { git(root, ['rev-parse', '--verify', 'HEAD']); } catch { revision = 'UNBORN'; }
    if (revision !== 'UNBORN') throw error;
  }
  digest.update(revision || 'UNBORN');
  const index = indexEntries(root);
  for (const file of [...new Set(files)].sort()) {
    if (metadata(file, state.id)) continue;
    digest.update(file + '\0');
    digest.update(JSON.stringify(fileState(root, file, index, tree)));
  }
  digest.update(JSON.stringify(plan(root, state)));
  digest.update(contextDigest(root));
  digest.update(policy.load(root).digest);
  return digest.digest('hex');
}
function status(root, id) {
  const company = policy.load(root).config;
  const state = select(root, id);
  const currentStage = state.route[state.current];
  const mode = executionMode(state);
  let localDeliveryComplete = false;
  if (state.current > state.route.indexOf('pr')) {
    try {
      const result = check(root, state.id);
      const has = stage => state.history.some(item => item.stage === stage && !item.invalidated);
      if (!result.errors.length && has('verify') && has('pr')) {
        const digest = fingerprint(root, state);
        localDeliveryComplete = plan(root, state).verificationCommands.every(command => currentVerification(root, state, command, digest));
      }
    } catch { /* Missing/stale evidence is never local completion. */ }
  }
  return { ...state, mode, deliveryMode: company.delivery.mode, completionScope: 'local', currentStage: currentStage || 'complete', phase: currentStage ? STAGES[currentStage].phase : 'Complete', requiredOutputs: currentStage ? STAGES[currentStage].outputs : [], projectContext: contextReady(root, state), localDeliveryComplete, awaitingReleaseAuthorization: mode === 'autonomous' && localDeliveryComplete && currentStage === 'deploy' };
}
function validVerification(root, state, record, command, digest) {
  if (record.command !== command || record.exitCode !== 0 || record.fingerprint !== digest ||
      typeof record.log !== 'string' || !/^logs\/verify-\d+-[a-f0-9]+\.txt$/.test(record.log)) return false;
  try {
    const file = artifactPath(root, state.id, record.log);
    const stat = fs.lstatSync(file);
    return stat.isFile() && !stat.isSymbolicLink() && hash(fs.readFileSync(file)) === record.outputDigest;
  } catch { return false; }
}
function currentVerification(root, state, command, digest) {
  // A newer failed/pending/stale attempt or damaged log must not resurrect an
  // older green run, even when the worktree later returns to the same bytes.
  const record = [...state.verifications].reverse().find(item => item && item.command === command);
  return !!record && validVerification(root, state, record, command, digest);
}
function advanceWithReceipt(root, id, receipt, autonomous) {
  repo(root);
  policy.load(root);
  return withTicketLock(root, id, state => {
    if (autonomous && executionMode(state) !== 'autonomous') throw new Error('Agent progress is disabled for reviewed or legacy records.');
    const stage = state.route[state.current];
    if (!stage) throw new Error('Workflow is complete.');
    if (autonomous && ['deploy', 'feedback'].includes(stage)) throw new Error('External release/operations require explicit human authorization; local delivery stops at the PR draft.');
    if (!contextReady(root, state)) throw new Error('Complete project context first; reviewed mode requires human acknowledgement.');
    const stale = validateReceipts(root, state);
    if (stale.length) throw new Error(stale.join('\n'));
    receipt.contextDigest = contextStatus(root).receipt.digest;
    const outputs = {};
    for (const file of STAGES[stage].outputs) outputs[file] = hash(completedText(artifactPath(root, state.id, file)));
    if (stage === 'plan') receipt.planDigest = hash(JSON.stringify(plan(root, state)));
    if (state.current > state.route.indexOf('plan')) {
      const result = check(root, state.id);
      if (result.errors.length) throw new Error(result.errors.join('\n'));
    }
    if (['verify', 'pr'].includes(stage)) {
      const digest = fingerprint(root, state);
      for (const command of plan(root, state).verificationCommands) {
        if (!currentVerification(root, state, command, digest)) throw new Error(`Missing successful, current verification (intact latest log required): ${command}. Run verify with this exact command.`);
      }
    }
    state.history.push({ stage, ...receipt, outputs });
    state.current++;
    write(root, statePath(root, state.id), state);
    return status(root, state.id);
  });
}
function advance(root, id, by, note) { return advanceWithReceipt(root, id, { kind: 'human', ...attest(by, note) }, false); }
function progress(root, id, agent, note) { return advanceWithReceipt(root, id, agentRecord(agent, note), true); }
function reopenWithReceipt(root, id, stage, receipt, autonomous) {
  repo(root);
  policy.load(root);
  return withTicketLock(root, id, state => {
    const mode = executionMode(state);
    if (autonomous && mode !== 'autonomous') throw new Error('Agent revision is disabled for reviewed or legacy records.');
    const index = state.route.indexOf(stage);
    if (index < 0 || index > state.current) throw new Error('Reopen a current or previously completed stage in this profile.');
    for (const record of state.history) if (state.route.indexOf(record.stage) >= index) record.invalidated = true;
    state.history.push({ event: 'reopen', stage, ...receipt, invalidated: true });
    state.current = index;
    state.verifications = [];
    write(root, statePath(root, state.id), state);
    return status(root, state.id);
  });
}
function reopen(root, id, stage, by, note) { return reopenWithReceipt(root, id, stage, { kind: 'human', ...attest(by, note) }, false); }
function revise(root, id, stage, agent, note) { return reopenWithReceipt(root, id, stage, agentRecord(agent, note), true); }
function boundedUtf8(value, limit) {
  const bytes = Buffer.from(value, 'utf8');
  if (bytes.length <= limit) return value;
  let end = limit;
  // Do not decode an incomplete multibyte code point into a replacement symbol.
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
  return bytes.subarray(0, end).toString('utf8');
}
function verify(root, id, command) {
  repo(root);
  const quality = policy.load(root).config.quality;
  const state = select(root, id);
  let stateAtStart = JSON.stringify(state);
  if (!command || !command.trim()) throw new Error('Provide --command explicitly; commands are never executed automatically from documents.');
  if (!['implement', 'verify', 'pr'].includes(state.route[state.current])) throw new Error('Verification runs during implement, verify or pr.');
  const result = check(root, state.id);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  if (!plan(root, state).verificationCommands.includes(command)) throw new Error('Command is not in the acknowledged plan. Reopen plan to change commands.');
  artifactPath(root, state.id, 'logs');
  const before = fingerprint(root, state);
  const log = `logs/verify-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.txt`;
  // Persist an unfinished attempt before executing anything. A process crash or
  // failed evidence write must leave an unknown result, never an older PASS.
  withTicketLock(root, state.id, current => {
    if (JSON.stringify(current) !== stateAtStart) throw new Error('Ticket state changed before verification. Recheck the current stage and retry.');
    current.verifications.push({ command, at: now(), exitCode: null, fingerprint: before, pending: true, log, outputDigest: null });
    write(root, statePath(root, current.id), current);
    stateAtStart = JSON.stringify(current);
  });
  const run = spawnSync(command, { cwd: root, shell: true, encoding: 'utf8',
    timeout: quality.verificationTimeoutMs, maxBuffer: quality.maxOutputBytes, killSignal: 'SIGKILL' });
  let after = null, fingerprintError = null;
  try { after = fingerprint(root, state); } catch (error) { fingerprintError = error.message; }
  const timedOut = !!run.error && run.error.code === 'ETIMEDOUT';
  const captured = (run.stdout || '') + (run.stderr || '');
  const processOutputOverflow = Buffer.byteLength(captured, 'utf8') > quality.maxOutputBytes;
  const diagnostics =
    (run.error ? `\nVerification process failed${timedOut ? ' (timeout)' : ''}: ${run.error.message}\n` : '') +
    (fingerprintError ? `\nPost-command fingerprint failed: ${fingerprintError}\n` : '');
  const outputTruncated = Buffer.byteLength(captured + diagnostics, 'utf8') > quality.maxOutputBytes;
  // spawnSync may return an oversized final chunk even after ENOBUFS. Apply
  // one combined byte budget to retained stdout, stderr and failure diagnostics.
  // Keep the reason first when truncating rather than burying it after the data.
  const output = outputTruncated
    ? boundedUtf8(`Verification output truncated to ${quality.maxOutputBytes} bytes maximum.\n` + diagnostics + captured, quality.maxOutputBytes)
    : captured + diagnostics;
  const processError = run.error ? run.error.code || run.error.message : processOutputOverflow ? 'OUTPUT_LIMIT' : null;
  let exitCode = run.status === 0 && !run.error && !fingerprintError && !outputTruncated && before === after ? 0 : (run.status || 1);
  fs.mkdirSync(artifactPath(root, state.id, 'logs'), { recursive: true });
  fs.writeFileSync(artifactPath(root, state.id, log), output, { encoding: 'utf8', flag: 'wx' });
  let stateChanged = false;
  try {
    withTicketLock(root, state.id, current => {
      if (JSON.stringify(current) !== stateAtStart) {
        stateChanged = true;
        exitCode = 1;
        return; // Preserve the newer checkpoint and history; never restore stale state.
      }
      const last = current.verifications.length - 1;
      if (!current.verifications[last] || !current.verifications[last].pending || current.verifications[last].command !== command) throw new Error('Verification attempt was superseded; rerun against the current ticket state.');
      current.verifications[last] = { command, startedAt: current.verifications[last].at, at: now(), pending: false, exitCode, processExitCode: run.status, timedOut,
        processError, outputTruncated, fingerprintError,
        fingerprint: before, changedDuringRun: before !== after, log, outputDigest: hash(output) };
      write(root, statePath(root, current.id), current);
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

module.exports = { STAGES, PROFILES, MODES, CONTEXT_FILES, createIntent, contextStatus, approveContext, observeContext, status, advance, progress, reopen, revise, verify, check, changedFiles, fingerprint };
