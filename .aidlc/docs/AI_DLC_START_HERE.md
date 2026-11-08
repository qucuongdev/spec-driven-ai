# Start Here

Copy AGENTS.md and hidden `.aidlc/` into the target project, preserving and merging existing instructions. Open your coding assistant and give it a Jira ticket link or pasted content. No separate bootstrap request is needed.

The bundled company default is autonomous Jira-to-GitHub pull-request delivery. It follows `.aidlc/workflows/ticket-autopilot.md`: gather accessible context, fill missing baseline docs, write spec/design/plan, tests and implementation, verify and prepare pr.md, then follow jira-to-github.md to publish/reuse a real PR, perform independent review/fix loops and inspect required CI. See COMPANY_ROLLOUT.md for one-time policy/access. Ask only for information or authorization that cannot safely be determined independently.

The assistant must load the bridge instructions. If the project already has AGENTS.md, preserve it and merge a short direction to `.aidlc/workflows/ticket-autopilot.md`, or mention that path once when starting. A hidden folder alone is not automatically discovered by every tool.

The assistant uses available authorized Jira/document tools; the standalone helper does not fetch Jira or run models. Private links need working access or pasted content. If Node/Git are unavailable, Markdown tracking is sufficient.

Coordinator alone dispatches `.aidlc/agents/` specialists when separate contexts are supported. See USER_GUIDE.md#multi-agent-collaboration for activation and truthful fallback; fallback preparation alone cannot satisfy independent company review. Prompts do not enforce filesystem permissions.

Reviewed mode is opt-in or repository-required. Existing records without mode stay reviewed; never manufacture human approval. Honor existing authorization for company branch push/PR/review; do not ask again for routine steps already in scope. Merge, deployment and Jira comments/status writes require separate authorization. Company completion needs real PR URL, exact current HEAD, required checks/review and no blockers; local helper completion cannot establish remote facts.

Read `.aidlc/rules/`, relevant `.aidlc/context/`, `.aidlc/workflows/ai-dlc.md` and USER_GUIDE.md. Keep artifacts in `.aidlc/specs/active/TICKET/`.
