# HLD — [product]
Status: DRAFT / APPROVED | PRD version: [commit]

## Architecture at a glance
Browser → Cloudflare Worker → (D1/R2 only if needed) → Model/provider API if justified

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
