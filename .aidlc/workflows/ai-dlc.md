# Workflow: AI-DLC from Project Context to PR and Operations

This is a portable adaptation of AWS AI-DLC, not the original AWS engine. Read the rules first. Choose Markdown tracking or the optional local helper for each ticket; neither requires package installation or plugin registration. Resume from tracker.md in Markdown mode, or `node .aidlc/tools/cli.js status TICKET` in helper mode. Never invent approvals.

In Markdown mode, copy .aidlc/specs/templates/MANUAL_TRACKER.md to .aidlc/specs/active/TICKET/tracker.md and copy the applicable stage outputs from .aidlc/specs/templates/intent. Record actual decisions, source revisions and command results manually. No state.json or helper commands are required. When approved inputs change, mark downstream decisions superseded, reopen the affected stage and reverify. The helper commands below apply only to helper mode; see .aidlc/docs/USER_GUIDE.md for both modes.

1. Bootstrap project context: document the business overview, glossary, rules and architecture. Have the responsible owner acknowledge the baseline.
2. Intake: capture the actual ticket link or content and select feature, bugfix, refactor or express. Create a manual record or use the optional helper's `new` command. Records may precede baseline acknowledgement, but checkpoints cannot advance without it.
3. context: load the project overview and read the relevant domain references. Check sources and unresolved questions. Run `context --by ... --note ...` on someone's behalf only when they have authorized it and supplied the actual decision.
4. framing (feature): clarify the business goal, feasibility, scope and decisions requiring human input.
5. discovery (except express): inspect existing code, establish the baseline and assess the impact of the change. For greenfield work, record N/A with a reason.
6. requirements: define the specification, acceptance criteria (AC), business rule IDs, contracts and invariants. Resolve business questions that would block implementation.
7. plan: produce an appropriately detailed design, Units and dependencies. Set exact paths, maxFiles and verificationCommands in plan.json. Explain test and dependency changes. Record the plan checkpoint before changing code.
8. tests: define the test strategy and relevant baseline checks. Prefer a valid behavioral failure for bug fixes; use characterization tests for refactoring. Do not require every new test to fail.
9. implement: implement, verify and record each Unit. Avoid unrelated changes. Reviewers acknowledge Unit checkpoints in implementation.md; the CLI does not schedule Units.
10. verify: run the planned project commands and retain actual logs/results. In helper mode, use `verify TICKET --command "..."` to record exits and fingerprints. In Markdown mode, record the source revision and working changes manually without claiming hash enforcement. Review the complete diff, test quality and AC mapping. Complete verification.md.
11. pr: create a real PR using an authorized tool and complete pr.md. Follow the repository's CI and review policy. Source commits invalidate verification, so verify the final source revision before the checkpoint; commits containing only the ticket record do not invalidate it. Use Draft status when verification is incomplete. Do not merge automatically.
12. deploy/feedback (except express): proceed after the release decision. Record deployment evidence, operational results, lessons and knowledge updates. Work may remain at the PR stage while awaiting review or release.

Each stage requires complete outputs and an actual human checkpoint. Record it in tracker.md or use the optional helper's `advance TICKET --by "..." --note "..."`. Neither mode authenticates identity. Reopen a stage when approved outputs change; supersede downstream decisions and verification. Git history and PR review remain team controls.

See `.aidlc/docs/WORKFLOW.md` for diagrams and the AWS mapping, and `.aidlc/docs/USER_GUIDE.md` for commands.
