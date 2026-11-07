# Portable AI-DLC User Guide

## Copy and Start

Copy this kit's contents into the target repository root, including the hidden .aidlc directory and the root AGENTS.md bridge. Preserve existing instructions, business documents and templates; merge conflicts before proceeding. Start with AI_DLC_START_HERE.md. There is no package installation, plugin registration or init step, and no Git hook is installed.

The workflow itself uses Markdown and the project's normal development tools. Optional helpers live under .aidlc/tools and need Node.js >=16 and Git. They do not require the original source repository, a project-level package.json, npm or network access. The bundled .aidlc/tools/package.json only declares a private CommonJS module boundary, so the helpers also run inside ESM projects without changing the project's manifest. It contains no dependencies or install scripts.

Run helper commands from the target Git repository root. Mutating commands reject a nested directory or a non-Git directory before writing files; `new` may still run before the first commit after `git init`.

Commit kit setup and baseline documents separately before starting a ticket so setup files are not counted as ticket changes. Helper check/verify require at least one Git commit. A helper record created before the first commit has no baseCommit; use check --base REF for the appropriate branch comparison.

## Business Context First

Follow .aidlc/workflows/bootstrap-project-context.md. Complete .aidlc/context/business/overview.md, glossary.md, rules.md and .aidlc/context/architecture/system.md using actual sources. Distinguish confirmed, inferred and unknown information and assign owners. Code demonstrates current behavior, not necessarily intended business behavior. Resolve questions affecting the ticket before implementation.

The owner acknowledges the baseline. In Markdown mode, record the actual reviewer, decision, date and source revision in the tracker. In helper mode:

```sh
node .aidlc/tools/cli.js context
node .aidlc/tools/cli.js context --by "Actual reviewer" --note "Decision and confirming source"
```

Names are local attestations, not authenticated identities. Agents must not invent names or decisions. The helper detects incomplete placeholders and changed hashes, not business correctness. Review linked sources separately because baseline hashes cover only four local files.

## Choose One Tracking Mode per Ticket

### Markdown Mode — No Helper Required

1. Create .aidlc/specs/active/TICKET/ and copy .aidlc/specs/templates/MANUAL_TRACKER.md into it as tracker.md.
2. Choose feature, bugfix, refactor or express using WORKFLOW.md. Copy the required stage outputs from .aidlc/specs/templates/intent and replace [TICKET_ID] in those copies.
3. Record the initial source revision, current stage, actual checkpoint decisions and verification evidence in tracker.md.
4. Follow .aidlc/workflows/ai-dlc.md. Complete the required output and receive the actual human decision before moving forward.
5. Review source changes against plan.json manually. Record exact commands, outputs, limitations and revisions; do not claim helper hash checks were performed.

Markdown tracking is a review process, not an automated enforcement mechanism. No state.json is needed. Reopen changed work by marking downstream decisions superseded, revising the affected stage and obtaining fresh decisions.

### Optional Helper Mode

```sh
node .aidlc/tools/cli.js new JIRA-1024 --profile bugfix
node .aidlc/tools/cli.js status JIRA-1024
node .aidlc/tools/cli.js advance JIRA-1024 --by "Actual reviewer" --note "Reviewed the outputs and assumptions"
```

The helper creates .aidlc/specs/active/JIRA-1024/ with outputs and state.json, recording HEAD as baseCommit. check includes branch changes since that revision and current staged, unstaged and nonignored untracked files. Specify a ticket when multiple records are active. Do not batch checkpoint commands to manufacture approvals or edit state/receipts manually.

The helper does not read Jira. Provide the real ticket link/content through an authorized connector or as text. It does not infer approvals from Markdown. When moving from manual tracking to helper mode, preserve the original record, create a fresh helper record and explicitly review/reverify the relevant work. Do not manufacture JSON receipts from notes.

## Plan Before Implementation

Complete design.md with Units/dependencies, contracts, trade-offs and rollout/rollback. Small tasks may use one Unit. Both modes use plan.json, for example:

```json
{
  "allowedFiles": ["src/coupon.js", "tests/coupon.test.js"],
  "testFiles": ["tests/coupon.test.js"],
  "dependencyFiles": [],
  "maxFiles": 2,
  "verificationCommands": ["npm test"]
}
```

The example command is for a Node project; use the target project's actual tools, such as pytest, dotnet test or Maven. The kit does not add an npm dependency to that project.

