# Workflow: Implement and Verify

- Check the Markdown tracker or helper status, baseline context, the spec, design and plan checkpoint.
- Implement one verifiable Unit at a time. Keep changes relevant to the ticket and within allowedFiles, testFiles, dependencyFiles and maxFiles.
- Record Unit checkpoints, commands/results and AC mapping in implementation.md. Explain and review test changes.
- If approved scope, requirements or design must change, reopen the corresponding stage and obtain new downstream decisions. Do not edit state or receipts manually.
- Run the project's real verification commands, retain evidence and review the entire diff against plan.json. In helper mode, use `check TICKET` and each approved `verify TICKET --command "..."`; in Markdown mode, record source state and results in tracker.md. Complete verification.md.
- Commit, push and create a PR when authorized. Reverify when the source fingerprint changes. Complete pr.md with the real PR URL, CI results, risks and rollout/rollback details.
- Never automatically revert or delete another person's changes when a check fails. Diagnose the issue, fix the part within scope or report the blocker.
