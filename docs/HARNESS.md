# Buildkit: GitHub-native guided product build

GitHub Issues are the user's interface; Actions handles execution; draft PRs preserve documents/code; Cloudflare Workers Previews hosts the **actual working preview**. All approval commands belong on the **original product Issue**. This document covers the complete lifecycle, not just source generation.

## First-time setup (in each new private product repository)

1. Create the repository via **[Use this template](https://github.com/tinmanlabsl/buildkit/generate)**.
2. In **Settings → Actions → General**, enable Actions and allow Actions to create/approve pull requests; organization restrictions may require an admin. A generated repository does **not** inherit Buildkit's secrets or settings.
3. Set **one** Actions repository secret (Settings → Secrets and variables → Actions → Repository secrets): `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. Codex wins if both are set, unless `BUILDKIT_PROVIDER=claude` (repository variable).
4. Set provider API billing alerts/limits. A consumer subscription doesn't imply included GitHub Actions API access.
5. Open **Issues → New issue → Build a product** and describe the customer, desired outcome and hard constraints. Leave the `[Product]` title prefix in place. Buildkit posts links and approval codes.

**Reproducible output:** The generated npm app declares `package.json` `buildkit.deploymentDirectory` (default `dist/buildkit`). Its `npm run build` emits a self-contained payload with a built JavaScript Worker entry or static assets and a `wrangler.json` configured with `no_bundle: true`. A secret-free job builds and hashes that output; preview and production jobs upload **the same artifact bytes** without rerunning application builds. The artifact manifest records the source commit, worker name and payload digest.

**Before approving the architecture**, set the exact `BUILDKIT_WORKER_NAME` repository variable: approval immediately starts implementation, which creates the matched `wrangler.json`. Preview credentials can be configured later, before browser review. The harness stops rather than inventing a Worker or silently using another account.

### Cloudflare credentials and target

Under **Settings → Secrets and variables → Actions** of your **product repository**, configure:

| Kind | Name | Why |
|---|---|---|
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Account to use; never pasted into Issues |
| Secret | `CLOUDFLARE_PREVIEW_TOKEN` | Scoped to preview deployment capability |
| Secret | `CLOUDFLARE_PROD_TOKEN` | Separate scoped production deployment credential |
| Variable | `BUILDKIT_WORKER_NAME` | Exact Worker in `wrangler.json`, for example `bk-my-task-app` |

Use the **minimum Cloudflare privileges** each workflow needs and confirm the target account. Production and preview tokens should not be identical. Worker Previews requires Wrangler >= 4.135; the workflows pin a supported version.

The implementation produces a checked-in `wrangler.json` with a `previews` block. Top-level bindings are production. Bind Preview D1/KV/R2/Vectorize/Hyperdrive to **distinct staging resource IDs/names**; where those resources are needed, create and authorize them before preview. Buildkit checks for overlapping IDs and unsupported production-coupled Worker settings. No arbitrary resource creation or database migration is authorized without user review.

**Preview access:** Preview URLs may be public. For confidential flows enable [Cloudflare Access on the Worker/Previews](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) and arrange an authorized way for Playwright to test them; do not use real customer secrets/PII in public preview data. Preview auth is not automatically provisioned by this kit.

### Optional research/feasibility sources

| Kind | Name | Behaviour |
|---|---|---|
| Variable | `BUILDKIT_SEARCH_ENDPOINT` | Public HTTPS JSON search API endpoint accepting `q` and returning a `results` array of title/url/content |
| Secret | `BUILDKIT_SEARCH_KEY` | Authorization for that external search endpoint |
| Variable | `BUILDKIT_SPIKE_HOSTS` | Comma-separated, explicitly approved HTTPS hosts for feasibility network probes |
| Variable | `BUILDKIT_REVIEW_PROVIDER` | A separate model for static diff review; needs its own corresponding model API key |

These settings are optional until a proposed product requires them. If research cannot substantiate an important claim, the report must state **UNVERIFIED**, not invent an alternative. If a critical technical dependency cannot be proven by an allowed executable probe, the architecture stage **blocks**. The user must authorize any required external credentials and test accounts through GitHub/Cloudflare secrets; they must not be pasted into comments or generated files.

## The workflow, as the user experiences it

| Step | Automated work | Approval / exception |
|---|---|---|
| **1. Direction** | Acquire actual source metadata and optional market references → `docs/research/EVIDENCE.json` and `docs/DIRECTION.md` | Check customer/market evidence, smallest marketable feature set, risks and explicit exclusions; `/approve CODE` or `/revise ...` |
| **2. Architecture** | Generate PRD/HLD; create `spikes/plan.json`; execute permitted tests and record `spikes/results.json`; generate feasibility summary | Critical failed/unverified feasibility blocks. Approve real architecture and documented residual uncertainty |
| **3. Implementation** | LLD, 1–3 bounded blocks and reproducible isolated npm build/test/audit; security and secret checks | Failed test or protected-file modification blocks while successful checkpoints remain |
| **4. Cloudflare Preview** | Build immutable self-contained output with a SHA-256 manifest; deploy that artifact (no build in credentialed jobs); run Playwright and capture screenshots | Inspect the **real preview**; approve UX using `/approve CODE`, or `/revise ...` |
| **5. Code/security review** | Bind an independent second-provider review to the reviewed artifact, or request an explicit human PR/security examination | If requested, inspect code and security evidence and reply `/review CODE`; UX approval alone does not qualify |\n| **6. Release review** | Evaluate risk profile, code/security sign-off, actual browser results and payload digest | Regulated products require qualified human compliance review; approve production separately |
| **7. Deployment** | Separate scoped workflow verifies approved source plus metadata-only outbox changes, reuses the **same preview-tested artifact**, merges the PR, deploys and smoke-tests | Result posted to Issue. Monitoring, backups and rollback remain the owner’s responsibility |

The user is not asked to select prompts or pass documents between steps. GitHub stores version-bound state in the product branch. Research citations and approval digests are checkable; an approved PRD cannot be silently altered by an agent.

### Issue commands

| Comment | Meaning |
|---|---|
| `/start` | Start an eligible issue |
| `/status` | Show current step, draft PR, latest approval code or blocker |
| `/approve CODE` | Approve exactly the presented version (copy from latest issue comment) |
| `/revise Describe the change` | Invalidate affected outputs and dependent approvals, then regenerate; also works after a blocked preview |\n| `/refresh-research New URLs or search context` | Retrieve research again and invalidate downstream direction/architecture/implementation decisions |\n| `/review CODE` | Explicitly acknowledge a separate, version-bound source/security review after inspecting the PR; this is **not** the UX gate |
| `/resume` | Retry a blocked/interrupted stage; preserves successful blocks |
| `/attest COMPLIANCE-REVIEWED` | Record that a **qualified human** has reviewed the regulated product profile; not a legal certification |

If no response appears, check **Actions → Buildkit · guided product build**, the issue author’s write/maintain/admin permission, and PR-creation permissions. Preview errors are in **Buildkit · Cloudflare Preview and browser verification**; production errors in **Buildkit · approved production release**.

### What happens when something fails?

- **Missing API key**: add the named Actions secret; comment `/resume`.
- **No market research result**: configure `BUILDKIT_SEARCH_ENDPOINT` or provide source URLs in `/refresh-research your-links`; Buildkit refreshes the source bundle and revokes dependent approvals rather than reusing stale evidence.
- **Critical feasibility failure**: read `spikes/results.json`, correct the implementation or provide safe test access, and `/resume`. Documentation GET probes do **not** prove integration behaviour.
- **No Worker name/account credentials**: set the exact Worker variable and separated preview/prod tokens.
- **Preview binding conflict**: use dedicated preview D1/KV/R2/etc. resources; production bindings must never be tested in preview.
- **E2E failure**: examine Playwright artifacts and browser logs; `/revise` can regenerate blocked implementation work. A screenshot alone is not proof of interaction.
- **Secret exposed**: block release; revoke/rotate and audit history; `.gitignore` is not remediation.
- **Uncertain preview or release dispatch**: use `/status`, then `/resume` after the prior run is no longer active. Buildkit reconciles the original SHA using the Actions run name instead of silently choosing a new commit.\n- **Production release fails after merge**: do not claim deployed; inspect the Actions record and Cloudflare state, restore/roll back if needed.

## Safety boundary / limits

`.gitignore`, protected path checks, known-secret patterns, Gitleaks pre-commit and CI, and separated Docker test environments reduce leaks but **cannot promise 100% prevention**. The coding agent itself runs with a model provider credential; use a dedicated key with a strict quota and do not treat this harness as safe for hostile untrusted developers. The separate Cloudflare workflow holds deployment credentials only when the relevant step runs.

A deployment to Cloudflare should be paired with observability, backups/rollback and correct data migration. Cloudflare Workers Preview resource isolation is only as good as its configured bindings; make sure real customer PII never goes into an unprotected preview.

**Costs:** Buildkit itself is MIT open source with no subscription. Coding-model tokens, GitHub limits, Cloudflare resources, model inference and commercial APIs remain external costs.

**Verification boundary:** Local/CI tests of the harness include mocked providers and GitHub and genuine Docker/npm tests, but they do not replace a real-provider/Cloudflare account end-to-end trial. Nor does an automated category classifier certify GDPR, SAMA, HIPAA, medical-device compliance or any local law.

## Maintainer references

[README](../README.md) · [Current code audit](AUDIT.md) · [PRD](PRD_TEMPLATE.md) · [HLD](HLD_TEMPLATE.md) · [LLD](LLD_TEMPLATE.md) · [Release checklist](RELEASE_CHECKLIST.md)

- [Cloudflare Workers Preview docs](https://developers.cloudflare.com/workers/previews/get-started/)
- [Preview resource isolation](https://developers.cloudflare.com/workers/previews/resources/)
- [Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [GitHub Actions authorization](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)
