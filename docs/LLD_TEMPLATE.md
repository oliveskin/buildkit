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

## Reproducible deployment output\n[package.json buildkit.deploymentDirectory, default dist/buildkit; no_bundle built Worker/asset payload, hashed source/artifact identity, preview-safe Cloudflare bindings]\n\n## Test plan
[Unit, integration, E2E/browser, contract, security, failure, load]

## Implementation versus release
Implementation: all approved MMFS requirements mapped to blocks, real build/tests with command evidence, no silent scope change.
Preview: verify immutable compiled output, SHA-256 payload digest, Playwright user journeys and UX approval.\nCode/security review: separate from UX; review the full diff, authorization, dependency/secret checks and the version-bound artifact. Record an independent second-provider PASS or an explicit human code/security acknowledgment.
Release: approve the exact reviewed source/artifact, allow only metadata changes after approval, merge the product PR, deploy the same browser-tested artifact (no credentialed rebuild), then record actual production verification and rollback obligations. The harness marks deployment complete only after the release job reports success.
