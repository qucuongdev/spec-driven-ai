# Workflow: Reverse Engineering / Discovery

This is the discovery stage in ai-dlc.md. Do not automatically treat existing code as the correct specification.

- Read the business context and ticket. Distinguish confirmed requirements from inferred behavior and unknowns.
- Trace entry points through domain/services to storage and downstream systems. Read callers and tests.
- Record file/commit references, current behavior, contracts, change impact and baseline commands/results in discovery.md.
- Compare the findings with business rules and ask the responsible owner to resolve discrepancies.
- For greenfield work, record N/A with a reason. Use express only for clear requirements; capture any necessary investigation in the spec.
- Do not modify production code during discovery. Proceed to requirements after the checkpoint.
