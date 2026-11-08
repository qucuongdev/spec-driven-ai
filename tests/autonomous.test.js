// Integration evidence uses disposable repositories and synthetic agent/human identities.
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const engine = fs.existsSync(path.join(root, '.aidlc/tools/lifecycle.js')) ? '.aidlc/tools/lifecycle.js' : 'kit/.aidlc/tools/lifecycle.js';
const L = require(path.join(root, engine));
const { copyKit } = require('../scripts/copy-kit');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aidlc-autonomy-'));
const id = 'AUTO-1';
const record = `.aidlc/specs/active/${id}/`;
const command = 'node fixture-check.cjs';
let count = 0, failed = 0;
function test(name, operation) {
  count++;
  try { operation(); console.log(`ok ${count} - ${name}`); }
  catch (error) { failed++; console.error(`not ok ${count} - ${name}\n${error.stack}`); }
}
function run(program, args, cwd) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  return result;
}
function git(cwd, ...args) {
  const result = run('git', args, cwd);
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
  return result.stdout.trim();
}
function put(cwd, file, text) {
  fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
  fs.writeFileSync(path.join(cwd, file), text, 'utf8');
}
function read(cwd, file) { return JSON.parse(fs.readFileSync(path.join(cwd, file), 'utf8')); }
function copy(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name), to = path.join(destination, entry.name);
    assert(!fs.lstatSync(from).isSymbolicLink());
    if (entry.isDirectory()) copy(from, to); else fs.copyFileSync(from, to);
  }
}
function commit(cwd, message) {
  git(cwd, 'add', '.');
  git(cwd, '-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', message);
}
function context(cwd) {
  for (const file of L.CONTEXT_FILES) put(cwd, file, '# Observed fixture context\nDerived from synthetic repository evidence.\n');
  return L.observeContext(cwd, 'Fixture coordinator', 'Synthetic repository observation, not human approval');
}
function progress(cwd) { return L.progress(cwd, id, 'Fixture coordinator', 'Artifacts and evidence inspected in a disposable integration fixture'); }
function outputs(cwd, stage) {
  for (const file of L.STAGES[stage].outputs) {
    if (file === 'plan.json') put(cwd, record + file, JSON.stringify({ allowedFiles: ['src/example.cjs'], testFiles: [], dependencyFiles: [], maxFiles: 1, verificationCommands: [command] }, null, 2) + '\n');
    else put(cwd, record + file, `# Fixture ${stage}\nSynthetic local evidence. PR publication and release are pending authorization.\n`);
  }
}
function start(cwd, profile = 'express', mode = 'autonomous') {
  L.createIntent(cwd, id, profile, mode);
  while (L.status(cwd, id).currentStage !== 'tests') {
    outputs(cwd, L.status(cwd, id).currentStage); progress(cwd);
  }
}
function implement(cwd) {
  outputs(cwd, 'tests'); progress(cwd);
  put(cwd, 'src/example.cjs', 'exports.answer = 42;\n');
  outputs(cwd, 'implement'); progress(cwd);
  outputs(cwd, 'verify');
}
function complete(cwd) {
  implement(cwd);
  assert.strictEqual(L.verify(cwd, id, command), 0);
  progress(cwd); outputs(cwd, 'pr');
  const state = progress(cwd);
  assert.strictEqual(state.localDeliveryComplete, true);
  return state;
}
function cli(cwd, ...args) { return run(process.execPath, ['.aidlc/tools/cli.js', ...args], cwd); }

