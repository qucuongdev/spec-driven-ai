# Workflow: Tests

Run after the plan checkpoint, following ai-dlc.md.

- Map acceptance criteria to test cases, files and commands in test-plan.md. Declare the files in allowedFiles and testFiles.
- Establish a baseline before implementation. Prefer an assertion reproducing a bug; characterization tests for refactoring may pass from the start. Test missing feature behavior when feasible and explain alternatives when test-first is impractical.
- Cover relevant happy paths, boundaries, failure modes and invariants. Do not impose concurrency or performance tests on unrelated tasks.
- Import and setup failures do not demonstrate missing behavior. Do not force a passing test to fail.
- Review assertions, fixtures and changes to expected results. Never skip tests or weaken assertions to hide a defect. Incorrect tests may be corrected with a documented reason and review.
- Record results and request the actual human checkpoint decision. Do not invent approval. A separate QA subagent is not required for every ticket.
