# Changelog

## 2.1.0 - Unreleased

### Review Corrections

- Make the latest verification attempt supersede older PASS evidence, including failed logging/result recording and interrupted attempts.
- Inspect Git changes without refreshing the real index; reject hidden index flags and unavailable registered submodules rather than reporting a false scope PASS.
- Refuse linked metadata paths and mismatched ticket identities before helper reads/writes.
- Preserve independent .agents/skills installations while still rejecting known legacy kit paths.
- Correct runnable commands and ownership guidance in the generated workflow visualization; retain its existing layout.
- Add adversarial regressions for these boundaries and give the timeout test's successful recovery its own explicitly planned execution budget.

### Company Jira/GitHub Delivery

- Add a concrete Jira-to-GitHub workflow and concise rollout guide: isolated ticket work, AC traceability, idempotent real PR reuse/publication, exact-HEAD independent review and current CI/review-fix loops.
- Add company policy inspection/offline readiness, additive mandatory verification commands, configuration-sensitive evidence and bounded verification shell invocation.
- Add review/delivery evidence templates and distinguish actual reviewed PR completion from local helper completion; preserve reviewed legacy behavior and generic local-draft compatibility.
- Preserve unrelated dirty work; cover committed changes from initially unborn repositories and real initialized submodule content recursively in scope/evidence.
- Keep merge/deploy/Jira writes separately authorized; label AI findings COMMENT and never forge human approval/self-approval. Fixture checks do not establish a live company delivery.

### Autonomous Ticket Workflow

- Default ticket-only autonomous local delivery: bootstrap context, plan, independent-role tests/code/review and a verified local PR draft.
- Distinguish agent observations/progress/revisions from actual human approvals; retain reviewed mode and legacy behavior.
- Record initial dirty worktree/index baseline for fresh copied kits, preserve user work and require current verification evidence.
- Coordinator-only delegation, explicit mixed-manifest/setup ownership and truthful unsupported-harness fallback.
- External publication/release remains separately authorized.

### Specialist Agents

- Add four portable specialist prompts (architect, qa-tester, coder, auditor), explicit stage owners, scoped artifact exceptions and independent handoffs.
- Document native subagent activation versus separate-session fallback; validate and mirror the agent registry without introducing provider folders into the payload.

## 2.0.0

- Prevent verification from overwriting a concurrent checkpoint change; serialize short state writes and replace JSON atomically.
- Isolate the optional helpers' CommonJS module type without modifying an ESM consumer's package.json.
- Require intact hashed verification logs at verify/PR checkpoints and reject mutating commands outside the target Git root.
- Reject source and output symlinks/junctions during ZIP packaging; add behavioral regressions and explicit packaging checks.

- Consolidate the portable payload into .aidlc/ with a thin root AGENTS.md bridge; relocate rules, workflows, context, specs and standalone helpers.
- Align lifecycle metadata/fingerprints, safe copy, ZIP packaging, strict bidirectional mirrors and disposable-repository tests with the single-folder layout.

- Adopt an AWS-inspired five-phase lifecycle, with 11 compact stages and feature/bugfix/refactor/express routes.
- Add reusable project business/technical context, ticket outputs, persistent state, checkpoint attestations and reopen history.
- Replace Markdown whitelist parsing with exact-path plan.json, including tests/dependencies, all-file budgets and branch/worktree scope checks.
- Record explicit verification commands, exits, logs and content/source-revision fingerprints; reject stale or self-modifying runs.
- Replace global test lockdown and universal must-fail rules with requirement-driven tests, characterization and reviewed test changes.
- Preserve existing files, hooks and agent instructions during init; add agent entry point, diagrams, packaged guides and migration instructions.

Breaking: v1 Markdown status/spec files are not lifecycle state. Migrate deliberately using .aidlc/docs/USER_GUIDE.md. This release is a compact adaptation, not the full AWS engine, and has not been published by this change.
