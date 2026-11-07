# Rule 02: Evidence and Test Integrity

- Derive tests from business rules and AC, not from the implementation's output alone.
- Bugfix: demonstrate a relevant failure before fixing when feasible. Feature: test missing behavior when feasible. Refactor: existing/characterization tests may pass from the outset. Record justified alternatives for cases unsuited to test-first.
- Not every new test must fail. Syntax/import/setup errors are not valid behavioral red evidence.
- Test files are editable when declared in allowedFiles and testFiles. Explain expectation changes and review them. Never weaken assertions, skip tests or suppress exit codes to claim success.
- Independent review is useful for risk; separate QA/Dev agents are optional. A different persona alone does not guarantee independence.
- Record real commands, exits, logs, baseline failures, manual checks, source state and limitations in both modes. Optional helper verification fingerprints current tracked/nonignored files plus plan/context; relevant edits/source commits require fresh verification. Markdown mode has no automated fingerprint enforcement.
- Keep generated output ignored where appropriate. The helper invalidates a run that changes nonignored repository files; it does not fingerprint ignored files, external services, linked documents, runtime versions or environment variables. Manual reviewers must assess source/environment changes themselves.
- Do not declare a PR verified merely because `check` passes. CI and required PR review remain authoritative; no zero-regression guarantee.
