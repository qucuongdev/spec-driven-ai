// Explicit PowerShell packaging tests; run with npm run test:package.
const F = require('./fixture');
const { fs, path, assert } = F;
const temp = F.temporary('aidlc-fix-packaging-');
const powershell = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
let count = 0, failed = 0;
function test(name, fn) {
  count++;
  try { fn(); console.log(`ok ${count} - ${name}`); }
  catch (error) { failed++; console.error(`not ok ${count} - ${name}\n${error.stack}`); }
}
function fixture(name) {
  const cwd = path.join(temp, name);
  F.copyTree(path.join(F.root, 'kit'), path.join(cwd, 'kit'));
  fs.mkdirSync(path.join(cwd, 'scripts'));
  fs.copyFileSync(path.join(F.root, 'scripts/package-kit.ps1'), path.join(cwd, 'scripts/package-kit.ps1'));
  return cwd;
}
function pack(cwd, output = path.join(cwd, 'kit.zip')) {
  return F.run(powershell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(cwd, 'scripts/package-kit.ps1'), '-OutputPath', output], cwd);
}
function link(source, target) { fs.symlinkSync(source, target, process.platform === 'win32' ? 'junction' : 'dir'); }
function inventory(root, prefix = '') {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(item => item.isDirectory()
    ? inventory(path.join(root, item.name), prefix + item.name + '/') : [prefix + item.name]).sort();
}
const quote = value => "'" + value.replace(/'/g, "''") + "'";
try {
  test('ZIP has exactly the portable tree and runs in an ESM consumer', () => {
    const cwd = fixture('normal');
    F.success(pack(cwd));
    const unpacked = path.join(cwd, 'unpacked');
    F.success(F.run(powershell, ['-NoProfile', '-Command', `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory(${quote(path.join(cwd, 'kit.zip'))}, ${quote(unpacked)})`], cwd));
    assert.deepStrictEqual(fs.readdirSync(unpacked).sort(), ['.aidlc', 'AGENTS.md']);
    const expected = inventory(path.join(cwd, 'kit'));
    assert.deepStrictEqual(inventory(unpacked), expected);
    for (const file of expected) assert(fs.readFileSync(path.join(unpacked, file)).equals(fs.readFileSync(path.join(cwd, 'kit', file))));
    F.put(unpacked, 'package.json', '{"type":"module"}\n');
    F.success(F.run(process.execPath, ['.aidlc/tools/cli.js', 'help'], unpacked));
  });
  test('packaging never overwrites an existing archive', () => {
    const cwd = fixture('existing'); F.success(pack(cwd));
    const archive = path.join(cwd, 'kit.zip'), before = fs.readFileSync(archive);
    assert.notStrictEqual(pack(cwd).status, 0);
    assert(before.equals(fs.readFileSync(archive)));
  });
  test('a source junction is rejected before any archive is created', () => {
    const cwd = fixture('source-link'), external = path.join(cwd, 'outside-kit');
    fs.mkdirSync(external); F.put(external, 'fixture.txt', 'Synthetic external content\n');
    link(external, path.join(cwd, 'kit/.aidlc/docs/external'));
    const result = pack(cwd);
    assert.notStrictEqual(result.status, 0);
    assert.match(result.stderr, /reparse|symlink|junction/i);
    assert(!fs.existsSync(path.join(cwd, 'kit.zip')));
  });
  test('a linked kit root is rejected before any archive is created', () => {
    const cwd = fixture('root-link');
    const actual = path.join(cwd, 'real-kit');
    fs.renameSync(path.join(cwd, 'kit'), actual); link(actual, path.join(cwd, 'kit'));
    assert.notStrictEqual(pack(cwd).status, 0);
    assert(!fs.existsSync(path.join(cwd, 'kit.zip')));
  });
  test('an output parent junction into the kit cannot bypass containment', () => {
    const cwd = fixture('output-link'), alias = path.join(cwd, 'output-alias');
    link(path.join(cwd, 'kit/.aidlc/docs'), alias);
    const output = path.join(alias, 'nested.zip');
    assert.notStrictEqual(pack(cwd, output).status, 0);
    assert(!fs.existsSync(output));
  });
  test('a direct output inside the kit is rejected without leaving an archive', () => {
    const cwd = fixture('direct-output'), output = path.join(cwd, 'kit/.aidlc/docs/nested.zip');
    assert.notStrictEqual(pack(cwd, output).status, 0);
    assert(!fs.existsSync(output));
  });
  console.log(`${count - failed}/${count} packaging checks passed.`);
  if (failed) process.exitCode = 1;
} finally { F.cleanup(temp, 'aidlc-fix-packaging-'); }
