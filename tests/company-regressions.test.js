// Company-policy and real Git regressions use only disposable local repositories.
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const engine = fs.existsSync(path.join(root, '.aidlc/tools/lifecycle.js')) ? '.aidlc/tools/lifecycle.js' : 'kit/.aidlc/tools/lifecycle.js';
const L = require(path.join(root, engine));
const { copyKit } = require('../scripts/copy-kit');
const prefix = 'aidlc-company-regression-';
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
const id = 'COMPANY-1';
const record = `.aidlc/specs/active/${id}/`;
const command = 'node fixture-check.cjs';
let count = 0, failed = 0;

function test(name, operation) {
  count++;
  try { operation(); console.log(`ok ${count} - ${name}`); }
  catch (error) { failed++; console.error(`not ok ${count} - ${name}\n${error.stack}`); }
}
function run(program, args, cwd, extra = {}) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', windowsHide: true, ...extra });
  if (result.error) throw result.error;
  return result;
}
function git(cwd, ...args) {
  const result = run('git', args, cwd);
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
  return result.stdout.trim();
}
function put(cwd, relative, text) {
  const file = path.join(cwd, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
}
function commit(cwd, message) {
  git(cwd, '-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', message);
}
function context(cwd) {
  for (const file of L.CONTEXT_FILES) put(cwd, file, '# Synthetic confirmed context\nOnly disposable fixture evidence.\n');
  L.observeContext(cwd, 'Company fixture', 'Confirmed from synthetic local repository');
}
function progress(cwd) { return L.progress(cwd, id, 'Company fixture', 'Checked synthetic artifacts and real local Git evidence'); }
function outputs(cwd, stage, commands = [command]) {
  for (const file of L.STAGES[stage].outputs) {
    if (file === 'plan.json') put(cwd, record + file, JSON.stringify({ allowedFiles: ['src/allowed.cjs'], testFiles: [], dependencyFiles: [], maxFiles: 1, verificationCommands: commands }, null, 2) + '\n');
    else put(cwd, record + file, `# Synthetic ${stage}\nOnly src/allowed.cjs is approved; existing user data is preserved.\n`);
  }
}
function start(cwd, commands = [command]) {
  L.createIntent(cwd, id, 'express');
  while (L.status(cwd, id).currentStage !== 'tests') {
    outputs(cwd, L.status(cwd, id).currentStage, commands);
    progress(cwd);
  }
}
function complete(cwd, commands = [command]) {
  outputs(cwd, 'tests', commands); progress(cwd);
  put(cwd, 'src/allowed.cjs', 'exports.answer = 42;\n');
  outputs(cwd, 'implement', commands); progress(cwd);
  outputs(cwd, 'verify', commands);
  for (const required of commands) assert.strictEqual(L.verify(cwd, id, required), 0);
  progress(cwd); outputs(cwd, 'pr', commands); progress(cwd);
  assert.strictEqual(L.status(cwd, id).localDeliveryComplete, true);
  return L.status(cwd, id);
}
function fresh(name, committed = false) {
  const cwd = path.join(temporary, name);
  copyKit(cwd); git(cwd, 'init');
  put(cwd, 'fixture-check.cjs', "require('assert').strictEqual(require('./src/allowed.cjs').answer,42);console.log('Synthetic behavior verified');\n");
  context(cwd);
  if (committed) { git(cwd, 'add', '.'); commit(cwd, 'Synthetic fixture baseline'); }
  return cwd;
}
function buildRegistered(name, { dirty = false, nested = false } = {}) {
  const source = path.join(temporary, name + '-source');
  fs.mkdirSync(source); git(source, 'init');
  put(source, 'value.txt', 'Original nested bytes\n');
  git(source, 'add', '.'); commit(source, 'Synthetic nested initial revision');
  put(source, 'value.txt', 'Latest nested bytes\n');
  git(source, 'add', '.'); commit(source, 'Synthetic nested latest revision');
  if (nested) {
    const leaf = path.join(temporary, name + '-leaf');
    fs.mkdirSync(leaf); git(leaf, 'init'); put(leaf, 'leaf.txt', 'Leaf bytes\n');
    git(leaf, 'add', '.'); commit(leaf, 'Synthetic leaf baseline');
    git(source, '-c', 'protocol.file.allow=always', 'submodule', 'add', leaf, 'inner');
    git(source, 'add', '.'); commit(source, 'Synthetic registered inner module');
  }
  const cwd = fresh(name);
  git(cwd, '-c', 'protocol.file.allow=always', 'submodule', 'add', source, 'vendor');
  if (nested) git(cwd, '-c', 'protocol.file.allow=always', 'submodule', 'update', '--init', '--recursive');
  git(cwd, 'add', '.'); commit(cwd, 'Synthetic parent with registered submodule');
  if (dirty) put(path.join(cwd, 'vendor'), 'value.txt', 'Pre-existing dirty bytes\n');
  start(cwd); const state = complete(cwd);
  return { cwd, nested: path.join(cwd, 'vendor'), state, fingerprint: L.fingerprint(cwd, state) };
}
const baselines = new Map();
function registered(name, options = {}) {
  const kind = options.nested ? 'recursive' : options.dirty ? 'dirty' : 'clean';
  if (!baselines.has(kind)) baselines.set(kind, buildRegistered('baseline-' + kind, options));
  const baseline = baselines.get(kind), cwd = path.join(temporary, name);
  function copy(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      const source = path.join(from, entry.name), destination = path.join(to, entry.name);
      assert(!fs.lstatSync(source).isSymbolicLink(), 'Disposable baseline copy refuses symlinks');
      if (entry.isDirectory()) copy(source, destination); else fs.copyFileSync(source, destination);
    }
  }
  copy(baseline.cwd, cwd);
  const state = L.status(cwd, id);
  assert.strictEqual(state.localDeliveryComplete, true, 'A copied baseline must retain valid evidence before mutation');
  return { cwd, nested: path.join(cwd, 'vendor'), state, fingerprint: L.fingerprint(cwd, state) };
}
function invalidated(fixture, file = 'vendor') {
  const checked = L.check(fixture.cwd, id);
  assert(checked.errors.includes(`Outside allowedFiles: ${file}`), JSON.stringify(checked));
  assert.notStrictEqual(L.fingerprint(fixture.cwd, fixture.state), fixture.fingerprint, 'Real repository changes must invalidate saved verification fingerprints');
  assert.strictEqual(L.status(fixture.cwd, id).localDeliveryComplete, false, 'Stale successful verification cannot remain local delivery complete');
}
function permitSubmoduleRemoval(fixture) {
  L.revise(fixture.cwd, id, 'plan', 'Company fixture', 'Synthetic requirement explicitly removes the registered module');
  outputs(fixture.cwd, 'plan');
  put(fixture.cwd, record + 'plan.json', JSON.stringify({ allowedFiles: ['src/allowed.cjs', '.gitmodules', 'vendor'], testFiles: [], dependencyFiles: [], maxFiles: 3, verificationCommands: [command] }));
  progress(fixture.cwd);
}

