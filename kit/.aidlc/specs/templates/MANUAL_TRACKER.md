# [TICKET_ID] — Manual Workflow Tracker

Use this file as .aidlc/specs/active/TICKET/tracker.md when not using the optional helper. This is a human-reviewed record, not an automatically enforced state machine.

- Profile: TODO — feature / bugfix / refactor / express
- Current stage: TODO
- Ticket/source: TODO
- Baseline source revision: TODO
- Baseline acknowledgement: TODO — actual reviewer, decision, source and date

## Stage Route

- feature: context → framing → discovery → requirements → plan → tests → implement → verify → pr → deploy → feedback
- bugfix/refactor: omit framing
- express: context → requirements → plan → tests → implement → verify → pr

Copy the relevant stage outputs from .aidlc/specs/templates/intent. Replace [TICKET_ID] in the copies. Follow the same scope, test integrity and human checkpoint rules as helper mode.

## Checkpoints

| Stage | Outputs / Source Revision | Actual Reviewer | Decision and Source | Date | Valid / Superseded |
| --- | --- | --- | --- | --- | --- |
| context | TODO | TODO | TODO | TODO | TODO |

Do not invent approvals. Mark downstream decisions superseded when approved inputs change, reopen the affected stage and obtain fresh decisions. Baseline changes require context review again.

## Verification Evidence

| AC / Check | Exact Command or Manual Procedure | Source Revision / Working Changes | Exit / Result | Evidence Path | Limitations |
| --- | --- | --- | --- | --- | --- |
| TODO | TODO | TODO | TODO | TODO | TODO |

Run the project's real commands. Preserve logs without secrets. Reverify after relevant source or environment changes. A manually written PASS is not an automated receipt; reviewers must assess the evidence.

## Scope and Review

Record exact allowed files, test/dependency changes, the file budget and verification commands in plan.json; use design.md for rationale. Review Git changes against that plan manually, including staged, unstaged, untracked and branch changes. Do not claim that helper-only hash or stale-evidence checks ran.

## PR and Operations

Record the actual PR URL, CI/review status, release decision and operational evidence in the corresponding outputs. Do not create, merge or deploy without the appropriate authorization.
