# LLD — [product]
Status: DRAFT / REVIEWED | Based on PRD [digest/sha], HLD [digest/sha]
Guided mode: generated after approved architecture and infrastructure decisions. Runtime and deploy provider are selected by HLD. No separate LLD approval gate.

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

## Build blocks — ALL approved MMFS outcomes, unlimited total count
| Block ID | User-visible outcome | dependsOn IDs | File ownership | Acceptance tests | PRD IDs |
|---|---|---|---|---|---|
| B01 | [usable action] | [none] | [paths] | [command] | FR-01 |

## Cross-block integration contracts
[Typed interfaces; order to merge; integration owner]

## Reproducible deployment output
[package.json buildkit.deploymentDirectory, default dist/buildkit; no_bundle built Worker/asset payload, hashed source/artifact identity, preview-safe Cloudflare bindings]

## Test plan
[Unit, integration, E2E/browser, contract, security, failure, load]

## Implementation versus release
Implementation: every MMFS FR mapped to one or more blocks, dependencies checked for cycles, small per-run checkpoints, real runtime-specific build/tests and no silent scope change.
Preview: verify immutable compiled output, SHA-256 payload digest, Playwright user journeys and UX approval.
Code/security review: separate from UX; review the full diff, authorization, dependency/secret checks and the version-bound artifact. Record an independent second-provider PASS or an explicit human code/security acknowledgment.
Release: approve exact source/build evidence, selected preview/release adapter and approved resource/domain plan. When using Cloudflare, deploy exactly browser-tested immutable bytes and attach any approved domain only after release authorization. Unsupported targets must remain BLOCKED, not silently substituted. The harness marks deployment complete only after the release job reports success.