try {
  test('unborn ticket still checks an outside file after the first source commit', () => {
    const cwd = fresh('unborn-first-source'); start(cwd); const state = complete(cwd);
    const before = L.fingerprint(cwd, state);
    put(cwd, 'outside.js', 'exports.outside = true;\n');
    assert(L.check(cwd, id).errors.includes('Outside allowedFiles: outside.js'));
    git(cwd, 'add', 'outside.js'); commit(cwd, 'Synthetic first source commit');
    assert.strictEqual(L.status(cwd, id).baseCommit, null);
    assert(L.check(cwd, id).errors.includes('Outside allowedFiles: outside.js'), 'A first commit must not hide a file created after the ticket began');
    assert.notStrictEqual(L.fingerprint(cwd, state), before);
    assert.strictEqual(L.status(cwd, id).localDeliveryComplete, false);
  });

  test('metadata-only first commit preserves current autonomous delivery evidence', () => {
    const cwd = fresh('unborn-metadata'); start(cwd); const state = complete(cwd);
    const before = L.fingerprint(cwd, state);
    git(cwd, 'add', record); commit(cwd, 'Synthetic first metadata-only commit');
    assert.strictEqual(L.fingerprint(cwd, state), before);
    assert.strictEqual(L.status(cwd, id).localDeliveryComplete, true);
    assert.deepStrictEqual(L.check(cwd, id).errors, []);
  });

  test('registered pre-existing dirty submodule is preserved without false scope errors', () => {
    const fixture = registered('dirty-preserved', { dirty: true });
    assert.strictEqual(git(fixture.cwd, 'config', '--file', '.gitmodules', '--get', 'submodule.vendor.path'), 'vendor');
    assert.strictEqual(fs.readFileSync(path.join(fixture.nested, 'value.txt'), 'utf8'), 'Pre-existing dirty bytes\n');
    assert.deepStrictEqual(L.check(fixture.cwd, id).errors, []);
    assert.strictEqual(L.fingerprint(fixture.cwd, fixture.state), fixture.fingerprint);
  });

  test('later inner worktree edits invalidate preserved dirty submodule evidence', () => {
    const fixture = registered('dirty-inner-edit', { dirty: true });
    put(fixture.nested, 'value.txt', 'New out-of-scope nested bytes\n'); invalidated(fixture);
  });

  test('index-only inner submodule changes cannot hide behind unchanged worktree bytes', () => {
    const fixture = registered('dirty-inner-index', { dirty: true });
    git(fixture.nested, 'add', 'value.txt');
    assert.strictEqual(fs.readFileSync(path.join(fixture.nested, 'value.txt'), 'utf8'), 'Pre-existing dirty bytes\n');
    invalidated(fixture);
  });

  test('registered submodule HEAD checkout invalidates scope and verification', () => {
    const fixture = registered('inner-head-change');
    git(fixture.nested, 'checkout', '--detach', 'HEAD~1'); invalidated(fixture);
  });

  test('new untracked inner submodule files invalidate parent verification', () => {
    const fixture = registered('inner-untracked');
    put(fixture.nested, 'new.txt', 'New nested untracked bytes\n'); invalidated(fixture);
  });

  test('deinitializing a registered submodule never keeps a completed fingerprint', () => {
    const fixture = registered('inner-uninitialized');
    git(fixture.cwd, 'submodule', 'deinit', '-f', '--', 'vendor');
    // An explicit unavailable-submodule error is safe; stale successful evidence is not.
    const checked = operation => {
      try { return { value: operation() }; }
      catch (error) { assert.match(error.message, /submodule.*unavailable|uninitialized|initialize|restore/i); return { error }; }
    };
    const scope = checked(() => L.check(fixture.cwd, id));
    if (!scope.error) assert(scope.value.errors.includes('Outside allowedFiles: vendor'));
    const fingerprint = checked(() => L.fingerprint(fixture.cwd, fixture.state));
    if (!fingerprint.error) assert.notStrictEqual(fingerprint.value, fixture.fingerprint);
    const status = checked(() => L.status(fixture.cwd, id));
    if (!status.error) assert.strictEqual(status.value.localDeliveryComplete, false);
  });

  test('registered nested submodule content changes invalidate the outer gitlink', () => {
    const fixture = registered('recursive-inner', { nested: true });
    put(path.join(fixture.nested, 'inner'), 'leaf.txt', 'Modified recursive leaf\n'); invalidated(fixture);
  });

  test('planned staged submodule removal is a real deletion rather than an unavailable indexed module', () => {
    const fixture = registered('planned-module-removal'); permitSubmoduleRemoval(fixture);
    git(fixture.cwd, 'rm', '-f', '--', 'vendor'); git(fixture.cwd, 'add', '.gitmodules');
    assert.doesNotThrow(() => L.fingerprint(fixture.cwd, L.status(fixture.cwd, id)));
    const checked = L.check(fixture.cwd, id);
    assert(checked.files.includes('vendor'), JSON.stringify(checked));
    assert.deepStrictEqual(checked.errors, []);
  });

  test('planned gitlink replacement by a regular indexed file remains checkable', () => {
    const fixture = registered('planned-module-replacement'); permitSubmoduleRemoval(fixture);
    git(fixture.cwd, 'rm', '-f', '--', 'vendor');
    put(fixture.cwd, 'vendor', 'A deliberately planned regular replacement file\n');
    git(fixture.cwd, 'add', 'vendor', '.gitmodules');
    assert(git(fixture.cwd, 'ls-files', '--stage', '--', 'vendor').startsWith('100644 '));
    assert.doesNotThrow(() => L.fingerprint(fixture.cwd, L.status(fixture.cwd, id)));
    assert.deepStrictEqual(L.check(fixture.cwd, id).errors, []);
  });

  console.log(`${count - failed}/${count} company regression checks passed.`);
  if (failed) process.exitCode = 1;
} finally {
  const absolute = path.resolve(temporary);
  assert(absolute.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(absolute).startsWith(prefix), 'Unsafe disposable fixture cleanup');
  fs.rmSync(absolute, { recursive: true, force: true });
}
