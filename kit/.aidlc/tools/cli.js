#!/usr/bin/env node
const lifecycle = require('./lifecycle');
const version = require('fs').readFileSync(require('path').join(__dirname, 'VERSION'), 'utf8').trim();

function help() {
  console.log(`AI-DLC local helper v${version} (optional; no package installation)

  Run from the target repository: node .aidlc/tools/cli.js <command>
  new <TICKET> [--profile <name>]    feature (default), bugfix, refactor, express
  context                           Show project business-context readiness
  context --by <name> --note <text> Record a human's baseline acknowledgement
  status [TICKET]                    Show stage, outputs and approval history
  advance <TICKET> --by <name> --note <text>
                                    Record a human checkpoint for the current stage
  reopen <TICKET> --stage <name> --by <name> --note <text>
                                    Reopen a stage; invalidate downstream receipts
  verify <TICKET> --command <text>   Run an explicitly supplied shell command
  check [TICKET] [--base <git-ref>]  Check working changes, or branch diff plus worktree
  version | help

Edit plan.json before the plan checkpoint. Approval names are attestations,
not authenticated identities. Agents must not invent human approvals.
verify executes your command with your shell privileges; review it first.
check does not run tests. No Jira, GitHub, deployment or AI API calls are automatic.`);
}

function main(args) {
  const command = args[0] || 'help';
  const positional = [];
  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (!['profile', 'by', 'note', 'stage', 'command', 'base'].includes(key)) throw new Error(`Unknown option: --${key}`);
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for --${key}`);
      options[key] = args[++i];
    } else positional.push(args[i]);
  }
  const cwd = process.cwd();
  const ticket = positional[0];
  switch (command) {
    case 'new': { const state = lifecycle.createIntent(cwd, ticket, options.profile); console.log(`Created ${state.id} (${state.profile}) in .aidlc/specs/active/${state.id}/`); return; }
    case 'check': {
      const result = lifecycle.check(cwd, ticket, options.base);
      result.errors.forEach(error => console.error(`FAIL: ${error}`));
      if (!result.errors.length) console.log(`PASS: scope check (${result.files.length} files). Tests were not run.`);
      process.exitCode = result.errors.length ? 1 : 0;
      return;
    }
    case 'context':
      if (options.by || options.note) lifecycle.approveContext(cwd, options.by, options.note);
      console.log(JSON.stringify(lifecycle.contextStatus(cwd), null, 2)); return;
    case 'status': console.log(JSON.stringify(lifecycle.status(cwd, ticket), null, 2)); return;
    case 'advance': console.log(JSON.stringify(lifecycle.advance(cwd, ticket, options.by, options.note), null, 2)); return;
    case 'reopen': console.log(JSON.stringify(lifecycle.reopen(cwd, ticket, options.stage, options.by, options.note), null, 2)); return;
    case 'verify': process.exitCode = lifecycle.verify(cwd, ticket, options.command); return;
    case '-v': case '--version': case 'version': console.log(version); return;
    case '-h': case '--help': case 'help': help(); return;
    default: throw new Error(`Unknown command: ${command}. Run node .aidlc/tools/cli.js help.`);
  }
}

try { main(process.argv.slice(2)); }
catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 1; }
