# Coding Agent Entry Point

The AI-DLC kit is contained in `.aidlc/`; run commands from the project root.

1. Start with `.aidlc/docs/AI_DLC_START_HERE.md`.
2. Read both rules in `.aidlc/rules/` before planning or implementing tickets.
3. Follow `.aidlc/workflows/bootstrap-project-context.md` for a new baseline.
4. Read business context in `.aidlc/context/business/` and relevant sources.
5. Read the technical overview in `.aidlc/context/architecture/system.md`.
6. Follow `.aidlc/workflows/ai-dlc.md` for the selected ticket profile.
7. Keep ticket records in `.aidlc/specs/active/`; templates are in `.aidlc/specs/templates/`.
8. Use `.aidlc/docs/USER_GUIDE.md` for commands and `.aidlc/docs/WORKFLOW.md` for diagrams.

Choose Markdown tracking or the optional `node .aidlc/tools/cli.js status TICKET` helper.
Respect repository instructions and explicit user authorization, including framework maintenance.
Humans supply checkpoint decisions; never invent approvals, verification or deployment evidence.
Reopen affected stages when approved artifacts change; run actual checks and report limitations.
Do not install dependencies/hooks, push, merge, send messages or deploy without authorization.
