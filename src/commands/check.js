// src/commands/check.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { bold, green, cyan, yellow, blue, red, dim } = require('../utils/colors');

const FORBIDDEN_DEPENDENCIES = new Set([
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'requirements.txt',
  'Pipfile',
  'Pipfile.lock',
  'poetry.lock',
  'pyproject.toml',
  'pom.xml',
  'build.gradle',
  'go.mod',
  'go.sum',
  'Cargo.toml',
  'Cargo.lock'
]);

function getGitStatus(cwd) {
  try {
    const output = execSync('git status --porcelain=v1', { cwd, encoding: 'utf8' });
    if (!output.trim()) return [];

    return output
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line.length >= 3)
      .map((line) => {
        // Format of git status --porcelain=v1:
        // XY filename or XY orig -> new
        let filePath = line.substring(3).trim();
        if (filePath.includes(' -> ')) {
          filePath = filePath.split(' -> ')[1].trim();
        }
        // Strip surrounding quotes if Git wrapped filename in quotes
        filePath = filePath.replace(/^"|"$/g, '');
        return filePath.replace(/\\/g, '/');
      });
  } catch {
    console.error(red('\n[ERROR] Not inside a Git repository or Git is not installed.'));
    process.exit(1);
  }
}

function findActiveSpec(targetDir, specArg) {
  if (specArg && fs.existsSync(path.resolve(targetDir, specArg))) {
    return path.resolve(targetDir, specArg);
  }

  const activeDir = path.join(targetDir, 'specs', 'active');
  if (!fs.existsSync(activeDir)) {
    return null;
  }

  const files = fs.readdirSync(activeDir);
  const specFiles = files.filter(
    (f) => f.endsWith('.md') && f !== 'SPEC_INCONSISTENCY_REPORT.md'
  );

  if (specFiles.length > 0) {
    return path.join(activeDir, specFiles[0]);
  }

  return null;
}

