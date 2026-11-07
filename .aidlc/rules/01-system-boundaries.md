# Rule 01: Context, Scope and Checkpoints

User authorization and repository-specific instructions take precedence over these defaults.

- Business context comes before the first ticket checkpoint. Read overview/glossary/rules and the relevant domain sources; inspect code before planning. Distinguish confirmed business intent from inferred existing behavior.
- Use the current ticket record under .aidlc/specs/active/TICKET. Only edit the exact files in acknowledged plan.json during implementation. Metadata for that ticket is separate; rules, shared docs and other tickets are not blanket exemptions.
- maxFiles counts all changed non-record files, including tests/docs. Default 10 is adjustable with rationale at plan checkpoint; there is no universal 3–5-file law.
- Dependency changes require exact files in both allowedFiles and dependencyFiles, with package/version/reason in design. Do not change dependencies just to work around unexplained failures.
- Preserve the project's actual architecture and contracts. Avoid unrelated formatting/refactors, secrets and unnecessary sensitive logs.
- The portable workflow uses Markdown tracking or optional local helpers. Review scope manually in Markdown mode. Helper `check` validates declared scope and `verify` runs explicit commands; neither proves absence of regressions or provides identity authentication or a security sandbox. The kit installs no hooks.
- Do not manufacture completion in either mode. Humans supply actual checkpoint decisions. In helper mode, never edit state.json, context receipts or logs to bypass checks or invent by/note values. In Markdown mode, preserve actual decisions and mark superseded entries explicitly. Reopen changed approved artifacts and invalidate downstream decisions.
- Never automatically revert others' changes or drop data when a check fails. Diagnose and repair within authorized scope.
