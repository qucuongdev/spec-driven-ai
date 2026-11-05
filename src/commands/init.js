// src/commands/init.js
const fs = require('fs');
const path = require('path');
const { bold, green, cyan, yellow, blue, red } = require('../utils/colors');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    // Only copy if file doesn't exist, or overwrite if needed
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
}

function installGitHook(targetDir) {
  const gitHooksDir = path.join(targetDir, '.git', 'hooks');
  if (!fs.existsSync(gitHooksDir)) {
    console.log(yellow('  [!] .git folder not found. Skipping pre-commit hook installation.'));
    console.log(yellow('      (Run this command in the root of a Git repository to enable auto-protection)'));
    return false;
  }

  const preCommitPath = path.join(gitHooksDir, 'pre-commit');
  const hookContent = `#!/usr/bin/env bash
# ==============================================================================
# SPEC-DRIVEN AI-DLC: Local Pre-Commit Guardrail Hook
# ==============================================================================
echo ""
echo ">> Running Spec-Driven AI-DLC Guardrail Checks..."

# Try npx spec-driven-ai check first, fallback to script
if command -v npx >/dev/null 2>&1; then
  npx spec-driven-ai check
else
  bash scripts/check-guardrails.sh
fi

STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo ""
  echo ">> [BLOCKED] Pre-commit rejected: Changes violate Spec or System Boundaries!"
  echo ">> Run 'npx spec-driven-ai check' for full details."
  exit 1
fi
`;

  try {
    fs.writeFileSync(preCommitPath, hookContent, { mode: 0o755 });
    console.log(green('  ✓ Installed Git Pre-Commit Hook at .git/hooks/pre-commit'));
    return true;
  } catch (err) {
    console.log(yellow(`  [!] Could not write .git/hooks/pre-commit: ${err.message}`));
    return false;
  }
}

function runInit(targetDir = process.cwd()) {
  console.log(cyan(bold('\n======================================================')));
  console.log(cyan(bold('  INITIALIZING SPEC-DRIVEN AI-DLC FRAMEWORK          ')));
  console.log(cyan(bold('======================================================\n')));

  const templateDir = path.join(__dirname, '..', '..', 'templates');

  if (!fs.existsSync(templateDir)) {
    console.error(red(`[ERROR] Template directory not found at: ${templateDir}`));
    process.exit(1);
  }

  console.log(blue(`> Target directory: ${bold(targetDir)}`));
  console.log(blue('> Deploying lồng sắt kỹ thuật (rules, workflows, templates, scripts)...'));

  // 1. Copy .agents
  copyRecursiveSync(
    path.join(templateDir, '.agents'),
    path.join(targetDir, '.agents')
  );
  console.log(green('  ✓ Created .agents/rules/ (01-system-boundaries.md, 02-adversarial-testing.md)'));
  console.log(green('  ✓ Created .agents/workflows/ (reverse-spec.md, generate-tests.md, implement-patch.md)'));

  // 2. Copy specs
  copyRecursiveSync(
    path.join(templateDir, 'specs'),
    path.join(targetDir, 'specs')
  );
  console.log(green('  ✓ Created specs/templates/ (SPEC_TEMPLATE.md, LIVING_ADR_TEMPLATE.md)'));
  console.log(green('  ✓ Created specs/active/ and specs/archive/'));

  // 3. Copy scripts
  copyRecursiveSync(
    path.join(templateDir, 'scripts'),
    path.join(targetDir, 'scripts')
  );
  try {
    const scriptPath = path.join(targetDir, 'scripts', 'check-guardrails.sh');
    if (fs.existsSync(scriptPath)) {
      fs.chmodSync(scriptPath, 0o755);
    }
  } catch {}
  console.log(green('  ✓ Created scripts/check-guardrails.sh (Executable)'));

  // 4. Install Git Hook
  console.log(blue('\n> Configuring Git local self-protection...'));
  installGitHook(targetDir);

  console.log(cyan(bold('\n======================================================')));
  console.log(green(bold('  ✓ SPEC-DRIVEN AI-DLC INITIALIZATION COMPLETED!      ')));
  console.log(cyan(bold('======================================================\n')));

  console.log(bold('Next Steps:'));
  console.log(`  1. Create a new spec:      ${cyan('npx spec-driven-ai new JIRA-123')}`);
  console.log(`  2. Check your guardrails:  ${cyan('npx spec-driven-ai check')}`);
  console.log(`  3. Refer to:               ${cyan('.agents/rules/')} and ${cyan('.agents/workflows/')}\n`);
}

module.exports = { runInit };
