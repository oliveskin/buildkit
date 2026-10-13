# First exercise: ship a tiny AI customer-feedback sorter

**Goal:** user pastes a customer complaint, receives a suggested category + short summary, then can edit/save it. Build this with real backend flow, not a static mock. The exercise teaches specification, agent coding, HF/Modal wiring, Cloudflare deploy and honest status reporting.

**Do not spend a week on this.** The point is to practise the workflow and see an actual production URL. Use synthetic test messages, not private customer data.

## A. Define a tiny MMFS

- A single screen with a text box, Analyze button, result panel, and Save button.
- Worker accepts a bounded text input and calls Modal (or a cheaper deterministic substitute during the very first spike).
- Model returns a summary. User can choose category manually if the demo model is poor at classification.
- Save action persists category, raw feedback and summary to D1 (only after identity/authorization is implemented; for an unprotected first test use local/dev data, not a public multi-user database).
- Error and empty states work; a timeout displays a retry option. No billing, multi-user teams, dashboards or mobile app.

## B. Run four blocks

| Block | What gets built | Test of truth |
|---|---|---|
| B01 | React UI + input validation | Empty input rejected; loading/error states visible on phone |
| B02 | Modal demo inference + Cloudflare Worker proxy | POST with valid token succeeds; absent token fails; no secret in browser bundle |
| B03 | Persistence (D1, with correct ownership) | Saved record returns after refresh; another user cannot access it |
| B04 | Deployment & QA | Production URL completes a real test; deployed SHA recorded |

## C. Actual prompts to give your coding agent

For B01: "Read PRD/HLD/LLD and AGENTS.md. Implement B01 only. No fake model response. Use a genuinely working local UI with disabled Analyze pending the B02 integration (clearly label it not connected). Build a polished, restrained interface with loading, error and empty states. Add tests; show results."

For B02: "Use examples/modal_inference.py and examples/cloudflare_worker_proxy.ts as starting references. Adapt them to this generated Cloudflare React scaffold; no blind copy. Create Modal secret and Cloudflare secrets through secure CLI prompts only. Confirm unauthorized calls fail and never log/commit secret values. Measure first/second call latency and estimate runtime cost."

For B03: "Create migration(s) for user-owned feedback records. Implement authenticated save/list routes and tenant/user authorization. If no identity provider is configured, STOP and propose a minimal legitimate auth option; do not publish an unauthenticated public write API. Test ownership boundaries."

For B04: "Review against acceptance tests; get a second model to inspect diff; merge reviewed PRs; deploy correct Worker; run a real browser test on public URL; record source commit and deployed SHA. If unable to verify any step, say UNKNOWN."

## D. Avoid a false victory

A model-generated summary is not inherently useful. Gather 20 synthetic representative complaints with human-written expected outcomes. Test wrong language, lengthy complaints, hostile or nonsensical input, empty text, invalid JSON, model timeout and unavailable D1. Record whether the output helps the user enough to continue. If not, swap the model or remove AI; do not scale before this gate.

**Done means:** someone other than the builder can open the site, perform the core action, see a useful result, save/reopen it with correct permissions, and encounter understandable errors. Deployed URL and main SHA are recorded in `docs/STATUS.md`.
