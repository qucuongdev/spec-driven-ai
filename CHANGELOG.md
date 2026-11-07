# Changelog

## 2.0.0 — Unreleased

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
