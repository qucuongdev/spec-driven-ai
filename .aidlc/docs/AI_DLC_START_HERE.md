# Start Here: Portable AI-DLC Workflow Kit

This directory tree belongs in your project root. It is a set of editable files, not an installed plugin or package. No registration, account, package manager, dependency changes or Git hook installation is required.

## First Run

1. Preserve your project's existing instructions and documents. Merge conflicts deliberately; do not replace a real business document with a starter template.
2. Read AGENTS.md and .aidlc/workflows/bootstrap-project-context.md. If your assistant does not automatically read AGENTS.md, explicitly ask it to read these files.
3. Fill .aidlc/context/business/overview.md, glossary.md, rules.md and .aidlc/context/architecture/system.md using your actual sources. The responsible owner confirms the baseline.
4. Give your assistant the ticket link/content and select feature, bugfix, refactor or express. Follow .aidlc/workflows/ai-dlc.md.

Example request:

> Read AGENTS.md and the AI-DLC workflows. Bootstrap project context from our existing documentation and code. Identify assumptions for my review before implementing tickets. Use Markdown tracking; do not install dependencies or hooks.

For an existing baseline:

> Follow the AI-DLC workflow for JIRA-1024 using the bugfix profile. Read our project overview and relevant business rules, inspect the code, and prepare the spec and plan for review before implementation.

## Choose How to Track Work

- **Markdown:** use .aidlc/specs/templates/MANUAL_TRACKER.md and copy the relevant files from .aidlc/specs/templates/intent into .aidlc/specs/active/TICKET/. Run your project's normal checks and record actual outputs and human decisions. No Node.js is needed for the workflow itself.
- **Optional local helper:** with Node.js >=16 and Git, run `node .aidlc/tools/cli.js help` from your project root. The helper creates records, checks scope and records verification fingerprints. It uses only files copied with this kit, without installing anything.

Use one tracking mode per ticket. Markdown records are not automatically enforced or authenticated. The helper reads state.json; it does not infer approvals from Markdown. See USER_GUIDE.md for details and WORKFLOW.md for diagrams.