function parseSpec(specPath) {
  if (!specPath || !fs.existsSync(specPath)) {
    return { status: 'UNKNOWN', maxBudget: 5, whitelist: [] };
  }

  const content = fs.readFileSync(specPath, 'utf8');
  const lines = content.split('\n');

  let status = 'UNKNOWN';
  let maxBudget = 5;
  const whitelist = [];

  const statusMatch = content.match(/status:\s*"?([A-Z_]+)"?/i);
  if (statusMatch) {
    status = statusMatch[1].trim().toUpperCase();
  }

  const budgetMatch = content.match(/max_file_touch_budget:\s*(\d+)/i);
  if (budgetMatch) {
    maxBudget = parseInt(budgetMatch[1], 10);
  }

  let inWhitelist = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/^##\s+4\.\s+FILE WHITELIST/i.test(line) || /^###\s+4\.1/i.test(line)) {
      inWhitelist = true;
      continue;
    }

    if (inWhitelist && /^##\s+[5-9]\./i.test(line)) {
      inWhitelist = false;
      break;
    }

    if (inWhitelist) {
      let extracted = '';
      if (line.includes('`')) {
        const match = line.match(/`([^`]+)`/);
        if (match) extracted = match[1].trim();
      } else {
        // Support bullet list: "1. src/path/file.ts" or "- src/path/file.ts"
        const bulletMatch = line.match(/^(\d+\.|\*|-)\s+([^\s\-#]+)/);
        if (bulletMatch) extracted = bulletMatch[2].trim();
      }

      if (extracted) {
        extracted = extracted.replace(/\\/g, '/');
        if (
          !extracted.includes('**') &&
          !/^(npm|pip|yarn|pnpm|git)/i.test(extracted) &&
          !extracted.startsWith('#')
        ) {
          whitelist.push(extracted);
        }
      }
    }
  }

  return { status, maxBudget, whitelist };
}

function isTestFile(filePath) {
  return (
    filePath.startsWith('tests/') ||
    filePath.startsWith('test/') ||
    filePath.startsWith('__tests__/') ||
    /\.(test|spec)\.[a-zA-Z0-9]+$/i.test(filePath) ||
    /_test\.go$/i.test(filePath)
  );
}

function runCheck(specArg, targetDir = process.cwd()) {
  console.log(cyan(bold('\n======================================================')));
  console.log(cyan(bold('  SPEC-DRIVEN AI-DLC: GUARDRAIL ENFORCEMENT           ')));
  console.log(cyan(bold('======================================================\n')));

  const specPath = findActiveSpec(targetDir, specArg);
  if (!specPath) {
    console.log(yellow('[WARNING] No active spec found in "specs/active/".'));
    console.log(yellow('          Checking general boundary rules only...\n'));
  }

  const { status, maxBudget, whitelist } = parseSpec(specPath);

  if (specPath) {
    console.log(blue(`> Active Spec:    ${bold(path.relative(targetDir, specPath))}`));
    console.log(blue(`> Status:         ${bold(status)}`));
    console.log(blue(`> Max File Touch: ${bold(maxBudget)}`));
    console.log(blue(`> Allowed Whitelist (${whitelist.length} files):`));
    whitelist.forEach((w) => console.log(green(`    ✓ ${w}`)));
    console.log('');
  }

  const changedFiles = getGitStatus(targetDir);

  if (changedFiles.length === 0) {
    console.log(green('✓ Clean working tree. No modified or untracked files found.'));
    console.log(cyan(bold('\n======================================================\n')));
    process.exit(0);
  }

  console.log(blue(`> Inspecting ${changedFiles.length} modified/staged file(s):\n`));

  let violations = 0;
  let logicCount = 0;

  for (const file of changedFiles) {
    // 1. Ignore metadata and spec files
    if (
      file.startsWith('specs/') ||
      file.startsWith('.agents/') ||
      file.startsWith('scripts/check-guardrails')
    ) {
      console.log(`  ${dim('[METADATA]')} ${file}`);
      continue;
    }

    const baseName = path.basename(file);

    // 2. Check forbidden dependency manifests
    if (FORBIDDEN_DEPENDENCIES.has(baseName)) {
      if (!whitelist.includes(file)) {
        console.log(red(`  [VIOLATION - DEPENDENCY FREEZE] Unauthorized manifest change: ${bold(file)}`));
        console.log(red('    -> Dependencies are locked. You cannot modify manifests without spec authorization.'));
        violations++;
        continue;
      }
    }

    // 3. Check tests directory lockdown during implementation
    if (isTestFile(file)) {
      if (
        status === 'TESTS_GENERATED' ||
        status === 'IMPLEMENTING' ||
        status === 'VERIFIED'
      ) {
        console.log(red(`  [VIOLATION - ADVERSARIAL TESTING] Unauthorized test edit: ${bold(file)}`));
        console.log(red(`    -> tests/ is LOCKED (Status: ${status}). Dev Agent is prohibited from altering tests.`));
        violations++;
        continue;
      } else {
        console.log(`  ${cyan('[QA PHASE TEST]')} ${file}`);
        continue;
      }
    }

    // 4. Check business logic against File Whitelist
    logicCount++;
    if (whitelist.length > 0) {
      if (!whitelist.includes(file)) {
        console.log(red(`  [VIOLATION - OUTSIDE WHITELIST] File not in whitelist: ${bold(file)}`));
        console.log(red('    -> Entire repository is Read-only except files explicitly registered in Spec Section 4.'));
        violations++;
      } else {
        console.log(green(`  ✓ [WHITELIST OK] ${file}`));
      }
    } else {
      console.log(yellow(`  ? [UNKNOWN WHITELIST] ${file}`));
    }
  }

  // 5. Check touch budget
  console.log(blue(`\n> Business logic file count: ${logicCount} / ${maxBudget} (Allowed)`));
  if (logicCount > maxBudget) {
    console.log(red(`  [VIOLATION - ATOMIC PR] Modified file count (${logicCount}) exceeds budget (${maxBudget})!`));
    console.log(red('    -> Break down this task into smaller Micro-Specs to prevent regression risks.'));
    violations++;
  }

  // Final summary
  console.log(cyan(bold('\n======================================================')));
  if (violations > 0) {
    console.log(red(bold(`❌ FAILED: Found ${violations} guardrail violation(s)!`)));
    console.log(red('Revert unapproved modifications (git checkout / git restore) before proceeding.\n'));
    process.exit(1);
  } else {
    console.log(green(bold('✅ PASSED: All modifications strictly comply with Spec & Guardrails!')));
    console.log(green('Code is verified and ready for the next step or PR merge.\n'));
    process.exit(0);
  }
}

module.exports = { runCheck };
