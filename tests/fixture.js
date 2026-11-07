const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const lifecycle = require(path.join(root, '.aidlc/tools/lifecycle.js'));
const { copyKit } = require(path.join(root, 'scripts/copy-kit.js'));
const id = 'FIX-1';
const command = 'node fixture-check.cjs';
function run(program, args, cwd, extra = {}) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', windowsHide: true, ...extra });
  if (result.error) throw result.error;
  return result;
}
function success(result) {
  assert.strictEqual(result.status, 0, (result.stdout || '') + (result.stderr || ''));
  return result;
}
function git(cwd, ...args) { return success(run('git', args, cwd)); }
function put(cwd, relative, text) {
  const file = path.join(cwd, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
}
function copyTree(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const item of fs.readdirSync(source, { withFileTypes: true })) {
    assert(!fs.lstatSync(path.join(source, item.name)).isSymbolicLink(), 'Fixture copy refuses symlinks');
    if (item.isDirectory()) copyTree(path.join(source, item.name), path.join(target, item.name));
    else fs.copyFileSync(path.join(source, item.name), path.join(target, item.name));
  }
}
function temporary(prefix) { return fs.mkdtempSync(path.join(os.tmpdir(), prefix)); }
function cleanup(directory, prefix) {
  const absolute = path.resolve(directory);
  if (!absolute.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(absolute).startsWith(prefix)) throw new Error('Unsafe fixture cleanup target');
  fs.rmSync(absolute, { recursive: true, force: true });
}
function fill(cwd, stage) {
  for (const file of lifecycle.STAGES[stage].outputs) {
    if (file !== 'plan.json') put(cwd, `.aidlc/specs/active/${id}/${file}`, `# Fixture ${stage}\nEvidence only for this disposable test.\n`);
  }
}
function advance(cwd) { return lifecycle.advance(cwd, id, 'Fixture reviewer', 'Explicit synthetic decision in a disposable test'); }
function seed(cwd) {
  copyKit(cwd);
  git(cwd, 'init');
  for (const file of lifecycle.CONTEXT_FILES) put(cwd, file, '# Fixture baseline\nSynthetic confirmed context for integration testing.\n');
  put(cwd, 'fixture-check.cjs', `if(process.env.SPEC_DRIVEN_AI_TEST_REOPEN==='1'){const L=require('./.aidlc/tools/lifecycle.js');console.log('During command:',L.reopen(process.cwd(),'${id}','plan','Fixture reviewer','Synthetic reopen while verification runs').currentStage);}else{console.log('Fixture check passed');}\n`);
  git(cwd, 'add', '.');
  git(cwd, '-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'Disposable baseline');
  lifecycle.approveContext(cwd, 'Fixture owner', 'Synthetic baseline decision for this test only');
  lifecycle.createIntent(cwd, id, 'express');
  advance(cwd);
  fill(cwd, 'requirements'); advance(cwd);
  fill(cwd, 'plan');
  put(cwd, `.aidlc/specs/active/${id}/plan.json`, JSON.stringify({ allowedFiles: ['src/example.js'], testFiles: [], dependencyFiles: [], maxFiles: 1, verificationCommands: [command] }, null, 2) + '\n');
  advance(cwd);
  fill(cwd, 'tests'); advance(cwd);
  assert.strictEqual(lifecycle.status(cwd, id).currentStage, 'implement');
}
function readyForVerify(cwd) {
  assert.strictEqual(lifecycle.verify(cwd, id, command), 0);
  fill(cwd, 'implement'); advance(cwd);
  fill(cwd, 'verify');
}
module.exports = { fs, path, assert, root, lifecycle, copyKit, id, command, run, success, git, put, copyTree, temporary, cleanup, fill, advance, seed, readyForVerify };
