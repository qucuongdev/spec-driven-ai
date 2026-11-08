// Suites only share read-only kit files; every repository/index is disposable.
const { spawn } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const suites = ['lifecycle', 'regressions', 'agents', 'autonomous', 'company-regressions', 'company-policy', 'review-fixes'];
const requested = Number(process.env.AIDLC_TEST_JOBS || 3);
if (!Number.isInteger(requested) || requested < 1 || requested > suites.length) {
  console.error(`AIDLC_TEST_JOBS must be an integer from 1 to ${suites.length}.`);
  process.exitCode = 1;
} else {
  let next = 0, active = 0, finished = 0, failed = 0;
  function output(stream, label, destination) {
    let pending = '';
    stream.setEncoding('utf8');
    stream.on('data', chunk => {
      pending += chunk;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop();
      for (const line of lines) destination.write(`[${label}] ${line}\n`);
    });
    stream.on('end', () => { if (pending) destination.write(`[${label}] ${pending}\n`); });
  }
  function schedule() {
    while (active < requested && next < suites.length) {
      const name = suites[next++];
      active++;
      console.log(`Starting ${name}`);
      const child = spawn(process.execPath, [`tests/${name}.test.js`], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      output(child.stdout, name, process.stdout);
      output(child.stderr, name, process.stderr);
      let spawnError = false;
      child.on('error', error => { spawnError = true; console.error(`[${name}] Could not start: ${error.message}`); });
      child.on('close', (code, signal) => {
        active--; finished++;
        if (spawnError || code !== 0 || signal) failed++;
        console.log(`Finished ${name}: ${!spawnError && code === 0 && !signal ? 'PASS' : 'FAIL'}`);
        if (finished === suites.length) {
          console.log(`${suites.length - failed}/${suites.length} test suites passed.`);
          process.exitCode = failed ? 1 : 0;
        } else schedule();
      });
    }
  }
  schedule();
}
