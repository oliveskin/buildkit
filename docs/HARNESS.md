# Buildkit: GitHub-native guided product build

GitHub Issues are the user's interface; Actions handles execution; draft PRs preserve documents/code; Cloudflare Workers Previews hosts the **actual working preview**. All approval commands belong on the **original product Issue**. This document covers the complete lifecycle, not just source generation.

## First-time setup (in each new private product repository)

1. Create the repository via **[Use this template](https://github.com/tinmanlabsl/buildkit/generate)**.
2. In **Settings → Actions → General**, enable Actions and allow Actions to create/approve pull requests; organization restrictions may require an admin. A generated repository does **not** inherit Buildkit's secrets or settings.
3. Set **one** Actions repository secret (Settings → Secrets and variables → Actions → Repository secrets): `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. Codex wins if both are set, unless `BUILDKIT_PROVIDER=claude` (repository variable).
4. Set provider API billing alerts/limits. A consumer subscription doesn't imply included GitHub Actions API access.
5. Open **Issues → New issue → Build a product** and describe the customer, desired outcome and hard constraints. Leave the `[Product]` title prefix in place. Buildkit posts links and approval codes.

**Before a live preview**, configure Cloudflare (below). The harness stops rather than using another project/account or silently deploying production.

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
| **3. Implementation** | LLD, 1–3 bounded blocks, real isolated npm build/test/audit; review diffs and check for secrets | Failed test or protected-file modification blocks and preserves verified checkpoints |
| **4. Cloudflare Preview** | Separate workflow checks exact SHA and isolation; Gitleaks + npm audit; deploys Worker Preview; browser job captures desktop/mobile screenshots and runs >=2 Playwright user journeys | Issue comment links to **real preview**, screenshots and logs; approve or request revision |
| **5. Release review** | Evaluate security profile, compliance risk and actual browser evidence; link exact SHA and approved Worker | Regulated product requires qualified human sign-off; release is separately approved |
| **6. Deployment** | Separate scoped workflow rechecks approved SHA/credentials/scan, merges the exact approved PR, deploys to Cloudflare, smoke tests URL | Result posted to Issue. Manual verification of operations, cost, backups and rollback remains required |

The user is not asked to select prompts or pass documents between steps. GitHub stores version-bound state in the product branch. Research citations and approval digests are checkable; an approved PRD cannot be silently altered by an agent.

### Issue commands

| Comment | Meaning |
|---|---|
| `/start` | Start an eligible issue |
| `/status` | Show current step, draft PR, latest approval code or blocker |
| `/approve CODE` | Approve exactly the presented version (copy from latest issue comment) |
| `/revise Describe the change` | Re-run the current review stage with feedback |
| `/resume` | Retry a blocked/interrupted stage; preserves successful blocks |
| `/attest COMPLIANCE-REVIEWED` | Record that a **qualified human** has reviewed the regulated product profile; not a legal certification |

If no response appears, check **Actions → Buildkit · guided product build**, the issue author’s write/maintain/admin permission, and PR-creation permissions. Preview errors are in **Buildkit · Cloudflare Preview and browser verification**; production errors in **Buildkit · approved production release**.

### What happens when something fails?

- **Missing API key**: add the named Actions secret; comment `/resume`.
- **No market research result**: provide credible source URLs in the initial brief or configure `BUILDKIT_SEARCH_ENDPOINT`; claims remain explicitly UNVERIFIED.
- **Critical feasibility failure**: read `spikes/results.json`, correct the implementation or provide safe test access, and `/resume`. Documentation GET probes do **not** prove integration behaviour.
- **No Worker name/account credentials**: set the exact Worker variable and separated preview/prod tokens.
- **Preview binding conflict**: use dedicated preview D1/KV/R2/etc. resources; production bindings must never be tested in preview.
- **E2E failure**: examine Playwright artifact and browser logs; request a revision. A screenshot alone is not proof of interaction.
- **Secret exposed**: block release; revoke/rotate and audit history; `.gitignore` is not remediation.
- **Production release fails after merge**: do not claim deployed; inspect the Actions record and Cloudflare state, restore/roll back if needed.

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
