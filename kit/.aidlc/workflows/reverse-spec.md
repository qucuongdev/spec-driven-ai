# Workflow: Reverse Engineering / Discovery

[Owner: architect] Load .aidlc/agents/architect.md. Write only assigned ticket discovery artifacts; application source and shared context are read-only.

This is the discovery stage in ai-dlc.md. Do not automatically treat existing code as the correct specification.

- Read the business context and ticket. Distinguish confirmed requirements from inferred behavior and unknowns.
- Trace entry points through domain/services to storage and downstream systems. Read callers and tests.
- Record file/commit references, current behavior, contracts, change impact and baseline commands/results in discovery.md. Derive actual company base branch, CI commands and reviewer conventions from authorized repository sources; do not invent them.
- Compare the findings with business rules and resolve routine discrepancies from evidence; ask the responsible owner only about material business ambiguity.
- For greenfield work, record N/A with a reason. Use express only for clear requirements; capture any necessary investigation in the spec.
- Do not modify production code during discovery. Return to coordinator for autonomous progression, or actual human checkpoint in reviewed mode.
