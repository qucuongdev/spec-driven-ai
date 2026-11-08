// Adversarial regressions use disposable repositories and synthetic legacy records only.
const F = require('./fixture');
const { fs, path, assert, lifecycle: L, id, command } = F;
const crypto = require('crypto');
const vm = require('vm');
const prefix = 'aidlc-review-fixes-';
const temporary = F.temporary(prefix);
const argv = process.argv.slice(2);
if (argv.length && (argv.length !== 2 || argv[0] !== '--case' || !argv[1].trim())) throw new Error('Usage: node tests/review-fixes.test.js [--case <name substring>]');
const selected = argv[1];
let count = 0, failed = 0;
function test(name, operation) {
  if (selected && !name.includes(selected)) return;
  count++;
  try { operation(); console.log(`ok ${count} - ${name}`); }
  catch (error) { failed++; console.error(`not ok ${count} - ${name}\n${error.stack}`); }
}
function bare(name) { const cwd = path.join(temporary, name); fs.mkdirSync(cwd, { recursive: true }); return cwd; }
function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function commit(cwd) { F.git(cwd, 'add', '.'); F.git(cwd, '-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Synthetic adversarial baseline'); }
function tree(directory) {
  const entries = [];
  function walk(current) {
    for (const name of fs.readdirSync(current).sort()) {
      const file = path.join(current, name), stat = fs.lstatSync(file);
      if (stat.isDirectory()) walk(file);
      else entries.push([path.relative(directory, file), stat.isSymbolicLink() ? fs.readlinkSync(file) : sha(file)]);
    }
  }
  walk(directory); return entries;
}
function withFailure(operation) {
  const previous = process.env.AIDLC_REVIEW_TEST_FAIL;
  try { process.env.AIDLC_REVIEW_TEST_FAIL = '1'; return operation(); }
  finally { if (previous === undefined) delete process.env.AIDLC_REVIEW_TEST_FAIL; else process.env.AIDLC_REVIEW_TEST_FAIL = previous; }
}
let verifyBaseline;
function verificationFixture(name) {
  if (!verifyBaseline) {
    verifyBaseline = bare('verification-baseline'); F.copyKit(verifyBaseline); F.git(verifyBaseline, 'init');
    for (const file of L.CONTEXT_FILES) F.put(verifyBaseline, file, '# Synthetic confirmed context\nObserved disposable repository evidence.\n');
    F.put(verifyBaseline, 'fixture-check.cjs', "require('fs').writeFileSync('.git/review-command-ran','executed','utf8');require('assert').notStrictEqual(process.env.AIDLC_REVIEW_TEST_FAIL,'1','Synthetic external service is unhealthy');console.log('Synthetic behavior passed');\n");
    commit(verifyBaseline);
    L.approveContext(verifyBaseline, 'Synthetic reviewer', 'Confirmed only for disposable tests');
    L.createIntent(verifyBaseline, id, 'express'); F.advance(verifyBaseline);
    F.fill(verifyBaseline, 'requirements'); F.advance(verifyBaseline);
    F.fill(verifyBaseline, 'plan');
    F.put(verifyBaseline, `.aidlc/specs/active/${id}/plan.json`, JSON.stringify({ allowedFiles: ['src/example.js'], testFiles: [], dependencyFiles: [], maxFiles: 1, verificationCommands: [command] }));
    F.advance(verifyBaseline); F.fill(verifyBaseline, 'tests'); F.advance(verifyBaseline);
    assert.strictEqual(L.verify(verifyBaseline, id, command), 0);
    F.fill(verifyBaseline, 'implement'); F.advance(verifyBaseline); F.fill(verifyBaseline, 'verify');
    assert.strictEqual(L.verify(verifyBaseline, id, command), 0);
  }
  const cwd = bare(name); F.copyTree(verifyBaseline, cwd); return cwd;
}
function rejectCheckpoint(cwd) {
  assert.throws(() => F.advance(cwd), /verification|successful|current|pending|evidence/i, 'A newer failed, unknown or damaged result must supersede an older green result');
}
let gitBaseline;
function gitFixture(name) {
  if (!gitBaseline) {
    gitBaseline = bare('git-baseline'); F.git(gitBaseline, 'init'); F.git(gitBaseline, 'config', 'core.autocrlf', 'input');
    F.put(gitBaseline, 'clean.txt', 'Unchanged text\r\n');
    F.put(gitBaseline, 'tên có dấu.txt', 'Unicode and spaces\r\n');
    F.put(gitBaseline, 'mode.txt', 'Executable metadata coverage\n');
    fs.writeFileSync(path.join(gitBaseline, 'binary.bin'), Buffer.from([0, 255, 0, 1, 2, 3]));
    commit(gitBaseline);
  }
  const cwd = bare(name); F.copyTree(gitBaseline, cwd); return cwd;
}
function flaggedChange(flag, name) {
  const cwd = gitFixture(name); F.git(cwd, 'update-index', flag, 'clean.txt'); F.put(cwd, 'clean.txt', 'Changed outside the approved plan\n');
  let paths;
  try { paths = L.changedFiles(cwd); }
  catch (error) { assert.match(error.message, /assume.unchanged|skip.worktree|index flag|sparse/i); return; }
  assert(paths.includes('clean.txt'), `Git ${flag} must not hide changed source: ${JSON.stringify(paths)}`);
}
function linkedDirectory(link, outside) { fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir'); }
function refused(operation) { assert.throws(operation, /symlink|junction|linked|metadata|ancestor|unsafe|outside/i); }
function linkedFixture(name, relative) {
  const cwd = bare(name); F.copyKit(cwd); F.git(cwd, 'init');
  for (const file of L.CONTEXT_FILES) F.put(cwd, file, '# Synthetic context\nObserved only in this test.\n');
  const outside = bare(name + '-outside'); F.put(outside, 'sentinel.txt', 'Unrelated bytes must remain unchanged\n');
  const link = path.join(cwd, relative); fs.renameSync(link, link + '-saved'); linkedDirectory(link, outside);
  return { cwd, outside, link };
}
let maintenanceBaseline;
function maintenanceFixture(name) {
  if (!maintenanceBaseline) {
    maintenanceBaseline = bare('maintenance-baseline');
    for (const directory of ['kit', '.aidlc']) F.copyTree(path.join(F.root, directory), path.join(maintenanceBaseline, directory));
    fs.mkdirSync(path.join(maintenanceBaseline, 'scripts'));
    for (const file of ['AGENTS.md', 'package.json', 'scripts/check-kit.js']) fs.copyFileSync(path.join(F.root, file), path.join(maintenanceBaseline, file));
  }
  const cwd = bare(name); F.copyTree(maintenanceBaseline, cwd); return cwd;
}
function parseDocumentedCommand(text) {
  const prefix = 'node .aidlc/tools/cli.js ';
  assert(text.startsWith(prefix), `Runnable helper snippets need their full invocation: ${text}`);
  const words = [];
  for (const match of text.slice(prefix.length).matchAll(/"([^"]*)"|'([^']*)'|([^\s]+)/g)) words.push(match[1] === undefined ? match[2] === undefined ? match[3] : match[2] : match[1]);
  const errors = [];
  const backend = new Proxy({}, { get: (_, key) => key === 'check' ? () => ({ files: [], errors: [] }) : key === 'status' ? () => ({ id: 'TICKET', route: ['context', 'plan', 'tests', 'implement', 'verify', 'pr'], current: 0, localDeliveryComplete: false }) : key === 'contextStatus' ? () => ({ ready: true }) : key === 'verify' ? () => 0 : key === 'createIntent' ? () => ({ id: 'TICKET', profile: 'express', mode: 'autonomous' }) : () => ({}) });
  const fakeProcess = { argv: ['node', 'cli.js', ...words], cwd: () => temporary, exitCode: 0 };
  const file = path.join(F.root, '.aidlc/tools/cli.js');
  const source = fs.readFileSync(file, 'utf8');
  vm.runInNewContext(source, { __dirname: path.dirname(file), process: fakeProcess, console: { log() {}, error(message) { errors.push(String(message)); } }, require: name => name === './lifecycle' ? backend : name === './policy' ? { load: () => ({}), doctor: () => ({ checks: [], warnings: [] }) } : require(name) }, { filename: file, timeout: 1000 });
  assert.strictEqual(fakeProcess.exitCode, 0, `Documented command rejected by actual CLI parser: ${text}\n${errors.join('\n')}`);
  if (['advance', 'progress', 'reopen', 'revise'].includes(words[0]) || words[0] === 'context' && (words.includes('--by') || words.includes('--agent'))) assert(words.includes('--note') && words[words.indexOf('--note') + 1], `A real checkpoint requires --note: ${text}`);
  if (['advance', 'reopen'].includes(words[0])) assert(words.includes('--by'), text);
  if (['progress', 'revise'].includes(words[0])) assert(words.includes('--agent'), text);
}

try {
  test('latest failed verification blocks verify and PR gates until a genuine new pass', () => {
    const cwd = verificationFixture('latest-failure');
    assert.notStrictEqual(withFailure(() => L.verify(cwd, id, command)), 0);
    rejectCheckpoint(cwd); assert.strictEqual(L.status(cwd, id).currentStage, 'verify');
    assert.strictEqual(L.verify(cwd, id, command), 0); assert.strictEqual(F.advance(cwd).currentStage, 'pr'); F.fill(cwd, 'pr');
    assert.notStrictEqual(withFailure(() => L.verify(cwd, id, command)), 0);
    rejectCheckpoint(cwd); assert.strictEqual(L.status(cwd, id).localDeliveryComplete, false);
    assert.strictEqual(L.verify(cwd, id, command), 0); assert.strictEqual(F.advance(cwd).localDeliveryComplete, true);
  });
  test('legacy completed record with a real newer failed receipt is not complete', () => {
    const candidate = verificationFixture('completed-legacy'); F.advance(candidate); F.fill(candidate, 'pr'); F.advance(candidate);
    assert.strictEqual(L.status(candidate, id).localDeliveryComplete, true);
    const failedRun = verificationFixture('legacy-failed-run'); assert.notStrictEqual(withFailure(() => L.verify(failedRun, id, command)), 0);
    const failure = L.status(failedRun, id).verifications.slice(-1)[0];
    const file = `.aidlc/specs/active/${id}/state.json`;
    // Import a real terminal receipt into a historical completed snapshot, as an
    // old helper could persist. Production records are never hand-edited.
    const state = JSON.parse(fs.readFileSync(path.join(candidate, file), 'utf8'));
    assert.strictEqual(failure.fingerprint, L.fingerprint(candidate, state), 'Imported real failure must cover the identical source candidate');
    fs.copyFileSync(path.join(failedRun, `.aidlc/specs/active/${id}`, failure.log), path.join(candidate, `.aidlc/specs/active/${id}`, failure.log));
    state.verifications.push(failure); F.put(candidate, file, JSON.stringify(state));
    assert.strictEqual(L.status(candidate, id).localDeliveryComplete, false);
  });
  for (const damage of ['missing', 'tampered']) test(`latest ${damage} verification log cannot fall back to an older intact pass`, () => {
    const cwd = verificationFixture('log-' + damage), receipt = L.status(cwd, id).verifications.slice(-1)[0];
    const file = path.join(cwd, `.aidlc/specs/active/${id}`, receipt.log);
    if (damage === 'missing') fs.unlinkSync(file); else fs.appendFileSync(file, 'Changed evidence\n', 'utf8');
    rejectCheckpoint(cwd);
    assert.strictEqual(L.verify(cwd, id, command), 0); assert.strictEqual(F.advance(cwd).currentStage, 'pr');
  });
  test('failed new log write cannot leave an older green verification usable', () => {
    const cwd = verificationFixture('failed-log-write'), original = fs.writeFileSync;
    const marker = path.join(cwd, '.git/review-command-ran'); fs.unlinkSync(marker);
    let blocked = false;
    try {
      fs.writeFileSync = (file, ...args) => {
        if (typeof file === 'string' && path.dirname(file) === path.join(cwd, `.aidlc/specs/active/${id}/logs`) && /^verify-/.test(path.basename(file)) && fs.existsSync(marker)) { blocked = true; throw new Error('Synthetic new evidence write failure'); }
        return original(file, ...args);
      };
      try { assert.notStrictEqual(withFailure(() => L.verify(cwd, id, command)), 0); } catch (error) { assert.match(error.message, /evidence write failure/); }
    } finally { fs.writeFileSync = original; }
    assert(blocked, 'The disposable fixture must actually fail the new log write'); assert(fs.existsSync(marker), 'The new command really ran before evidence write failed'); rejectCheckpoint(cwd);
  });
  test('failed final record write cannot leave an older green verification usable', () => {
    const cwd = verificationFixture('failed-record-write'), original = fs.renameSync;
    const marker = path.join(cwd, '.git/review-command-ran'); fs.unlinkSync(marker);
    const stateFile = path.join(cwd, `.aidlc/specs/active/${id}/state.json`); let blocked = false;
    try {
      fs.renameSync = (from, to) => {
        // Fail only after the actual command created its ignored marker. This
        // allows any pre-command reservation without assuming its JSON shape.
        if (to === stateFile && fs.existsSync(marker)) { blocked = true; throw new Error('Synthetic final evidence record failure'); }
        return original(from, to);
      };
      assert.notStrictEqual(withFailure(() => L.verify(cwd, id, command)), 0);
    } finally { fs.renameSync = original; }
    assert(blocked, 'The disposable fixture must actually reject the terminal result write'); assert(fs.existsSync(marker), 'The new command really ran before final recording failed'); rejectCheckpoint(cwd);
  });
  test('assume-unchanged cannot hide changed tracked source', () => flaggedChange('--assume-unchanged', 'assumed-source'));
  test('skip-worktree cannot hide changed tracked source', () => flaggedChange('--skip-worktree', 'skipped-source'));
  test('normal sparse checkout is handled or rejected with an explicit sparse-index diagnosis', () => {
    const cwd = bare('sparse'); F.git(cwd, 'init'); F.put(cwd, 'visible/keep.txt', 'Visible\n'); F.put(cwd, 'hidden/skip.txt', 'Hidden\n'); commit(cwd);
    F.git(cwd, 'sparse-checkout', 'init', '--cone'); F.git(cwd, 'sparse-checkout', 'set', 'visible'); F.put(cwd, 'visible/keep.txt', 'Changed visible bytes\n');
    let paths;
    try { paths = L.changedFiles(cwd); } catch (error) { assert.match(error.message, /skip.worktree|sparse|index flag/i); return; }
    assert.deepStrictEqual(paths, ['visible/keep.txt']);
  });
  test('clean stale-stat text binary and Unicode files stay clean without raw index writes', () => {
    const cwd = gitFixture('read-only-clean');
    for (const name of ['clean.txt', 'binary.bin', 'tên có dấu.txt', 'mode.txt']) fs.utimesSync(path.join(cwd, name), new Date(2000, 0, 1), new Date(2000, 0, 1));
    const before = fs.readFileSync(path.join(cwd, '.git/index'));
    assert.deepStrictEqual(L.changedFiles(cwd), []);
    assert(fs.readFileSync(path.join(cwd, '.git/index')).equals(before), 'A read-only diff must not refresh Git stat cache');
  });
  test('read-only scope still detects modified binary Unicode deletion and staged mode changes', () => {
    const cwd = gitFixture('read-only-dirty');
    fs.writeFileSync(path.join(cwd, 'binary.bin'), Buffer.from([0, 255, 0, 7, 8, 9]));
    F.put(cwd, 'tên có dấu.txt', 'Changed Unicode bytes\n'); fs.unlinkSync(path.join(cwd, 'clean.txt'));
    F.git(cwd, 'update-index', '--chmod=+x', 'mode.txt');
    const before = fs.readFileSync(path.join(cwd, '.git/index'));
    assert.deepStrictEqual(L.changedFiles(cwd), ['binary.bin', 'clean.txt', 'mode.txt', 'tên có dấu.txt'].sort());
    assert(fs.readFileSync(path.join(cwd, '.git/index')).equals(before));
  });
  test('new ticket refuses a junction in active records without outside writes', () => {
    const f = linkedFixture('linked-active', '.aidlc/specs/active');
    // An empty external directory is the original escape: a dirty-file scan
    // cannot accidentally discover a child and reject its linked ancestor.
    fs.unlinkSync(path.join(f.outside, 'sentinel.txt')); const before = tree(f.outside);
    try { refused(() => L.createIntent(f.cwd, 'LINK-1', 'express')); assert.deepStrictEqual(tree(f.outside), before); }
    finally { fs.unlinkSync(f.link); }
  });
  test('context refuses a junction in specs without changing outside receipts or locks', () => {
    const f = linkedFixture('linked-specs', '.aidlc/specs'); F.put(f.outside, 'project-context.json', '{"unrelated":true}\n'); const before = tree(f.outside);
    try { refused(() => L.observeContext(f.cwd, 'Synthetic coordinator', 'No external metadata writes permitted')); assert.deepStrictEqual(tree(f.outside), before); }
    finally { fs.unlinkSync(f.link); }
  });
  test('verification refuses a logs junction without writing outside evidence', () => {
    const cwd = verificationFixture('linked-logs'), outside = bare('linked-logs-outside'); F.put(outside, 'sentinel.txt', 'Outside bytes\n');
    const logs = path.join(cwd, `.aidlc/specs/active/${id}/logs`); fs.renameSync(logs, logs + '-saved'); linkedDirectory(logs, outside); const before = tree(outside);
    try {
      let result;
      try { result = L.verify(cwd, id, command); } catch (error) { assert.match(error.message, /symlink|junction|linked|metadata|ancestor|unsafe|outside/i); result = 1; }
      assert.notStrictEqual(result, 0); assert.deepStrictEqual(tree(outside), before);
    } finally { fs.unlinkSync(logs); }
  });
  test('existing selected-ticket junction is rejected by readers and mutators', () => {
    const cwd = verificationFixture('linked-ticket'), outside = bare('linked-ticket-outside');
    const record = path.join(cwd, `.aidlc/specs/active/${id}`); F.copyTree(record, outside); fs.renameSync(record, record + '-saved'); linkedDirectory(record, outside);
    const before = tree(outside);
    try {
      refused(() => L.status(cwd, id));
      refused(() => L.reopen(cwd, id, 'plan', 'Synthetic reviewer', 'Must not mutate an external record'));
      assert.deepStrictEqual(tree(outside), before);
    } finally { fs.unlinkSync(record); }
  });
  test('state identity cannot redirect reopening to another ticket', () => {
    const cwd = verificationFixture('record-identity'), source = `.aidlc/specs/active/${id}`;
    const other = '.aidlc/specs/active/OTHER'; F.copyTree(path.join(cwd, source), path.join(cwd, other));
    const state = JSON.parse(fs.readFileSync(path.join(cwd, source, 'state.json'), 'utf8')); state.id = 'OTHER';
    F.put(cwd, other + '/state.json', JSON.stringify(state)); F.put(cwd, source + '/state.json', JSON.stringify(state));
    const before = tree(path.join(cwd, other));
    assert.throws(() => L.reopen(cwd, id, 'plan', 'Synthetic reviewer', 'A selected record must retain its own ticket identity'), /identity|ticket|state|mismatch/i);
    assert.deepStrictEqual(tree(path.join(cwd, other)), before, 'Another ticket must not be touched by a mismatched selected record');
  });
  test('maintenance check preserves unrelated agent skills', () => {
    const cwd = maintenanceFixture('agent-skills'); F.put(cwd, '.agents/skills/company/SKILL.md', '# Existing company skill\n'); const before = tree(path.join(cwd, '.agents'));
    F.success(F.run(process.execPath, ['scripts/check-kit.js'], cwd)); assert.deepStrictEqual(tree(path.join(cwd, '.agents')), before);
  });
  test('maintenance check still rejects known legacy agent rules payload', () => {
    const cwd = maintenanceFixture('legacy-rules'); F.put(cwd, '.agents/rules/legacy.md', '# Old payload\n');
    const result = F.run(process.execPath, ['scripts/check-kit.js'], cwd); assert.notStrictEqual(result.status, 0); assert.match(result.stderr, /legacy|payload/i);
  });
  test('visualization and generator runnable commands satisfy the real CLI parser', () => {
    for (const relative of ['workflow-visualization.html', 'scripts/build-full-viz.js']) {
      const source = fs.readFileSync(path.join(F.root, relative), 'utf8'), commands = [];
      for (const match of source.matchAll(/\bcmd(?:Auto|Rev)\s*:\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/g)) {
        const text = vm.runInNewContext('(' + match[1] + ')', {}, { timeout: 1000 });
        if (/^node\s+\.aidlc\/tools\/cli\.js\s+|^(?:new|context|status|advance|progress|reopen|revise|verify|check|archive)\b/.test(text)) commands.push(text);
      }
      assert(commands.length >= 8, `Keep actual runnable examples in ${relative}`);
      for (const text of new Set(commands)) parseDocumentedCommand(text);
    }
  });
  if (!count) throw new Error(`No test matched --case ${selected}`);
  console.log(`${count - failed}/${count} review regression checks passed.${selected ? ' Filter: ' + selected : ''}`);
  if (failed) process.exitCode = 1;
} finally { F.cleanup(temporary, prefix); }
