// Integration tests use disposable repositories, never this checkout's index/hooks.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { copyKit } = require('../scripts/copy-kit');
let L;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-driven-ai-tests-'));
const cli = path.join(root, '.aidlc', 'tools', 'cli.js');
const command = 'node -e "process.exit(0)"';
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
const put = (file, content) => { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content); };
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const write = (file, value) => put(file, JSON.stringify(value, null, 2) + '\n');
const record = '.aidlc/specs/active/JIRA-1/';
let count = 0;
function test(name, fn) { fn(); count++; console.log(`ok ${count} - ${name}`); }
function advance() { return L.advance(root, 'JIRA-1', 'Test reviewer', 'Fixture-only explicit acknowledgement'); }
function fill(stage) {
  for (const file of L.STAGES[stage].outputs) {
    if (file !== 'plan.json') put(record + file, `# ${stage}\nFixture evidence for ${file}.\n`);
  }
}
function commit(message) { git(['-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', message]); }

try {
  git(['init']);
  copyKit(root);
  L = require(path.join(root, '.aidlc', 'tools', 'lifecycle.js'));
  test('portable copy needs no manifest and installs no hooks', () => {
    assert.deepStrictEqual(fs.readdirSync(root).sort(), ['.aidlc', '.git', 'AGENTS.md']);
    assert(!fs.existsSync(path.join(root, 'package.json')));
    assert(!fs.existsSync(path.join(root, '.git/hooks/pre-commit')));
    assert(fs.existsSync(path.join(root, '.aidlc/workflows/ai-dlc.md')));
    assert(fs.existsSync(path.join(root, '.aidlc/specs/templates/MANUAL_TRACKER.md')));
    assert.throws(() => copyKit(path.resolve(__dirname, '../kit/nested-copy')), /inside the source kit/);
  });
  test('copy preserves existing instructions, hooks, manifests and documents', () => {
    put('.git/hooks/pre-commit', '# custom hook\n');
    put('.aidlc/context/business/overview.md', '# Existing owner document\n');
    put('docs/business/overview.md', '# Existing project document\n');
    put('AGENTS.md', '# Existing agent instructions\n');
    put('package.json', '{"private":true}\n');
    const copied = copyKit(root);
    assert(copied.skipped.includes('AGENTS.md'));
    assert.strictEqual(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), '# Existing agent instructions\n');
    assert.strictEqual(fs.readFileSync(path.join(root, 'package.json'), 'utf8'), '{"private":true}\n');
    fs.unlinkSync(path.join(root, 'package.json'));
    assert.strictEqual(fs.readFileSync(path.join(root, '.git/hooks/pre-commit'), 'utf8'), '# custom hook\n');
    assert.strictEqual(fs.readFileSync(path.join(root, '.aidlc/context/business/overview.md'), 'utf8'), '# Existing owner document\n');
    assert.strictEqual(fs.readFileSync(path.join(root, 'docs/business/overview.md'), 'utf8'), '# Existing project document\n');
    assert(fs.existsSync(path.join(root, '.aidlc/docs/WORKFLOW.md')));
  });
  test('incomplete business context cannot be acknowledged', () => {
    assert.strictEqual(L.contextStatus(root).ready, false);
    assert.throws(() => L.approveContext(root, 'Owner', 'Fixture baseline'), /TODO/);
  });
  for (const file of L.CONTEXT_FILES) put(file, '# Fixture baseline\nConfirmed source for integration tests.\n');
  L.approveContext(root, 'Owner', 'Fixture baseline reviewed');
  git(['add', '.']); commit('baseline');
  L.createIntent(root, 'jira-1', 'express');
  test('safe IDs, profiles and duplicate records', () => {
    assert.throws(() => L.createIntent(root, '../escape'), /Ticket/);
    assert.throws(() => L.createIntent(root, 'JIRA-2', '__proto__'), /Unknown profile/);
    assert.throws(() => L.createIntent(root, 'JIRA-1'), /already exists/);
    assert.strictEqual(L.status(root, 'JIRA-1').currentStage, 'context');
  });
  test('checkpoint requires named attestation and completed artifacts', () => {
    assert.throws(() => L.advance(root, 'JIRA-1'), /--by/);
    advance();
    assert.throws(advance, /TODO/);
    fill('requirements'); advance();
  });
  const plan = { allowedFiles: ['src/coupon.js', 'tests/coupon.test.js', 'src/file with spaces.js', 'src/đơn.js'], testFiles: ['tests/coupon.test.js'], dependencyFiles: [], maxFiles: 4, verificationCommands: [command] };
  test('plan requires exact paths and runnable verification declarations', () => {
    fill('plan');
    assert.throws(advance, /allowedFiles/);
    write(record + 'plan.json', { ...plan, allowedFiles: ['../escape'] });
    assert.throws(advance, /relative paths/);
    write(record + 'plan.json', plan); advance();
  });
  put('src/coupon.js', 'module.exports = 1;\n');
  put('tests/coupon.test.js', '// meaningful fixture file scope\n');
  put('src/file with spaces.js', '// spaces\n');
  put('src/đơn.js', '// unicode\n');
  test('untracked directories, spaces and Unicode are expanded exactly', () => {
    assert.deepStrictEqual(L.check(root, 'JIRA-1').errors, []);
    const files = L.changedFiles(root);
    assert(files.includes('src/đơn.js'));
    assert(files.includes('src/file with spaces.js'));
  });
  test('scope, test, dependency and budget violations fail closed', () => {
    put('nested/__tests__/unauthorized.js', 'bad\n');
    put('package.json', '{}\n');
    const errors = L.check(root, 'JIRA-1').errors.join('\n');
    assert.match(errors, /Outside allowedFiles/);
    assert.match(errors, /Test change not declared/);
    assert.match(errors, /Dependency change not declared/);
    assert.match(errors, /maxFiles/);
    fs.unlinkSync(path.join(root, 'nested/__tests__/unauthorized.js'));
    fs.unlinkSync(path.join(root, 'package.json'));
    for (const extra of ['.aidlc/rules/unapproved.md', '.aidlc/specs/active/JIRA-OTHER/note.md', 'specs/project-context.json']) {
      put(extra, 'not current-ticket metadata\n');
      assert(L.check(root, 'JIRA-1').errors.includes(`Outside allowedFiles: ${extra}`));
      fs.unlinkSync(path.join(root, extra));
    }
  });
  test('approved output changes require reopening', () => {
    put(record + 'spec.md', '# Changed approved specification\n');
    assert.match(L.check(root, 'JIRA-1').errors.join('\n'), /reopen requirements/);
    L.reopen(root, 'JIRA-1', 'requirements', 'Reviewer', 'Fixture revised requirement');
    advance(); advance();
    assert.deepStrictEqual(L.check(root, 'JIRA-1').errors, []);
  });
  fill('tests'); advance();
  test('verification command must be explicitly supplied and in plan', () => {
    assert.throws(() => L.verify(root, 'JIRA-1'), /--command/);
    assert.throws(() => L.verify(root, 'JIRA-1', 'node -e "process.exit(7)"'), /not in/);
    assert.strictEqual(L.verify(root, 'JIRA-1', command), 0);
  });
  fill('implement'); advance();
  fill('verify');
  test('source edits invalidate prior successful verification', () => {
    put('src/coupon.js', 'module.exports = 2;\n');
    assert.throws(advance, /current verification/);
    assert.strictEqual(L.verify(root, 'JIRA-1', command), 0);
    advance();
  });
  fill('pr');
  test('commit invalidates evidence, but committed branch scope is still checked', () => {
    git(['add', '.']); commit('ticket change');
    assert.throws(advance, /current verification/);
    assert(L.check(root, 'JIRA-1').files.includes('src/coupon.js'));
    assert.strictEqual(L.verify(root, 'JIRA-1', command), 0);
    const beforeEvidenceCommit = L.fingerprint(root, L.status(root, 'JIRA-1'));
    put(record + 'notes.md', '# Ticket-only evidence\n');
    const receiptPath = '.aidlc/specs/project-context.json';
    put(receiptPath, fs.readFileSync(path.join(root, receiptPath), 'utf8') + '\n');
    assert.strictEqual(L.fingerprint(root, L.status(root, 'JIRA-1')), beforeEvidenceCommit);
    const otherRecord = '.aidlc/specs/active/JIRA-OTHER/note.md';
    put(otherRecord, 'another ticket\n');
    assert.notStrictEqual(L.fingerprint(root, L.status(root, 'JIRA-1')), beforeEvidenceCommit);
    fs.unlinkSync(path.join(root, otherRecord));
    git(['add', record, '.aidlc/specs/project-context.json']); commit('record verification evidence only');
    assert.strictEqual(L.fingerprint(root, L.status(root, 'JIRA-1')), beforeEvidenceCommit);
    advance();
    assert.strictEqual(L.status(root, 'JIRA-1').currentStage, 'complete');
  });
  test('staged changes cannot hide behind a worktree restored to HEAD', () => {
    const file = '.aidlc/context/business/overview.md';
    const original = fs.readFileSync(path.join(root, file), 'utf8');
    put(file, '# Unauthorized staged change\n'); git(['add', file]);
    put(file, original);
    assert(L.changedFiles(root).includes(file));
    assert.match(L.check(root, 'JIRA-1').errors.join('\n'), /Outside allowedFiles: \.aidlc\/context\/business\/overview.md/);
    git(['reset', 'HEAD', '--', file]);
  });
  test('rename checks both source and destination paths', () => {
    git(['mv', 'src/coupon.js', 'src/moved.js']);
    const files = L.changedFiles(root);
    assert(files.includes('src/coupon.js') && files.includes('src/moved.js'));
    assert.match(L.check(root, 'JIRA-1').errors.join('\n'), /Outside allowedFiles: src\/moved.js/);
    git(['mv', 'src/moved.js', 'src/coupon.js']);
  });
  test('changed baseline is stale even after a new acknowledgement', () => {
    put('.aidlc/context/business/rules.md', '# Revised fixture business rule\n');
    assert.strictEqual(L.contextStatus(root).ready, false);
    L.approveContext(root, 'Owner', 'New fixture context');
    assert.match(L.check(root, 'JIRA-1').errors.join('\n'), /reopen context/);
  });
  test('nonzero commands and commands mutating the tree cannot verify a checkpoint', () => {
    const failing = 'node -e "process.exit(7)"';
    const mutating = `node -e "require('fs').writeFileSync('src/coupon.js','changed during verification')"`;
    L.reopen(root, 'JIRA-1', 'context', 'Reviewer', 'Fixture command validation');
    write(record + 'plan.json', { ...plan, allowedFiles: [...plan.allowedFiles, '.aidlc/context/business/rules.md'], maxFiles: 5, verificationCommands: [failing, mutating] });
    while (L.status(root, 'JIRA-1').currentStage !== 'implement') advance();
    assert.strictEqual(L.verify(root, 'JIRA-1', failing), 7);
    assert.strictEqual(L.verify(root, 'JIRA-1', mutating), 1);
    const receipts = read(record + 'state.json').verifications;
    assert.strictEqual(receipts[1].changedDuringRun, true);
    assert(receipts.every(receipt => receipt.exitCode !== 0));
    for (const receipt of receipts) assert(fs.existsSync(path.join(root, record, receipt.log)));
  });
  test('ambiguous records never select the first ticket', () => {
    L.createIntent(root, 'JIRA-2', 'bugfix');
    assert.throws(() => L.status(root), /Specify a ticket/);
    assert.throws(() => L.check(root, '.aidlc/specs/active/SPEC-OLD.md'), /Ticket/);
    const feature = L.createIntent(root, 'JIRA-3', 'feature');
    assert(feature.route.includes('framing') && feature.route.includes('deploy') && feature.route.includes('feedback'));
    const refactor = L.createIntent(root, 'JIRA-4', 'refactor');
    assert(!refactor.route.includes('framing') && refactor.route.includes('discovery'));
  });
  test('CLI errors exit nonzero and help is available', () => {
    assert.strictEqual(spawnSync(process.execPath, [cli, 'help'], { cwd: root }).status, 0);
    assert.strictEqual(spawnSync(process.execPath, [cli, 'nonsense'], { cwd: root }).status, 1);
    assert.strictEqual(spawnSync(process.execPath, [cli, 'new', 'JIRA-9', '--profile'], { cwd: root }).status, 1);
  });
  console.log(`Passed ${count} integration checks in a disposable repository.`);
} finally {
  // Explicit absolute containment check before recursive cleanup on Windows.
  const temporary = path.resolve(os.tmpdir());
  const resolved = path.resolve(root);
  if (!resolved.startsWith(temporary + path.sep) || !path.basename(resolved).startsWith('spec-driven-ai-tests-')) throw new Error('Unsafe test cleanup target');
  fs.rmSync(resolved, { recursive: true, force: true });
}
