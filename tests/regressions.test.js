// Bug regressions run in disposable repositories, never the maintainer checkout.
const F = require('./fixture');
const { fs, path, assert, lifecycle: L, id, command } = F;
const temp = F.temporary('aidlc-fix-regressions-');
let count = 0, failed = 0;
function test(name, fn) {
  count++;
  try { fn(); console.log(`ok ${count} - ${name}`); }
  catch (error) { failed++; console.error(`not ok ${count} - ${name}\n${error.stack}`); }
}
try {
  const base = path.join(temp, 'base');
  F.seed(base);
  function fixture(name) { const cwd = path.join(temp, name); F.copyTree(base, cwd); return cwd; }
  test('ESM host keeps its manifest and runs the copied CommonJS CLI', () => {
    const cwd = path.join(temp, 'esm-project');
    F.copyKit(cwd); F.git(cwd, 'init');
    const manifest = JSON.stringify({ private: true, type: 'module' });
    F.put(cwd, 'package.json', manifest);
    const cli = path.join(cwd, '.aidlc/tools/cli.js');
    assert(F.success(F.run(process.execPath, [cli, 'help'], cwd)).stdout.includes('AI-DLC local helper'));
    F.success(F.run(process.execPath, [cli, 'new', 'ESM-1', '--profile', 'express'], cwd));
    assert.strictEqual(JSON.parse(F.success(F.run(process.execPath, [cli, 'status', 'ESM-1'], cwd)).stdout).currentStage, 'context');
    assert.strictEqual(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'), manifest);
  });
  test('new rejects a nested cwd and a non-Git cwd before creating records', () => {
    const nested = path.join(fixture('nested-project'), 'src'); fs.mkdirSync(nested);
    const outside = path.join(temp, 'non-git'); fs.mkdirSync(outside);
    const cli = path.join(base, '.aidlc/tools/cli.js');
    for (const cwd of [nested, outside]) {
      const result = F.run(process.execPath, [cli, 'new', 'WRONG-ROOT'], cwd);
      assert.notStrictEqual(result.status, 0);
      assert.match(result.stderr, /repository root|Git repository/);
      assert(!fs.existsSync(path.join(cwd, '.aidlc')), 'No files may be created on a rejected cwd');
    }
  });
  test('context acknowledgement rejects a non-Git cwd before writing a receipt', () => {
    const cwd = path.join(temp, 'non-git-context'); F.copyKit(cwd);
    for (const file of L.CONTEXT_FILES) F.put(cwd, file, '# Fixture context\nSynthetic baseline.\n');
    assert.throws(() => L.approveContext(cwd, 'Fixture owner', 'Synthetic decision'), /Git repository/);
    assert(!fs.existsSync(path.join(cwd, '.aidlc/specs/project-context.json')));
  });
  test('reopen during verify survives and invalidates that verification result', () => {
    const cwd = fixture('reopen');
    const previous = process.env.SPEC_DRIVEN_AI_TEST_REOPEN;
    let result;
    try { process.env.SPEC_DRIVEN_AI_TEST_REOPEN = '1'; result = L.verify(cwd, id, command); }
    finally {
      if (previous === undefined) delete process.env.SPEC_DRIVEN_AI_TEST_REOPEN;
      else process.env.SPEC_DRIVEN_AI_TEST_REOPEN = previous;
    }
    assert.notStrictEqual(result, 0);
    const state = L.status(cwd, id);
    assert.strictEqual(state.currentStage, 'plan');
    assert(state.history.some(item => item.event === 'reopen'));
    assert.strictEqual(state.verifications.length, 0);
    // The reviewer can complete the reopened stages and verify normally again.
    F.advance(cwd); F.advance(cwd);
    assert.strictEqual(L.verify(cwd, id, command), 0);
  });
  test('deleted verification logs cannot satisfy a checkpoint', () => {
    const cwd = fixture('deleted-log'); F.readyForVerify(cwd);
    for (const receipt of L.status(cwd, id).verifications) fs.unlinkSync(path.join(cwd, `.aidlc/specs/active/${id}`, receipt.log));
    assert.throws(() => F.advance(cwd), /current verification/);
    assert.strictEqual(L.status(cwd, id).currentStage, 'verify');
  });
  test('modified verification logs cannot satisfy a checkpoint', () => {
    const cwd = fixture('modified-log'); F.readyForVerify(cwd);
    const receipt = L.status(cwd, id).verifications[0];
    F.put(cwd, `.aidlc/specs/active/${id}/${receipt.log}`, 'Changed evidence\n');
    assert.throws(() => F.advance(cwd), /current verification/);
    assert.strictEqual(L.status(cwd, id).currentStage, 'verify');
  });
  test('intact verification logs still permit the verify and PR checkpoints', () => {
    const cwd = fixture('intact-log'); F.readyForVerify(cwd);
    assert.strictEqual(F.advance(cwd).currentStage, 'pr');
    F.fill(cwd, 'pr');
    assert.strictEqual(F.advance(cwd).currentStage, 'complete');
  });
  test('failed atomic state replacement preserves state and releases its lock', () => {
    const cwd = fixture('atomic-write');
    const statePath = path.join(cwd, `.aidlc/specs/active/${id}/state.json`);
    const before = fs.readFileSync(statePath, 'utf8');
    const rename = fs.renameSync;
    try {
      fs.renameSync = (from, to) => { if (to === statePath) throw new Error('Fixture replacement failed'); return rename(from, to); };
      assert.throws(() => L.reopen(cwd, id, 'plan', 'Fixture reviewer', 'Synthetic reopen'), /Fixture replacement failed/);
    } finally { fs.renameSync = rename; }
    assert.strictEqual(fs.readFileSync(statePath, 'utf8'), before);
    const entries = fs.readdirSync(path.dirname(statePath));
    assert(!entries.includes('.state.lock'));
    assert(!entries.some(name => name.endsWith('.tmp')));
    assert.strictEqual(L.reopen(cwd, id, 'plan', 'Fixture reviewer', 'Retry after fixture failure').currentStage, 'plan');
  });
  test('a busy ticket never overwrites state or deletes another writer lock', () => {
    const cwd = fixture('busy-ticket');
    const directory = path.join(cwd, `.aidlc/specs/active/${id}`);
    const before = fs.readFileSync(path.join(directory, 'state.json'), 'utf8');
    const lock = path.join(directory, '.state.lock');
    fs.writeFileSync(lock, 'Fixture writer\n', { encoding: 'utf8', flag: 'wx' });
    try {
      assert.throws(() => L.reopen(cwd, id, 'plan', 'Fixture reviewer', 'Synthetic reopen'), /busy/);
      assert.strictEqual(fs.readFileSync(path.join(directory, 'state.json'), 'utf8'), before);
      assert(fs.existsSync(lock));
    } finally { fs.unlinkSync(lock); }
  });
  console.log(`${count - failed}/${count} regression checks passed.`);
  if (failed) process.exitCode = 1;
} finally { F.cleanup(temp, 'aidlc-fix-regressions-'); }
