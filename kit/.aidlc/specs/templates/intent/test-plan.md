# [TICKET_ID] — Test Strategy and Baseline

TODO: Map AC IDs to test files, cases and commands. Record the baseline and expected results. Declare test files in both allowedFiles and testFiles.

## Behavioral Failure, Characterization or Alternative
TODO: For bugs and new/changed business logic, derive UT from AC/spec before production implementation and run a valid behavioral red baseline. Record exact command, test paths, AC IDs, source revision, actual exits and assertion evidence. Coder then implements to green; independent auditor checks integrity. Characterization tests for refactoring may pass from the start. Not every new test must fail. Import/setup failures are not valid behavioral failure evidence. For genuinely nonautomatable cases, record concrete reason and alternative verification assessed by coordinator/auditor. Setup Units before baseline are runner/dependencies/test wiring only, never new business logic.

## Test Change Review
TODO: Explain and review changes to expectations, fixtures and configuration. Never remove tests or weaken assertions to hide defects. Incorrect tests should be corrected and reviewed rather than protected by an absolute directory lock.
