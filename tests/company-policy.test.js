// Independent policy/CLI/verification QA; fixture providers and identities are synthetic.
const F = require('./fixture');
const { fs, path, assert, lifecycle: L, id } = F;
const crypto = require('crypto');
const modulePath = fs.existsSync(path.join(F.root, '.aidlc/tools/policy.js')) ? '.aidlc/tools/policy.js' : 'kit/.aidlc/tools/policy.js';
const P = require(path.join(F.root, modulePath));
const prefix = 'aidlc-company-policy-';
const temporary = F.temporary(prefix);
let count = 0, failed = 0;
function test(name, operation) {
  count++;
  try { operation(); console.log(`ok ${count} - ${name}`); }
  catch (error) { failed++; console.error(`not ok ${count} - ${name}\n${error.stack}`); }
}
function bare(name) { const cwd = path.join(temporary, name); fs.mkdirSync(cwd, { recursive: true }); return cwd; }
function policy(cwd, value) { F.put(cwd, '.aidlc/company.json', JSON.stringify(value, null, 2) + '\n'); }
function digestTree(cwd) {
  const entries = [];
  function walk(directory) {
    for (const name of fs.readdirSync(directory).sort()) {
      const file = path.join(directory, name), relative = path.relative(cwd, file);
      const info = fs.lstatSync(file);
      if (info.isDirectory()) walk(file);
      else entries.push([relative, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);
    }
  }
  walk(cwd); return entries;
}
const seededBaselines = new Map();
function seeded(name, value) {
  const key = JSON.stringify(value || null);
  if (!seededBaselines.has(key)) {
    const baseline = bare('baseline-policy-' + seededBaselines.size);
    if (value) policy(baseline, value);
    F.seed(baseline);
    seededBaselines.set(key, baseline);
  }
  const cwd = bare(name);
  F.copyTree(seededBaselines.get(key), cwd);
  return cwd;
}
function planCommand(cwd, command, extraFiles = []) {
  L.reopen(cwd, id, 'plan', 'Fixture reviewer', 'Declare the exact bounded synthetic command');
  F.fill(cwd, 'plan');
  F.put(cwd, `.aidlc/specs/active/${id}/plan.json`, JSON.stringify({ allowedFiles: ['src/example.js', ...extraFiles], testFiles: [], dependencyFiles: [], maxFiles: 1 + extraFiles.length, verificationCommands: [command] }));
  F.advance(cwd); F.fill(cwd, 'tests'); F.advance(cwd);
}
function cli(cwd, ...args) { return F.run(process.execPath, ['.aidlc/tools/cli.js', ...args], cwd); }

try {
  test('missing legacy policy returns safe local defaults without creating files', () => {
    const cwd = bare('legacy-defaults');
    const loaded = P.load(cwd);
    assert.strictEqual(loaded.config.schemaVersion, 1);
    assert.strictEqual(loaded.config.workflow.defaultMode, 'autonomous');
    assert.strictEqual(loaded.config.organization.repositoryHost, null);
    assert.strictEqual(loaded.config.delivery.mode, 'local-pr-draft');
    assert.strictEqual(loaded.config.delivery.merge, 'human');
    assert.strictEqual(loaded.config.delivery.deploy, 'human');
    assert.deepStrictEqual(fs.readdirSync(cwd), []);
  });
  test('partial policy merges defaults, preserves explicit null and has deterministic digest', () => {
    const cwd = bare('partial');
    policy(cwd, { schemaVersion: 1, organization: { name: 'Synthetic company', repositoryHost: null }, quality: { verificationTimeoutMs: 100 } });
    const loaded = P.load(cwd);
    assert.strictEqual(loaded.config.organization.name, 'Synthetic company');
    assert.strictEqual(loaded.config.organization.repositoryHost, null);
    assert.deepStrictEqual(loaded.config.quality.requiredCommands, []);
    assert.strictEqual(loaded.config.quality.verificationTimeoutMs, 100);
    assert.strictEqual(P.load(cwd).digest, loaded.digest);
    policy(cwd, { quality: { verificationTimeoutMs: 101 } });
    assert.notStrictEqual(P.load(cwd).digest, loaded.digest);
  });
  test('bundled company policy states Jira/GitHub and PR delivery without authorizing merge or deploy', () => {
    const cwd = bare('bundle'); F.copyKit(cwd);
    const config = P.load(cwd).config;
    assert.strictEqual(config.organization.ticketSystem, 'jira');
    assert.strictEqual(config.organization.repositoryHost, 'github');
    assert.strictEqual(config.delivery.mode, 'pull-request');
    assert.strictEqual(config.delivery.merge, 'human');
    assert.strictEqual(config.delivery.deploy, 'human');
  });
  test('PR-mode tickets seed review and delivery reports without adding them to local checkpoint requirements', () => {
    const cwd = bare('optional-reports'); F.copyKit(cwd); F.git(cwd, 'init');
    L.createIntent(cwd, 'REPORT-1', 'express', 'autonomous');
    for (const name of ['review.md', 'delivery.md']) {
      const text = fs.readFileSync(path.join(cwd, '.aidlc/specs/active/REPORT-1', name), 'utf8');
      assert(text.trim());
      assert(!text.includes('[TICKET_ID]'));
      assert(Object.values(L.STAGES).every(stage => !stage.outputs.includes(name)), 'Reports must not silently change legacy local completion gates');
    }
  });
  test('unknown schema/keys and unsafe or mistyped values fail closed without writes', () => {
    const invalid = [null, [], { schemaVersion: 2 }, { surprise: true }, { workflow: { defaultMode: 'automatic-deploy' } },
      { organization: { ticketSystem: false } }, { organization: null }, { quality: { extra: true } },
      { quality: { verificationTimeoutMs: 0 } }, { quality: { verificationTimeoutMs: 1.5 } },
      { quality: { verificationTimeoutMs: 86400001 } }, { quality: { verificationTimeoutMs: '100' } },
      { quality: { maxOutputBytes: 0 } }, { quality: { maxOutputBytes: -1 } }, { quality: { maxOutputBytes: 67108865 } }, { quality: { maxOutputBytes: '1024' } },
      { quality: { requiredCommands: [''] } }, { quality: { requiredCommands: [12] } }, { delivery: { merge: 'automatic' } },
      { delivery: { deploy: 'automatic' } }];
    invalid.forEach((value, index) => {
      const cwd = bare('invalid-' + index); policy(cwd, value);
      const before = digestTree(cwd);
      assert.throws(() => P.load(cwd), /policy|schema|company|quality|organization|workflow|delivery|unknown|invalid|must|object/i, JSON.stringify(value));
      assert.deepStrictEqual(digestTree(cwd), before);
    });
  });
  test('malformed JSON fails policy parsing without replacing its bytes', () => {
    const cwd = bare('malformed'); F.put(cwd, '.aidlc/company.json', '{broken json');
    const before = digestTree(cwd);
    assert.throws(() => P.load(cwd));
    assert.deepStrictEqual(digestTree(cwd), before);
  });
  test('valid business prose containing TODO is accepted while unresolved template markers are rejected', () => {
    const cwd = bare('business-todo'); F.copyKit(cwd); F.git(cwd, 'init');
    for (const file of L.CONTEXT_FILES) F.put(cwd, file, '# Business context\nThe support team tracks TODO tasks in Jira. This is a real product requirement.\n');
    assert.doesNotThrow(() => L.observeContext(cwd, 'Synthetic analyst', 'Business terminology confirmed from fixture'));
    for (const marker of ['TODO: Fill in the actual customer decision', '- TODO', '| Owner | TODO |', '[TICKET_ID]']) {
      F.put(cwd, L.CONTEXT_FILES[0], '# Unfinished context\n' + marker + '\n');
      assert.throws(() => L.observeContext(cwd, 'Synthetic analyst', 'Must not approve unfinished fixture'), /TODO|complete/i, marker);
    }
  });
  test('policy defaults apply to new tickets while explicit flags win and legacy reviewed mode stays reviewed', () => {
    const cwd = bare('ticket-defaults'); F.copyKit(cwd); F.git(cwd, 'init');
    policy(cwd, { workflow: { defaultMode: 'reviewed', defaultProfile: 'bugfix' } });
    L.createIntent(cwd, 'DEFAULT-1');
    assert.strictEqual(L.status(cwd, 'DEFAULT-1').mode, 'reviewed');
    assert.strictEqual(L.status(cwd, 'DEFAULT-1').profile, 'bugfix');
    L.createIntent(cwd, 'EXPLICIT-1', 'express', 'autonomous');
    assert.strictEqual(L.status(cwd, 'EXPLICIT-1').mode, 'autonomous');
    assert.strictEqual(L.status(cwd, 'EXPLICIT-1').profile, 'express');
    assert.strictEqual(cli(cwd, 'new', 'CLI-DEFAULT').status, 0);
    assert.strictEqual(L.status(cwd, 'CLI-DEFAULT').mode, 'reviewed');
    assert.strictEqual(L.status(cwd, 'CLI-DEFAULT').profile, 'bugfix');
    const explicit = cli(cwd, 'new', 'CLI-EXPLICIT', '--profile', 'express', '--mode', 'autonomous');
    assert.strictEqual(explicit.status, 0, explicit.stderr);
    assert.strictEqual(L.status(cwd, 'CLI-EXPLICIT').mode, 'autonomous');
    assert.strictEqual(L.status(cwd, 'CLI-EXPLICIT').profile, 'express');
    policy(cwd, { workflow: { defaultMode: 'autonomous', defaultProfile: 'feature' } });
    assert.strictEqual(L.status(cwd, 'DEFAULT-1').mode, 'reviewed');
  });
  test('invalid company policy prevents CLI ticket creation before record writes', () => {
    const cwd = bare('invalid-new'); F.copyKit(cwd); F.git(cwd, 'init');
    policy(cwd, { unrecognized: true });
    const before = digestTree(cwd);
    const result = cli(cwd, 'new', 'NEVER-WRITE');
    assert.notStrictEqual(result.status, 0);
    assert.deepStrictEqual(digestTree(cwd), before);
    assert(!fs.existsSync(path.join(cwd, '.aidlc/specs/active/NEVER-WRITE')));
  });
  test('required quality commands are additive exact plan requirements, not auto executed from policy', () => {
    const cwd = seeded('missing-command');
    const receipt = L.status(cwd, id).verifications.length;
    policy(cwd, { quality: { requiredCommands: [F.command, 'node missing-required-check.cjs'] } });
    assert.throws(() => L.verify(cwd, id, F.command), /requires verification command: node missing-required-check\.cjs/);
    L.reopen(cwd, id, 'plan', 'Fixture reviewer', 'Re-plan with the required company checks');
    F.fill(cwd, 'plan');
    F.put(cwd, `.aidlc/specs/active/${id}/plan.json`, JSON.stringify({ allowedFiles: ['src/example.js'], testFiles: [], dependencyFiles: [], maxFiles: 1, verificationCommands: [F.command] }));
    const statePath = path.join(cwd, `.aidlc/specs/active/${id}/state.json`);
    const beforePlan = fs.readFileSync(statePath, 'utf8');
    assert.throws(() => L.progress(cwd, id, 'Synthetic coordinator', 'Missing required check must not pass the plan gate'), /requires verification command: node missing-required-check\.cjs/);
    assert.strictEqual(fs.readFileSync(statePath, 'utf8'), beforePlan, 'Rejected plan must not write a successful checkpoint receipt');
    try {
      const checked = L.check(cwd, id);
      assert(checked.errors.some(error => /missing|required|command/i.test(error) && error.includes('node missing-required-check.cjs')), JSON.stringify(checked));
    } catch (error) { assert.match(error.message, /requires verification command: node missing-required-check\.cjs/); }
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(cwd, `.aidlc/specs/active/${id}/state.json`), 'utf8')).verifications.length, receipt);
  });
  test('changing effective company policy invalidates previously successful verification', () => {
    const cwd = seeded('policy-invalidates'); F.readyForVerify(cwd);
    const before = L.status(cwd, id);
    assert(before.verifications.some(item => item.exitCode === 0));
    policy(cwd, { organization: { name: 'Changed synthetic policy' } });
    assert.throws(() => F.advance(cwd), /policy|company|current verification|changed/i);
    assert.notStrictEqual(L.fingerprint(cwd, before), before.verifications[0].fingerprint);
    assert.strictEqual(L.status(cwd, id).localDeliveryComplete, false);
  });
  test('configured verification timeout records a failure and releases locks for a later rerun', () => {
    const cwd = seeded('timeout', { quality: { verificationTimeoutMs: 100 } });
    const slow = 'node -e "setTimeout(()=>{},2000)"';
    planCommand(cwd, slow);
    assert.notStrictEqual(L.verify(cwd, id, slow), 0);
    const after = L.status(cwd, id);
    const failure = after.verifications[after.verifications.length - 1];
    assert.notStrictEqual(failure.exitCode, 0);
    assert.strictEqual(failure.timedOut, true);
    assert.strictEqual(failure.processError, 'ETIMEDOUT');
    assert.strictEqual(failure.processExitCode, null);
    assert.match(fs.readFileSync(path.join(cwd, `.aidlc/specs/active/${id}`, failure.log), 'utf8'), /timeout|ETIMEDOUT/i);
    assert.strictEqual(after.localDeliveryComplete, false);
    assert(!fs.existsSync(path.join(cwd, `.aidlc/specs/active/${id}/.state.lock`)));
    // The strict timeout above is intentional. A successful rerun needs a
    // normal startup budget instead of assuming every host spawns a shell in
    // under 100 ms. Replanning also refreshes evidence for the policy change.
    policy(cwd, { quality: { verificationTimeoutMs: 10000 } });
    planCommand(cwd, 'exit 0', ['.aidlc/company.json']);
    assert.strictEqual(L.verify(cwd, id, 'exit 0'), 0);
  });
  test('configured output cap records a failed receipt rather than a successful truncated command', () => {
    const cwd = seeded('output-cap', { quality: { maxOutputBytes: 1024 } });
    for (const literal of ["'x'", "'\\u20ac'"]) {
      const loud = `node -e "process.stdout.write(${literal}.repeat(65536))"`;
      planCommand(cwd, loud);
      assert.notStrictEqual(L.verify(cwd, id, loud), 0);
      const receipts = L.status(cwd, id).verifications;
      const failure = receipts[receipts.length - 1];
      assert.notStrictEqual(failure.exitCode, 0);
      assert.strictEqual(failure.outputTruncated, true);
      assert(['ENOBUFS', 'OUTPUT_LIMIT'].includes(failure.processError));
      const log = fs.readFileSync(path.join(cwd, `.aidlc/specs/active/${id}`, failure.log), 'utf8');
      assert(log.length > 0);
      assert(Buffer.byteLength(log, 'utf8') <= 1024, 'Diagnostic and stdout/stderr must share the configured byte budget');
      assert(!log.includes('\ufffd'), 'UTF-8 truncation must not split a multibyte code point');
    }
  });
  test('policy and doctor CLI inspect readiness without changing tracked, untracked or record bytes', () => {
    const cwd = seeded('read-only-cli');
    const before = digestTree(cwd);
    const shown = cli(cwd, 'policy');
    assert.strictEqual(shown.status, 0, shown.stderr);
    const parsed = JSON.parse(shown.stdout);
    assert(parsed.config || parsed.schemaVersion === 1);
    const diagnosis = cli(cwd, 'doctor', id);
    assert.strictEqual(diagnosis.status, 0, diagnosis.stderr);
    assert(/git|node|policy|company|readiness/i.test(diagnosis.stdout));
    assert.deepStrictEqual(digestTree(cwd), before, 'Readiness inspection must not write metadata, index or evidence');
  });
  console.log(`${count - failed}/${count} company policy checks passed.`);
  if (failed) process.exitCode = 1;
} finally { F.cleanup(temporary, prefix); }
