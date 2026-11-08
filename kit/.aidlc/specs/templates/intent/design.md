# [TICKET_ID] — Design and Delivery Plan

TODO: Describe the approach, alternatives, trade-offs, interfaces/contracts, domain model and relevant NFRs. Small tasks may need only a few sentences; do not impose a new architecture on existing code unnecessarily.

## Units and Checkpoints
TODO: Define verifiable implementation slices, dependencies and execution order. The first Unit should be the smallest useful integrated slice. A single Unit is valid.

## Scope and Verification
TODO: Explain each file and maxFiles in plan.json, reasons for dependency/test changes, verification commands (including additive company requiredCommands), existing failures, actual base/reviewer conventions and exact-HEAD independent review needs. Use exact paths, not globs. Reopen plan when changing an decided plan.

## Delivery
TODO: Describe migrations, rollback, feature flags, monitoring and the PR plan. Explain any N/A entries. Create an ADR only for an architectural decision worth preserving.

## File Ownership and Setup
TODO: Assign dedicated tests/fixtures/config to QA and application/mixed manifests to coder. Declare shared setup files in allowedFiles/dependencyFiles. If tooling is missing, plan a narrow coder setup Unit during tests followed by QA baseline; setup errors are not behavioral red evidence.
