# Maintainer Context

Project-specific drafts retained during the single-folder migration. Path references and the technical inventory reflect the new layout. These are maintenance references, not the portable starter baseline or an owner acknowledgement.


## Preserved draft: `.aidlc/context/business/overview.md`

# spec-driven-ai Business Overview

## Goals and Users

A portable workflow kit with optional standalone Node helpers for engineers and teams using coding assistants on new or existing codebases. The product connects business context, ticket requirements, implementation plans, verification and PR delivery through records stored in Git.

## Domains and Primary Workflow

Project context → ticket intent → stage outputs/checkpoints → scope checks and verification evidence → PR → operation/feedback. The CLI manages records and local checks; the assistant reads the instructions and performs work within the user's authorization.

## Scope

Generate templates, persist state, record checkpoints, inspect Git changes and execute explicit verification commands. The tool does not automatically connect to Jira/GitHub, call models, merge or deploy. It does not authenticate reviewers or guarantee the absence of regressions.

## Sources and Review Status

Sources: README.md, .aidlc/docs/WORKFLOW.md, .aidlc/tools/cli.js and .aidlc/tools/lifecycle.js. This draft reflects the implementation and requested workflow and still requires project-owner review. No baseline approval has been recorded on the user's behalf. Requiring business context before the first checkpoint is a local policy. AWS is the methodology reference; full compatibility with its engine is not claimed.


## Preserved draft: `.aidlc/context/business/glossary.md`

# Business Glossary

| Term | Meaning in This Project | Source |
| --- | --- | --- |
| Project context | Shared overview, glossary, business rules and technical system overview | .aidlc/docs/WORKFLOW.md |
| Intent / ticket record | A unit of work recorded under .aidlc/specs/active/TICKET | .aidlc/tools/lifecycle.js |
| Profile | The feature, bugfix, refactor or express stage route | .aidlc/tools/lifecycle.js |
| Stage | A workflow step with required outputs and a checkpoint | .aidlc/tools/lifecycle.js |
| Unit | A verifiable implementation slice recorded in implementation.md | .aidlc/workflows/ai-dlc.md |
| Checkpoint | A recorded review decision, not identity authentication | .aidlc/docs/USER_GUIDE.md |
| Scope | Exact paths, test/dependency declarations and maxFiles | .aidlc/tools/lifecycle.js |
| Verification receipt | A command, exit code, log reference and source fingerprint | .aidlc/tools/lifecycle.js |
| Reopen | Revisit a stage and invalidate downstream checkpoints and verification | .aidlc/tools/lifecycle.js |

Review status: drafted from the v2 implementation; project-owner confirmation is pending.


## Preserved draft: `.aidlc/context/business/rules.md`

# Business Rules of the Tool

| ID | Rule | Source | Review Status |
| --- | --- | --- | --- |
| BR-001 | Acknowledge the project baseline before the first checkpoint | User requirement; .aidlc/tools/lifecycle.js | Requested policy; wording pending review |
| BR-002 | Implement only against a plan with a recorded checkpoint | .aidlc/tools/lifecycle.js | Implemented in v2; pending review |
| BR-003 | Tests may change with declared scope and review; not every test must fail first | .aidlc/rules/02-adversarial-testing.md | Proposed v2 policy; pending review |
| BR-004 | verify/pr require successful results for every command against the current fingerprint | .aidlc/tools/lifecycle.js | Implemented in v2; pending review |
| BR-005 | Reopen the relevant stage when approved outputs change | .aidlc/tools/lifecycle.js | Implemented in v2; pending review |
| BR-006 | Agents must not invent approvals, PRs or deployment evidence | .aidlc/workflows/ai-dlc.md | Operating policy; pending review |

## Workflow and Responsibilities

The business owner confirms context and requirements; engineers review plans and evidence according to team policy. The assistant must not appoint itself as the approver. The CLI stores attestations without authenticating identity or authority. The target repository's CI and PR review policy remains applicable.

## Open Questions

Owner: project owner. Review profile defaults, the default 10-file budget and future integrations. Authenticated approvals, automatic Jira/GitHub connectivity and release automation are outside the current v2 scope.


## Preserved draft: `.aidlc/context/architecture/system.md`

# spec-driven-ai Technical System Overview

## Stack and Development Commands

CommonJS on Node.js >=16 with no runtime dependencies. The portable entry point is .aidlc/tools/cli.js, run from the target repository root. Run npm test for maintenance integration checks and node scripts/check-kit.js for payload/mirror checks. scripts/package-kit.ps1 creates a standalone ZIP; this is not an npm package. The CLI uses fs/path/crypto/child_process and a locally installed Git executable.

## Components

- kit/: canonical portable payload, containing only AGENTS.md and .aidlc/.
- .aidlc/tools/lifecycle.js: profiles/stages, context receipts, ticket state, plan validation, scope checks, verification fingerprints and reopen behavior.
- .aidlc/tools/cli.js: standalone command parsing and lifecycle dispatch.
- .aidlc/rules/ and .aidlc/workflows/: shared scope, integrity and lifecycle guidance.
- .aidlc/context/: starter business and technical context; .aidlc/specs/: templates and ticket records.
- scripts/copy-kit.js: safe copy of missing files without installing hooks or dependencies.
- scripts/check-kit.js and scripts/package-kit.ps1: strict payload/mirror validation and ZIP packaging.
- tests/lifecycle.test.js: eighteen integration checks in disposable Git repositories.
- Root AGENTS.md and .aidlc/: byte-for-byte payload mirror; project-specific drafts remain in this maintainer document rather than the starter context copied to consumers.

## Boundaries and Invariants

No direct network/API calls. verify executes an explicit shell command without sandboxing it. Approvals and logs are local data editable by anyone with filesystem access; use Git, CI and review for governance. Fingerprints exclude only the current ticket record and project-context receipt, not other tickets or shared rules. They do not cover ignored files, environment details or linked URL content. Copy preserves existing files, hooks and agent instructions.

## Evidence and Review Status

The project-context draft has not been acknowledged by the project owner through the context command. Test results are reported with the current changes; this document is not a verification receipt. See .aidlc/docs/USER_GUIDE.md for migration and limitations.
