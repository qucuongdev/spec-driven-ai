# [TICKET_ID] — Manual Workflow Tracker

Use this file as .aidlc/specs/active/TICKET/tracker.md when not using the optional helper. This is an evidence/decision record, not an automatically enforced state machine.

- Profile: TODO — feature / bugfix / refactor / express
- Current stage: TODO
- Ticket/source: TODO
- Delivery policy: TODO - pull-request (bundled company) / generic local draft
- Baseline source revision: TODO
- Mode: TODO - autonomous (default) / reviewed
- Baseline observation/acknowledgement: TODO - agent observation and sources, or actual human decision in reviewed mode

## Stage Route

- feature: context → framing → discovery → requirements → plan → tests → implement → verify → pr → deploy → feedback
- bugfix/refactor: omit framing
- express: context → requirements → plan → tests → implement → verify → pr

Copy the relevant stage outputs from .aidlc/specs/templates/intent. Replace [TICKET_ID] in the copies. Follow the same scope, test integrity and mode-appropriate decision rules as helper mode.

## Checkpoints

| Stage | Outputs / Source Revision | Agent / Actual Human (reviewed) | Decision and Source | Date | Valid / Superseded |
| --- | --- | --- | --- | --- | --- |
| context | TODO | TODO | TODO | TODO | TODO |

Do not invent approvals. Mark downstream decisions superseded when approved inputs change, reopen the affected stage and record fresh agent decisions, or actual human decisions in reviewed mode. Baseline changes require a new observation/acknowledgement and context revision.

## Verification Evidence

| AC / Check | Exact Command or Manual Procedure | Source Revision / Working Changes | Exit / Result | Evidence Path | Limitations |
| --- | --- | --- | --- | --- | --- |
| TODO | TODO | TODO | TODO | TODO | TODO |

Run the project's real commands. Preserve logs without secrets. Reverify after relevant source or environment changes. A manually written PASS is not an automated receipt; reviewers must assess the evidence.

## Scope and Review

Record exact allowed files, test/dependency changes, the file budget and verification commands in plan.json; use design.md for rationale. Review Git changes against that plan manually, including staged, unstaged, untracked and branch changes. Do not claim that helper-only hash or stale-evidence checks ran.

## PR and Operations

For company pull-request delivery copy review.md/delivery.md templates as evidence reports. Record actual PR URL, matching latest source HEAD, mandatory local/CI results, independent review and required reviewer outcomes with no blocking findings. A local pr.md/helper stage completion is insufficient. Pending access/CI/review remains PENDING/BLOCKED. Generic local-draft policy may stop at verified pr.md. Honor existing PR workflow authorization; merge/deploy/Jira writes need separate explicit authorization.
