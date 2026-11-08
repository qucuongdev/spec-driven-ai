#!/usr/bin/env node
const lifecycle = require('./lifecycle');
const policy = require('./policy');
const version = require('fs').readFileSync(require('path').join(__dirname, 'VERSION'), 'utf8').trim();

function help() {
  console.log(`AI-DLC local helper v${version} (optional; no package installation)

  Run from the target repository: node .aidlc/tools/cli.js <command>
  new <TICKET> [--profile <name>] [--mode autonomous|reviewed]
                                    Autonomous local delivery is the default
  context                           Show project business-context readiness
  policy                            Show validated effective company policy
  doctor [TICKET]                   Read-only local readiness diagnostic (offline)
  context --by <name> --note <text> Record a human's baseline acknowledgement
  context --agent <name> --note <text> Record observed context, not human approval
  status [TICKET]                    Show stage, outputs and approval history
  advance <TICKET> --by <name> --note <text>
                                    Record a human checkpoint for the current stage
  progress <TICKET> --agent <name> --note <text>
                                    Record autonomous progress through a local stage
  reopen <TICKET> --stage <name> --by <name> --note <text>
                                    Reopen a stage; invalidate downstream receipts
  revise <TICKET> --stage <name> --agent <name> --note <text>
                                    Revise an autonomous stage and invalidate evidence
  verify <TICKET> --command <text>   Run an explicitly supplied shell command
  check [TICKET] [--base <git-ref>]  Check working changes, or branch diff plus worktree
  version | help

The coordinating AI follows .aidlc/workflows/ticket-autopilot.md and supplies
commands explicitly. This CLI tracks evidence; it is not an AI or Jira client.
Agent observations are distinct from human approvals; legacy records stay reviewed.
verify runs the supplied command with your shell privileges. check does not run tests.
Local delivery stops at a PR draft; publishing and deployment need authorization.`);
}

function main(args) {
  const command = args[0] || 'help';
  const positional = [];
  const options = {};
  const allowed = {
    new: ['profile', 'mode'], context: ['by', 'agent', 'note'], status: [], policy: [], doctor: [],
    advance: ['by', 'note'], progress: ['agent', 'note'],
    reopen: ['stage', 'by', 'note'], revise: ['stage', 'agent', 'note'],
    verify: ['command'], check: ['base'], version: [], help: [],
    '-v': [], '--version': [], '-h': [], '--help': []
  };
  if (!Object.prototype.hasOwnProperty.call(allowed, command)) throw new Error(`Unknown command: ${command}. Run node .aidlc/tools/cli.js help.`);
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (!allowed[command].includes(key)) throw new Error(`Unknown option for ${command}: --${key}`);
      if (Object.prototype.hasOwnProperty.call(options, key)) throw new Error(`Duplicate option: --${key}`);
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for --${key}`);
      options[key] = args[++i];
    } else positional.push(args[i]);
  }
  const acceptsTicket = ['new', 'status', 'doctor', 'advance', 'progress', 'reopen', 'revise', 'verify', 'check'].includes(command);
  if (positional.length > (acceptsTicket ? 1 : 0)) throw new Error(`Unexpected positional arguments for ${command}.`);
  if (options.by !== undefined && options.agent !== undefined) throw new Error('Choose --by for a human or --agent for an observation, never both.');
  const cwd = process.cwd();
  const ticket = positional[0];
  switch (command) {
    case 'policy': console.log(JSON.stringify(policy.load(cwd), null, 2)); return;
    case 'doctor': {
      const report = policy.doctor(cwd);
      const context = lifecycle.contextStatus(cwd);
      report.projectContext = { ready: context.ready, reason: context.reason || null };
      if (!context.ready) report.warnings.push('Shared context needs bootstrap or a current observation before progressing a ticket.');
      if (ticket) {
        try {
          const state = lifecycle.status(cwd, ticket);
          report.ticket = { id: state.id, currentStage: state.currentStage, mode: state.mode, localDeliveryComplete: state.localDeliveryComplete, completionScope: state.completionScope, deliveryMode: state.deliveryMode };
          report.checks.push({ name: 'ticketState', ok: true, detail: 'Readable local lifecycle record; remote PR/review not checked.' });
          if (state.current > state.route.indexOf('plan')) {
            const scope = lifecycle.check(cwd, ticket);
            report.checks.push({ name: 'ticketScope', ok: scope.errors.length === 0, detail: scope.errors.length ? scope.errors.join('\n') : 'Scope and local artifact receipts are current; project tests were not run.' });
          }
        } catch (error) { report.checks.push({ name: 'ticketState', ok: false, detail: error.message }); }
      }
      report.ok = report.checks.every(check => check.ok);
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.ok ? 0 : 1;
      return;
    }
    case 'new': { const state = lifecycle.createIntent(cwd, ticket, options.profile, options.mode); console.log(`Created ${state.id} (${state.profile}, ${state.mode}) in .aidlc/specs/active/${state.id}/`); return; }
    case 'check': {
      const result = lifecycle.check(cwd, ticket, options.base);
      result.errors.forEach(error => console.error(`FAIL: ${error}`));
      if (!result.errors.length) console.log(`PASS: scope check (${result.files.length} files). Tests were not run.`);
      process.exitCode = result.errors.length ? 1 : 0;
      return;
    }
    case 'context':
      if (options.agent !== undefined) lifecycle.observeContext(cwd, options.agent, options.note);
      else if (options.by !== undefined || options.note !== undefined) lifecycle.approveContext(cwd, options.by, options.note);
      console.log(JSON.stringify(lifecycle.contextStatus(cwd), null, 2)); return;
    case 'status': console.log(JSON.stringify(lifecycle.status(cwd, ticket), null, 2)); return;
    case 'advance': console.log(JSON.stringify(lifecycle.advance(cwd, ticket, options.by, options.note), null, 2)); return;
    case 'progress': console.log(JSON.stringify(lifecycle.progress(cwd, ticket, options.agent, options.note), null, 2)); return;
    case 'reopen': console.log(JSON.stringify(lifecycle.reopen(cwd, ticket, options.stage, options.by, options.note), null, 2)); return;
    case 'revise': console.log(JSON.stringify(lifecycle.revise(cwd, ticket, options.stage, options.agent, options.note), null, 2)); return;
    case 'verify': process.exitCode = lifecycle.verify(cwd, ticket, options.command); return;
    case '-v': case '--version': case 'version': console.log(version); return;
    case '-h': case '--help': case 'help': help(); return;
    default: throw new Error(`Unknown command: ${command}. Run node .aidlc/tools/cli.js help.`);
  }
}

try { main(process.argv.slice(2)); }
catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 1; }