try {
  const base = path.join(temp, 'base');
  fs.mkdirSync(base); git(base, 'init');
  put(base, 'existing.txt', 'Committed original\n');
  put(base, 'fixture-check.cjs', "const assert=require('assert');assert.strictEqual(require('./src/example.cjs').answer,42);console.log('Behavior verified');\n");
  commit(base, 'Synthetic pre-kit project');
  // Kit, context and unrelated user changes are deliberately not committed.
  copyKit(base); context(base);
  put(base, 'existing.txt', 'Pre-existing user work\n');
  put(base, 'unrelated.txt', 'Pre-existing untracked user work\n');
  function fixture(name) { const cwd = path.join(temp, name); copy(base, cwd); return cwd; }

  test('fresh uncommitted drop-in reaches local PR draft without human attestations or commits', () => {
    const cwd = fixture('drop-in'), before = git(cwd, 'rev-parse', 'HEAD');
    const index = git(cwd, 'ls-files', '--stage');
    start(cwd);
    const state = complete(cwd);
    assert.strictEqual(state.mode, 'autonomous');
    assert.strictEqual(state.currentStage, 'complete');
    assert(state.history.every(item => item.kind === 'agent' && !('by' in item)));
    assert.strictEqual(state.projectContext, true);
    assert.deepStrictEqual(L.check(cwd, id).files, ['src/example.cjs']);
    assert.strictEqual(git(cwd, 'rev-parse', 'HEAD'), before);
    assert.strictEqual(git(cwd, 'ls-files', '--stage'), index);
    assert.strictEqual(fs.readFileSync(path.join(cwd, 'existing.txt'), 'utf8'), 'Pre-existing user work\n');
  });

  test('unborn Git repository supports verification and autonomous local delivery', () => {
    const cwd = path.join(temp, 'unborn'); copyKit(cwd); git(cwd, 'init'); context(cwd);
    put(cwd, 'fixture-check.cjs', "require('assert').strictEqual(require('./src/example.cjs').answer,42);\n");
    start(cwd); complete(cwd);
    assert.strictEqual(L.status(cwd, id).baseCommit, null);
    assert.notStrictEqual(run('git', ['rev-parse', '--verify', 'HEAD'], cwd).status, 0);
    const before = L.fingerprint(cwd, read(cwd, record + 'state.json'));
    git(cwd, 'add', record);
    git(cwd, '-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Synthetic first metadata-only commit');
    assert.strictEqual(L.fingerprint(cwd, read(cwd, record + 'state.json')), before);
    assert.strictEqual(L.status(cwd, id).localDeliveryComplete, true);
  });

  test('feature, bugfix and refactor stop at draft delivery and reject autonomous deployment', () => {
    for (const profile of ['feature', 'bugfix', 'refactor']) {
      const cwd = fixture(profile); start(cwd, profile);
      const state = complete(cwd);
      assert.strictEqual(state.currentStage, 'deploy');
      assert.strictEqual(state.awaitingReleaseAuthorization, true);
      assert.throws(() => progress(cwd), /authorization|local delivery/);
      assert.strictEqual(L.status(cwd, id).currentStage, 'deploy');
    }
  });

  test('later edits to pre-existing dirty work are outside the plan', () => {
    const cwd = fixture('dirty-edit'); start(cwd);
    assert.deepStrictEqual(L.check(cwd, id).errors, []);
    put(cwd, 'existing.txt', 'New out-of-scope edit\n');
    assert(L.check(cwd, id).errors.some(error => error.includes('Outside allowedFiles: existing.txt')));
  });

  test('reverting a pre-existing dirty file to HEAD is still a checked modification', () => {
    const cwd = fixture('reverted-dirty'); start(cwd);
    put(cwd, 'existing.txt', 'Committed original\n');
    assert(L.check(cwd, id).errors.some(error => error.includes('Outside allowedFiles: existing.txt')));
  });

  test('deleting a pre-existing untracked file is still a checked modification', () => {
    const cwd = fixture('deleted-untracked'); start(cwd);
    fs.unlinkSync(path.join(cwd, 'unrelated.txt'));
    assert(L.check(cwd, id).errors.some(error => error.includes('Outside allowedFiles: unrelated.txt')));
  });

  test('staged-only changes cannot hide behind unchanged baseline worktree bytes', () => {
    const cwd = fixture('index-change'); start(cwd);
    git(cwd, 'add', 'existing.txt');
    assert.strictEqual(fs.readFileSync(path.join(cwd, 'existing.txt'), 'utf8'), 'Pre-existing user work\n');
    assert(L.check(cwd, id).errors.some(error => error.includes('Outside allowedFiles: existing.txt')));
  });

  test('reviewed and legacy records reject agent progression and agent-only context', () => {
    for (const legacy of [false, true]) {
      const cwd = fixture(legacy ? 'legacy' : 'reviewed');
      L.createIntent(cwd, id, 'express', 'reviewed');
      if (legacy) { const state = read(cwd, record + 'state.json'); delete state.mode; put(cwd, record + 'state.json', JSON.stringify(state)); }
      assert.strictEqual(L.status(cwd, id).mode, 'reviewed');
      assert.strictEqual(L.status(cwd, id).projectContext, false);
      assert.throws(() => progress(cwd), /reviewed|legacy/);
      assert.throws(() => L.revise(cwd, id, 'context', 'Fixture agent', 'Synthetic attempt'), /reviewed|legacy/);
      assert.throws(() => L.advance(cwd, id, 'Fixture human', 'Synthetic acknowledgement'), /human acknowledgement/);
      L.approveContext(cwd, 'Fixture human', 'Synthetic human decision');
      assert.strictEqual(L.advance(cwd, id, 'Fixture human', 'Synthetic stage decision').currentStage, 'requirements');
    }
  });

  test('unknown and null modes fail closed without creating or advancing records', () => {
    const cwd = fixture('invalid-mode');
    for (const mode of ['automatic', null]) {
      assert.throws(() => L.createIntent(cwd, id, 'express', mode), /Unknown execution mode/);
      assert(!fs.existsSync(path.join(cwd, record)));
    }
    L.createIntent(cwd, id, 'express');
    const state = read(cwd, record + 'state.json'); state.mode = null;
    put(cwd, record + 'state.json', JSON.stringify(state));
    assert.throws(() => L.status(cwd, id), /Unknown execution mode/);
    assert.throws(() => progress(cwd), /Unknown execution mode/);
    const before = fs.readFileSync(path.join(cwd, record + 'state.json'), 'utf8');
    assert.throws(() => L.reopen(cwd, id, 'context', 'Fixture human', 'Synthetic reopen'), /Unknown execution mode/);
    assert.strictEqual(fs.readFileSync(path.join(cwd, record + 'state.json'), 'utf8'), before);
  });

  test('agent observation preserves unchanged human context and changed context needs new evidence', () => {
    const cwd = fixture('human-context');
    const receipt = L.approveContext(cwd, 'Fixture human', 'Synthetic acknowledgement');
    assert.deepStrictEqual(L.observeContext(cwd, 'Fixture coordinator', 'Synthetic reinspection'), receipt);
    assert.strictEqual(L.contextStatus(cwd).humanReady, true);
    put(cwd, L.CONTEXT_FILES[0], '# Changed synthetic context\nAn additional observed fact.\n');
    assert.strictEqual(L.contextStatus(cwd).ready, false);
    assert.strictEqual(L.observeContext(cwd, 'Fixture coordinator', 'New synthetic observation').kind, 'agent');
    assert.strictEqual(L.contextStatus(cwd).humanReady, false);
  });

  test('busy context receipt is preserved and another writer lock is not removed', () => {
    const cwd = fixture('busy-context'), lock = path.join(cwd, '.aidlc/specs/.context.lock');
    const before = fs.readFileSync(path.join(cwd, '.aidlc/specs/project-context.json'), 'utf8');
    fs.writeFileSync(lock, 'Synthetic owner\n', 'utf8');
    for (const operation of [() => context(cwd), () => L.approveContext(cwd, 'Fixture human', 'Synthetic acknowledgement')]) assert.throws(operation, /busy/);
    assert(fs.existsSync(lock));
    assert.strictEqual(fs.readFileSync(path.join(cwd, '.aidlc/specs/project-context.json'), 'utf8'), before);
  });

  test('failed context receipt replacement is atomic and releases its own lock', () => {
    const cwd = fixture('atomic-context'), receipt = path.join(cwd, '.aidlc/specs/project-context.json');
    const before = fs.readFileSync(receipt, 'utf8'), rename = fs.renameSync;
    try {
      fs.renameSync = (from, to) => { if (to === receipt) throw new Error('Synthetic context replacement failure'); return rename(from, to); };
      assert.throws(() => L.approveContext(cwd, 'Fixture human', 'Synthetic acknowledgement'), /replacement failure/);
    } finally { fs.renameSync = rename; }
    assert.strictEqual(fs.readFileSync(receipt, 'utf8'), before);
    assert(!fs.existsSync(path.join(cwd, '.aidlc/specs/.context.lock')));
    assert(!fs.readdirSync(path.dirname(receipt)).some(name => name.endsWith('.tmp')));
    assert.strictEqual(L.approveContext(cwd, 'Fixture human', 'Synthetic retry').kind, 'human');
  });

  test('failed behavior and missing verification evidence cannot complete verification', () => {
    const cwd = fixture('failed-behavior'); start(cwd); implement(cwd);
    assert.throws(() => progress(cwd), /Missing successful, current verification/);
    put(cwd, 'src/example.cjs', 'exports.answer = 41;\n');
    assert.notStrictEqual(L.verify(cwd, id, command), 0);
    assert.throws(() => progress(cwd), /Missing successful, current verification/);
    put(cwd, 'src/example.cjs', 'exports.answer = 42;\n');
    assert.strictEqual(L.verify(cwd, id, command), 0);
    assert.strictEqual(progress(cwd).currentStage, 'pr');
  });

  test('agent revision during verification is preserved and prevents a stale success receipt', () => {
    const cwd = fixture('concurrent-revise');
    put(cwd, 'fixture-check.cjs', "const L=require('./.aidlc/tools/lifecycle.js');L.revise(process.cwd(),'AUTO-1','plan','Fixture coordinator','Synthetic concurrent revision');console.log('Concurrent revision recorded');\n");
    start(cwd); implement(cwd);
    assert.notStrictEqual(L.verify(cwd, id, command), 0);
    const state = L.status(cwd, id);
    assert.strictEqual(state.currentStage, 'plan');
    assert.strictEqual(state.verifications.length, 0);
    assert(state.history.some(item => item.event === 'reopen' && item.kind === 'agent'));
  });

  test('local delivery freshness is invalidated by code, evidence, spec, plan and context changes', () => {
    const finished = fixture('finished'); start(finished); complete(finished);
    const mutations = {
      source: cwd => put(cwd, 'src/example.cjs', 'exports.answer = 99;\n'),
      index: cwd => git(cwd, 'add', 'src/example.cjs'),
      log: cwd => { const evidence = read(cwd, record + 'state.json').verifications[0]; put(cwd, record + evidence.log, 'Corrupted synthetic evidence\n'); },
      spec: cwd => put(cwd, record + 'spec.md', '# Changed specification\nChanged fixture requirement.\n'),
      plan: cwd => { const value = read(cwd, record + 'plan.json'); value.maxFiles++; put(cwd, record + 'plan.json', JSON.stringify(value)); },
      context: cwd => put(cwd, L.CONTEXT_FILES[0], '# Changed context\nNew synthetic business constraint.\n'),
      revise: cwd => L.revise(cwd, id, 'plan', 'Fixture coordinator', 'Synthetic plan correction')
    };
    for (const [name, mutation] of Object.entries(mutations)) {
      const cwd = path.join(temp, 'stale-' + name); copy(finished, cwd); mutation(cwd);
      assert.strictEqual(L.status(cwd, id).localDeliveryComplete, false, name);
      if (name === 'revise') assert.strictEqual(L.status(cwd, id).verifications.length, 0);
    }
  });

  test('CLI rejects conflicting identities, irrelevant options and extra positionals before writes', () => {
    const cwd = fixture('cli-rejections');
    const receipt = fs.readFileSync(path.join(cwd, '.aidlc/specs/project-context.json'), 'utf8');
    for (const args of [
      ['context', '--by', 'Fixture human', '--agent', 'Fixture agent', '--note', 'Synthetic conflict'],
      ['new', id, '--by', 'Fixture human'],
      ['new', id, '--mode', 'unsupported'],
      ['new', id, 'EXTRA'],
      ['context', '--note', 'Missing actor'],
      ['status', '--mode', 'autonomous']
    ]) assert.notStrictEqual(cli(cwd, ...args).status, 0, args.join(' '));
    assert(!fs.existsSync(path.join(cwd, record)));
    assert.strictEqual(fs.readFileSync(path.join(cwd, '.aidlc/specs/project-context.json'), 'utf8'), receipt);
  });

  test('CLI records autonomous context and stage progress without a human identity', () => {
    const cwd = fixture('cli-progress');
    assert.strictEqual(cli(cwd, 'context', '--agent', 'Fixture coordinator', '--note', 'Synthetic observation').status, 0);
    assert.strictEqual(cli(cwd, 'new', id, '--profile', 'express').status, 0);
    const result = cli(cwd, 'progress', id, '--agent', 'Fixture coordinator', '--note', 'Synthetic context inspection');
    assert.strictEqual(result.status, 0, result.stderr);
    const state = JSON.parse(result.stdout);
    assert.strictEqual(state.currentStage, 'requirements');
    assert.strictEqual(state.history[0].kind, 'agent');
    assert(!('by' in state.history[0]));
    assert.strictEqual(cli(cwd, 'revise', id, '--stage', 'context', '--agent', 'Fixture coordinator', '--note', 'Synthetic correction').status, 0);
  });

  console.log(`${count - failed}/${count} autonomous integration checks passed.`);
  if (failed) process.exitCode = 1;
} finally {
  const absolute = path.resolve(temp);
  if (!absolute.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(absolute).startsWith('aidlc-autonomy-')) throw new Error('Unsafe temporary fixture cleanup');
  fs.rmSync(absolute, { recursive: true, force: true });
}
