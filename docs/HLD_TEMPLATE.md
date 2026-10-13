# HLD — [product]
Status: DRAFT / APPROVED | PRD version: [commit]

## Architecture at a glance
[Select actual client runtime(s), backend, compute/GPU, database and deployment provider from requirements. Cloudflare is ONE candidate, not a mandatory destination.]

## Components and responsibilities
| Component | Responsibility | Build/reuse | Reason | Failure mode |
|---|---|---|---|---|

## Core data flow and trust boundaries
[Numbered requests; authenticated vs anonymous; PII handling; where secrets live]

## Auth and authorization
[Identity provider; sessions; tenant access controls; API policy]

## Data and integrations
[SQL/object schema at high level; API owners, errors, retries, idempotency]

## AI/model strategy
[Task, candidate model, managed vs OSS decision, GPU/no GPU, benchmark gate]

## Execution adapter contract
[docs/EXECUTION_PLAN.json: productKind, rationale, requirement IDs, runtime build adapter, selected preview/deploy adapters, target name where relevant, explicit missing automation]

## Infrastructure and costs requiring user approval
[docs/INFRA_PLAN.json: precise resources/preview vs production identities, domain intent, account/permissions, pricing sources, estimated usage or UNKNOWN, rollback consequences. Never provision before the user approves.]

## Deployment and operations
[GitHub repo, CF Worker name/env, Modal app, environments, logging, backup, rollback]

## Cost and scaling guardrails
[Free-tier eligibility; initial $ budget; per-request model/DB spend; alerts]

## Architectural alternatives and rejected complexity
[What we consciously did not add]

## Risks and feasibility spikes before LLD
[Specific hypothesis, minimal verification, GO/NO-GO threshold]

## Feasibility decision
[For each critical integration/model, link an executed result or write UNVERIFIED. Separate demonstrated capability from a proposed spike. List which unverified risks the reviewer is accepting.]
