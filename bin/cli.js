#!/usr/bin/env node

const path = require('path');
const pkg = require('../package.json');
const { runInit } = require('../src/commands/init');
const { runCheck } = require('../src/commands/check');
const { runNew } = require('../src/commands/new');
const { bold, cyan, green, yellow } = require('../src/utils/colors');

function printHelp() {
  console.log(cyan(bold(`\nspec-driven-ai v${pkg.version}`)));
  console.log('Spec-Driven AI Development Lifecycle (AI-DLC) Harness & Guardrails\n');
  console.log(bold('USAGE:'));
  console.log('  npx spec-driven-ai <command> [options]\n');
  console.log(bold('COMMANDS:'));
  console.log(`  ${green('init')}                 Initialize AI-DLC rules, workflows, templates and Git pre-commit hook`);
  console.log(`  ${green('new <TICKET_ID>')}     Create a new active Spec pre-populated with metadata`);
  console.log(`  ${green('check [SPEC_FILE]')}   Verify Git status against File Whitelist and System Boundaries`);
  console.log(`  ${green('version, -v')}          Show version`);
  console.log(`  ${green('help, -h')}             Show this help message\n`);
  console.log(bold('EXAMPLES:'));
  console.log(`  ${yellow('npx spec-driven-ai init')}`);
  console.log(`  ${yellow('npx spec-driven-ai new JIRA-1024')}`);
  console.log(`  ${yellow('npx spec-driven-ai check')}\n`);
}

const args = process.argv.slice(2);
const command = args[0] ? args[0].toLowerCase() : '';

switch (command) {
  case 'init':
    runInit(process.cwd());
    break;

  case 'new':
    runNew(args[1], process.cwd());
    break;

  case 'check':
    runCheck(args[1], process.cwd());
    break;

  case '-v':
  case '--version':
  case 'version':
    console.log(`v${pkg.version}`);
    break;

  case '-h':
  case '--help':
  case 'help':
  case '':
  default:
    printHelp();
    break;
}
