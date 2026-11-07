const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const kit = path.join(root, 'kit');
function compare(a, b) {
  assert(fs.existsSync(b) && fs.lstatSync(b).isDirectory() && !fs.lstatSync(b).isSymbolicLink(), `Missing or linked mirror: ${b}`);
  assert.deepStrictEqual(fs.readdirSync(a).sort(), fs.readdirSync(b).sort(), `Mirror entries mismatch: ${b}`);
  for (const entry of fs.readdirSync(a, { withFileTypes: true })) {
    const source = path.join(a, entry.name), target = path.join(b, entry.name);
    assert(!fs.lstatSync(target).isSymbolicLink(), `Symlink in mirror: ${target}`);
    if (entry.isDirectory()) compare(source, target);
    else assert(fs.lstatSync(target).isFile() && fs.readFileSync(source).equals(fs.readFileSync(target)), `Mirror mismatch: ${target}`);
  }
}
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    assert(!fs.lstatSync(file).isSymbolicLink(), `Symlink in kit: ${file}`);
    const moduleBoundary = path.relative(kit, file).split(path.sep).join('/') === '.aidlc/tools/package.json';
    assert(moduleBoundary || !['node_modules', '.git', 'package.json', 'package-lock.json'].includes(entry.name), `Nonportable dependency: ${file}`);
    if (moduleBoundary) assert.deepStrictEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { private: true, type: 'commonjs' }, 'Helper manifest must only isolate CommonJS, without dependencies or scripts');
    if (entry.isDirectory()) scan(file);
    else if (/\.(md|js|sh)$/.test(entry.name)) {
      const text = fs.readFileSync(file, 'utf8');
      assert(!/npx\s+spec-driven-ai|npx\s+--no-install\s+spec-driven-ai|bin\/cli\.js|src\/lifecycle\.js/.test(text), `Old package entry point: ${file}`);
    }
  }
}
assert.deepStrictEqual(fs.readdirSync(kit).sort(), ['.aidlc', 'AGENTS.md'], 'Kit must expose only AGENTS.md and .aidlc/');
scan(kit);
assert.deepStrictEqual(fs.readdirSync(path.join(kit, '.aidlc')).sort(), ['context', 'docs', 'rules', 'specs', 'tools', 'workflows']);
for (const name of [
  '.aidlc/rules/01-system-boundaries.md', '.aidlc/rules/02-adversarial-testing.md',
  '.aidlc/workflows/ai-dlc.md', '.aidlc/workflows/bootstrap-project-context.md',
  '.aidlc/context/business/overview.md', '.aidlc/context/business/glossary.md',
  '.aidlc/context/business/rules.md', '.aidlc/context/architecture/system.md',
  '.aidlc/docs/WORKFLOW.md', '.aidlc/docs/USER_GUIDE.md', '.aidlc/docs/AI_DLC_START_HERE.md',
  '.aidlc/tools/cli.js', '.aidlc/tools/lifecycle.js', '.aidlc/tools/VERSION', '.aidlc/tools/LICENSE.txt', '.aidlc/tools/package.json',
  '.aidlc/specs/templates/MANUAL_TRACKER.md', '.aidlc/specs/templates/intent/plan.json',
  '.aidlc/specs/active/.gitkeep', '.aidlc/specs/archive/.gitkeep'
]) assert(fs.existsSync(path.join(kit, name)), `Missing kit file: ${name}`);
const bridge = fs.readFileSync(path.join(kit, 'AGENTS.md'), 'utf8');
const lines = bridge.trimEnd().split(/\r?\n/).length;
assert(lines >= 15 && lines <= 20, 'AGENTS.md must remain a thin 15-20 line bridge');
for (const folder of ['rules', 'workflows', 'context']) assert(bridge.includes(`.aidlc/${folder}/`), `Missing bridge direction: ${folder}`);
compare(path.join(kit, '.aidlc'), path.join(root, '.aidlc'));
assert(fs.readFileSync(path.join(kit, 'AGENTS.md')).equals(fs.readFileSync(path.join(root, 'AGENTS.md'))), 'Agent bridge mismatch');
for (const name of ['.agents', 'docs', 'specs', 'tools/aidlc', 'bin', 'src']) assert(!fs.existsSync(path.join(root, name)), `Legacy payload remains: ${name}`);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert(manifest.private && !manifest.bin && !manifest.main && !manifest.files, 'Root manifest must be private maintenance metadata');
console.log('Portable kit structure, package independence, entry points and mirrors verified.');
