# LLD — [product]
Status: DRAFT / REVIEWED | Based on PRD [digest/sha], HLD [digest/sha]
Guided mode: generated after architecture approval, reviewed with code; no separate LLD approval gate.

## Data tables and migrations
[Actual columns/types, constraints, indexes, tenant ownership, migration plan]

## Route contracts
| Route | Method | Auth | Request | Response | Errors | PRD ID |
|---|---|---|---|---|---|---|

## UI
| Screen | States | Actions | Responsive/accessibility checks |
|---|---|---|---|

## External model/provider interfaces
[Timeouts, keys, retries, privacy filtering, fallback, quotas, model revision]

## Build blocks — complete small vertical slices
| Block ID | User-visible outcome | Dependencies | File ownership | Tests | PRD IDs |
|---|---|---|---|---|---|
| B01 | [usable action] | [none] | [paths] | [command] | FR-01 |

## Cross-block integration contracts
[Typed interfaces; order to merge; integration owner]

## Test plan
[Unit, integration, E2E/browser, contract, security, failure, load]

## Implementation versus release
Implementation: all approved MMFS requirements mapped to blocks, real build/tests with command evidence, no silent scope change.
Code review: inspect assertion quality, UX and complete diff; identify any missing independent/browser verification.
Release: separately review/merge, deploy exact SHA to the correct project, verify real user journeys and rollback. The harness never marks deployment complete.