Use exact relative paths, not globs. Test/dependency files must be in allowedFiles and the corresponding declaration. maxFiles counts every changed file outside the current ticket record, including tests/docs. Default 10 is adjustable with rationale at the plan checkpoint. Shared rules, documentation, templates and other tickets are not exempt. Explain dependency packages/versions in design; helper enforcement checks file scope only.

## Tests, Implementation and Verification

Map AC to relevant tests. Prefer assertion-based reproduction for bugs; test missing feature behavior when practical. Characterization tests for refactoring may pass initially. Import/setup failures are not valid behavioral failure evidence. Test changes require declared scope, rationale and review. Do not skip tests or weaken assertions to hide defects. Record Unit checkpoints in implementation.md.

In Markdown mode, run normal project commands, preserve evidence and review the entire diff against the plan. Record results and source state in the tracker and verification.md. Relevant source/environment changes require reverification.

In helper mode:

```sh
node .aidlc/tools/cli.js check JIRA-1024
node .aidlc/tools/cli.js verify JIRA-1024 --command "npm test"
```

verify is available at implement/verify/pr after a valid plan checkpoint. The command must exactly match verificationCommands. Commands run explicitly through the platform shell with current privileges, never automatically from a ticket/document. Review commands and keep secrets out of logs. The helper stores logs, exits, timestamps and fingerprints.

State files are replaced atomically. Checkpoint changes and verification-result writes use a short per-ticket .state.lock; the lock is not held while a verification command runs. If someone reopens or advances the ticket during that command, verification returns nonzero, retains the command log and does not overwrite the newer state or record a successful receipt. Complete the newly required checkpoints and rerun. If another writer is active, retry after it finishes. After a process crash, remove a leftover lock only after confirming that no writer is running; never remove an active writer's lock.

Both verify and PR checkpoints require the verification log to exist and match the receipt's SHA-256 outputDigest. Deleted, modified or linked logs do not satisfy a checkpoint. Restore the exact evidence or rerun the planned command instead of editing a receipt to bypass the check.

The verify/pr checkpoints require every planned command to succeed against the current fingerprint. A command that changes nonignored files invalidates its run; review the generated files and rerun on a stable tree. Source commits/content changes require reverification; commits containing only the ticket record do not. Ignored files, environment/runtime details, external services and linked URL contents are not fingerprinted. check does not run tests or provide a security sandbox. Renames include both source and destination; --base origin/main overrides baseCommit without fetching.

## PR and Operations

Review the complete diff and finish verification.md. Use authorized Git/GitHub tools to commit, push and create a real PR. Record its actual URL, CI/review results and risks in pr.md. In helper mode, verify the final source commit before the pr checkpoint. If PR creation is not authorized, stay at pr and record the blocker. Neither mode creates PRs or validates CI automatically.

Feature/bugfix/refactor continue through deploy/feedback after the release decision; express ends at PR. Record actual operational evidence. Do not merge or deploy without authorization. Archive completed records only after checking the source and destination paths. Follow team CI/review requirements; no mode guarantees zero regressions.

## Reopen Work

In Markdown mode, mark downstream decisions superseded and record the reason. In helper mode:

```sh
node .aidlc/tools/cli.js reopen JIRA-1024 --stage plan --by "Actual reviewer" --note "Add regression tests to scope"
```

Reopen retains history and logs but invalidates downstream checkpoints and clears current verification receipts. Update outputs, obtain new decisions and reverify. Changed business baselines require acknowledgement and reopening context.

## Updating an Existing Setup

Preserve existing specs, ADRs and customizations in version control. Compare kit files with the target project and merge changes deliberately. The optional copy script preserves existing files; it is not an upgrade/merge engine. Remove an older npm-based checker from hooks only after reviewing the existing hook and agreeing on a replacement. This kit installs no hooks.

Existing v2 JSON records retain the same schema, but their paths and verification fingerprints change. Before migrating, preserve the original records and baseline documents in version control. Move the old specs tree into .aidlc/specs, docs/business into .aidlc/context/business and docs/architecture into .aidlc/context/architecture. Resolve destination conflicts before moving; never overwrite existing records. Update exact plan paths and reopen the affected plan/context stages with a real reviewer decision, then reverify. Old path-based approvals and verification fingerprints are not valid after relocation. This copy helper does not migrate an existing installation automatically. Legacy Markdown status labels are not JSON receipts: retain the original records and explicitly review/reverify work when adopting helper mode. The helper uses .aidlc/specs/templates/intent/*. SPEC_TEMPLATE.md is a compatibility pointer; use LIVING_ADR_TEMPLATE.md for material architecture decisions.
