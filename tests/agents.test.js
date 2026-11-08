// Payload/contract checks, not a claim that an IDE permission sandbox was exercised.
const F = require('./fixture');
const { fs, path, assert } = F;
const temp = F.temporary('aidlc-agent-contracts-');
const roles = ['architect', 'qa-tester', 'coder', 'auditor'];
let count = 0;
function test(name, operation) { operation(); count++; console.log(`ok ${count} - ${name}`); }
function maintenanceFixture(name) {
  const cwd = path.join(temp, name);
  F.copyTree(path.join(F.root, 'kit'), path.join(cwd, 'kit'));
  F.copyTree(path.join(F.root, '.aidlc'), path.join(cwd, '.aidlc'));
  fs.mkdirSync(path.join(cwd, 'scripts'));
  for (const file of ['AGENTS.md', 'package.json', 'scripts/check-kit.js']) fs.copyFileSync(path.join(F.root, file), path.join(cwd, file));
  F.success(F.run(process.execPath, ['scripts/check-kit.js'], cwd));
  return cwd;
}
try {
  test('portable copy keeps the two root entries and all four role prompts', () => {
    const cwd = path.join(temp, 'consumer'); F.copyKit(cwd);
    assert.deepStrictEqual(fs.readdirSync(cwd).sort(), ['.aidlc', 'AGENTS.md']);
    assert.deepStrictEqual(fs.readdirSync(path.join(cwd, '.aidlc/agents')).sort(), roles.map(role => `${role}.md`).sort());
    for (const role of roles) assert(fs.readFileSync(path.join(cwd, '.aidlc/agents', `${role}.md`)).equals(fs.readFileSync(path.join(F.root, 'kit/.aidlc/agents', `${role}.md`))));
  });
  test('kit validation rejects a missing required agent', () => {
    const cwd = maintenanceFixture('missing');
    fs.unlinkSync(path.join(cwd, 'kit/.aidlc/agents/architect.md'));
    const result = F.run(process.execPath, ['scripts/check-kit.js'], cwd);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /Missing kit file:.*agents.*architect\.md/);
  });
  test('kit validation rejects an unsynchronized root agent prompt', () => {
    const cwd = maintenanceFixture('mismatch');
    F.put(cwd, '.aidlc/agents/coder.md', '# Unsynchronized coder\n');
    const result = F.run(process.execPath, ['scripts/check-kit.js'], cwd);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /Mirror mismatch:.*coder\.md/);
  });
  test('every owned stage names the right role and the bridge routes to collaboration guidance', () => {
    const workflow = fs.readFileSync(path.join(F.root, '.aidlc/workflows/ai-dlc.md'), 'utf8');
    for (const [stage, owner] of [['framing', 'architect'], ['discovery', 'architect'], ['requirements', 'architect'], ['plan', 'architect'], ['tests', 'qa-tester'], ['implement', 'coder'], ['verify', 'auditor'], ['pr', 'auditor']]) {
      assert(new RegExp(`^\\d+\\. ${stage}(?: \\([^\\n]+\\))? \\[Owner: ${owner}\\]:`, 'm').test(workflow), `Wrong owner for ${stage}`);
    }
    const bridge = fs.readFileSync(path.join(F.root, 'AGENTS.md'), 'utf8');
    assert(bridge.includes('.aidlc/agents/'));
    assert(bridge.includes('USER_GUIDE.md#multi-agent-collaboration'));
    assert(bridge.trimEnd().split(/\r?\n/).length <= 20);
    const guide = fs.readFileSync(path.join(F.root, '.aidlc/docs/USER_GUIDE.md'), 'utf8');
    assert(guide.includes('## Multi-Agent Collaboration'));
  });
  console.log(`Passed ${count} agent payload/contract checks.`);
} finally { F.cleanup(temp, 'aidlc-agent-contracts-'); }
