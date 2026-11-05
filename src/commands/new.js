// src/commands/new.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { bold, green, cyan, yellow, blue, red } = require('../utils/colors');

function getGitUser() {
  try {
    return execSync('git config user.name', { encoding: 'utf8' }).trim();
  } catch {
    return 'Engineer';
  }
}

function runNew(ticketId, targetDir = process.cwd()) {
  if (!ticketId) {
    console.error(red('\n[ERROR] Ticket ID is required!'));
    console.log(yellow('Usage: npx spec-driven-ai new <TICKET_ID>'));
    console.log(yellow('Example: npx spec-driven-ai new JIRA-1024\n'));
    process.exit(1);
  }

  // Clean ticket ID
  const cleanId = ticketId.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const dateCompact = today.replace(/-/g, '');
  const specId = `SPEC-${dateCompact}-${cleanId}`;

  // Find template file
  const localTemplate = path.join(targetDir, 'specs', 'templates', 'SPEC_TEMPLATE.md');
  const packageTemplate = path.join(__dirname, '..', '..', 'templates', 'specs', 'templates', 'SPEC_TEMPLATE.md');
  
  let templatePath = '';
  if (fs.existsSync(localTemplate)) {
    templatePath = localTemplate;
  } else if (fs.existsSync(packageTemplate)) {
    templatePath = packageTemplate;
  } else {
    console.error(red('\n[ERROR] SPEC_TEMPLATE.md not found. Did you run "npx spec-driven-ai init"?'));
    process.exit(1);
  }

  const activeDir = path.join(targetDir, 'specs', 'active');
  if (!fs.existsSync(activeDir)) {
    fs.mkdirSync(activeDir, { recursive: true });
  }

  const targetSpecFile = path.join(activeDir, `SPEC-${cleanId}.md`);
  if (fs.existsSync(targetSpecFile)) {
    console.error(red(`\n[ERROR] Spec file already exists at: ${targetSpecFile}`));
    console.log(yellow('Please edit the existing file or specify a different Ticket ID.\n'));
    process.exit(1);
  }

  // Read template and populate metadata
  let content = fs.readFileSync(templatePath, 'utf8');
  const author = getGitUser();

  content = content
    .replace(/SPEC-\[ID\]/g, specId)
    .replace(/SPEC-YYYYMMDD-\[TICKET_ID\]/g, specId)
    .replace(/\[JIRA-1234 \/ ISSUE-567\]/g, cleanId)
    .replace(/\[Tên Kỹ sư phụ trách\]/g, author)
    .replace(/YYYY-MM-DD/g, today);

  fs.writeFileSync(targetSpecFile, content, 'utf8');

  console.log(cyan(bold('\n======================================================')));
  console.log(green(bold(`  ✓ CREATED NEW ACTIVE SPEC: SPEC-${cleanId}.md`)));
  console.log(cyan(bold('======================================================\n')));

  console.log(blue(`> File path: ${bold(targetSpecFile)}`));
  console.log(blue(`> Spec ID:   ${bold(specId)}`));
  console.log(blue(`> Status:    ${yellow('DRAFT')}`));

  console.log(bold('\nNext Steps:'));
  console.log(`  1. Open ${cyan(targetSpecFile)} and fill in Sections 1-5.`);
  console.log(`  2. Review and freeze the spec: Set ${green('status: "SPEC_FROZEN"')}.`);
  console.log(`  3. Invoke QA Agent to generate tests: ${cyan('.agents/workflows/generate-tests.md')}\n`);
}

module.exports = { runNew };
