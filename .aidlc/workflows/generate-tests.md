# Workflow: Tests

[Owner: qa-tester] Load .aidlc/agents/qa-tester.md; source is read-only. Test edits require both allowedFiles and testFiles; test-plan.md is the only report exception.

Run after the plan checkpoint, following ai-dlc.md and company jira-to-github.md when applicable. Retain AC traceability and mandatory company commands, not just a narrow test subset.

- Map acceptance criteria to test cases, files and commands in test-plan.md. Confirm the files are already declared in both allowedFiles and testFiles. Return missing declarations to architect/coordinator for a plan reopening; QA must not edit plan.json.
- For new or changed business logic and bugfixes, derive unit tests from AC/spec before production implementation and run a valid behavioral red baseline first. Record exact command, test paths, AC mapping, source revision and dirty state, actual exit and assertion-failure evidence in test-plan.md. Syntax/import/fixture/setup failures are not behavioral red. Coder then implements to green and auditor independently checks test integrity and results; never derive expectations from coder output just to pass. Refactor characterization may pass before changes. For genuinely unautomatable cases, document the concrete reason and alternative verification for coordinator/auditor assessment, without a routine user approval gate. A narrow pre-QA setup Unit may change runner/dependencies/test wiring only and must not implement new business logic.
- Cover relevant happy paths, boundaries, failure modes and invariants. Do not impose concurrency or performance tests on unrelated tasks.
- Import and setup failures do not demonstrate missing behavior. Do not force a passing test to fail.
- Review assertions, fixtures and changes to expected results. Never skip tests or weaken assertions to hide a defect. Incorrect tests may be corrected with a documented reason and review.
- Record results and return to coordinator for autonomous progress, or the actual human decision in reviewed mode. Do not invent approval. Use a separate QA context; if native subagents are unavailable, disclose the actual separate-session or single-context fallback. Coder must return incorrect tests to QA instead of editing them.

Missing shared manifests/dev dependencies are handled by a narrow planned coder setup Unit during tests; QA reruns a valid behavioral baseline after setup. QA never edits mixed manifests itself. Specialists never delegate.
