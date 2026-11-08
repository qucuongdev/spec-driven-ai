# Company Rollout: Jira + GitHub

Copy **AGENTS.md and hidden .aidlc/** into the target company repository; preserve existing instructions and merge conflicts. If AGENTS.md already exists, merge a short direction to `.aidlc/workflows/ticket-autopilot.md` or mention that path once. Hidden-folder discovery is not automatic in every tool.

After the one-time repository setup, the developer's normal request is:

> Implement JIRA-1024: [Jira link or pasted ticket].

Coordinator follows jira-to-github.md: fetch accessible ticket/AC, preserve and isolate work, bootstrap context, architect -> QA -> coder -> independent auditor, real tests, real PR, CI and review/fix loops. Ordinary stages do not need user confirmation. Independent review and actual required CI/review policy must be satisfied before claiming company delivery complete. Missing essential access, material ambiguity or unresolved policy is reported precisely; PR publication alone is not completion.

UT comes before production logic: QA derives tests from AC/spec and records valid behavioral red (command, test paths, AC, source state) before coder implements to green and independent review. Setup before QA is runner/dependencies/test wiring only, never business logic. Refactor characterization may pass initially; genuinely unautomatable cases need a concrete reason and alternative assessed by coordinator/auditor, without routine user approval.

## One-time policy and access

`.aidlc/company.json` is ordinary reviewed project configuration, not credentials or an access grant. The bundled policy uses Jira + GitHub, autonomous feature workflow and pull-request delivery, with merge/deploy human-owned. Populate only verified settings:

| Setting | Meaning |
| --- | --- |
| organization.name | Company display name; null is an unknown label, not invented context |
| organization.ticketSystem / repositoryHost | jira / github |
| workflow.defaultMode / defaultProfile | autonomous / feature; reviewed remains available when policy requires human stages |
| repository.baseBranch | Actual target branch; derive from company/repository sources when null, never assume main |
| quality.requiredCommands | Exact mandatory commands, additive to each ticket's plan |
| quality.verificationTimeoutMs | Shell-invocation budget, bundled 600000 ms |
| quality.maxOutputBytes | Captured-output budget, bundled 10485760 bytes |
| delivery.mode | pull-request for company completion; generic helper without company config retains local-draft compatibility |
| delivery.merge / deploy | human / human; never implicit merge/deploy authorization |

Use `node .aidlc/tools/cli.js policy` to inspect effective local settings and `doctor [TICKET]` for offline readiness. Warnings about unknown company/base/commands are prompts to inspect authorized repo sources, not manufactured answers. doctor does not verify credentials, remote CI or reviewer access. Changing effective configuration invalidates previous verification evidence. Timeout is not a process-tree sandbox.

The assistant needs available authorized Jira content access (or pasted text), GitHub/Git access to the correct repository, permitted branch push/PR/review COMMENT operations and readable CI/review results. Configure native separate agent contexts and permission scopes where supported; no provider adapter or OS sandbox is bundled. A single-context fallback may prepare changes but cannot claim independent review. Repository-required human approvals remain real human approvals.

Preserve existing company policy. Ordinary feature/bugfix work may fill unknown settings or add checks from authoritative repository sources during bootstrap, but must not remove/reduce known mandatory commands, independent/human review requirements or branch protections, or delete company.json to make checks pass. Reducing known requirements needs explicit policy-owner authorization in a separately scoped policy change; autonomous replanning is not that authorization. Missing-file compatibility is for generic/legacy use, never permission to bypass an existing policy. Runtime defaults select new tickets only and do not silently change existing record modes. Actual protected-branch/required-review enforcement remains server-side, not a CLI guarantee.

## Observable completion

Records in .aidlc/specs/active/TICKET/ retain AC/spec/plan, test results, exact source HEAD, pr.md, independent review.md and delivery.md. Final handoff contains a real PR URL, current matching head SHA, required-check results and independent-review evidence, with no blocking findings. Retry logic reuses the existing PR for the same repository/base/head; no duplicate PR.

Pending/unavailable CI, required human approval or blocked access remains PENDING/BLOCKED. Never substitute localDeliveryComplete, an AI COMMENT, a fabricated APPROVE or a PR draft file for actual company-policy evidence. Merge, deployment and Jira comments/status updates require separate explicit authorization. This kit installation does not itself create a company PR or demonstrate an end-to-end run.
