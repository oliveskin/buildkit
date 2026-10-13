# Buildkit

**Free, open-source, approval-driven AI product building directly in GitHub.** Start with a sentence about your idea. Buildkit guides research → PRD → HLD → verified feasibility → LLD → code → real browser preview → approved release, using Claude Code or Codex.

**[Use this template](https://github.com/tinmanlabsl/buildkit/generate)** · [Guided setup](docs/HARNESS.md) · [Manual building playbook](START-HERE.md) · [Why we demand evidence](docs/EVIDENCE.md)

## Start in GitHub (no terminal required)

1. Click **Use this template** and create a **private** repository in your own account. Never build a customer's unreleased product in the shared public Buildkit repository.
2. In **your new repo** open **Settings → Actions → General**. Enable Actions and allow GitHub Actions to create pull requests. Organization policy may require your administrator.
3. In **Settings → Secrets and variables → Actions**, create one repository secret: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. The sole configured provider is detected automatically. These are paid API keys, not necessarily covered by chat subscriptions.
4. Open **Issues → New issue → Build a product** and write what you want. Keep the `[Product]` title. The agent researches, proposes a narrow MMFS, and posts findings for review.
5. Reply **`/approve CODE`** or **`/revise your feedback`** on the issue. No copying prompts or files between agents.
6. Before the browser-preview stage, add the Cloudflare **Preview** credentials and Worker name described below. Buildkit then publishes a preview, runs Playwright journeys and asks you to inspect it. A **separate explicit approval** authorizes the production release.

### Exactly what gets reviewed

| Gate | Buildkit produces | You decide |
|---|---|---|
| **Direction** | Retrieved GitHub/Hugging Face source evidence, market-evidence gaps, MMFS and exclusions | Is the problem/scope worth building? |
| **Architecture** | PRD, HLD, real feasibility probe results and a proposed cheapest stack | Are the capabilities and risks proven? |
| **Live preview** | LLD, tested code blocks, dependency and secret checks, Cloudflare preview URL, browser screenshots and at least 2 user-journey tests | Does the product actually work? |
| **Production release** | Security/compliance review, precise Worker and SHA, deployment impact | May Buildkit merge and deploy this reviewed version? |

Critical failed feasibility probes **block** implementation. Unavailable market evidence must be labelled **UNVERIFIED**. Generated browser tests are still agent-written; examine their assertions before approving. Regulated products require independent qualified human compliance review; the harness does not certify compliance.

### One-time Cloudflare setup in **your product repository**

When preview is needed (not for initial research):

| GitHub Actions setting | Use |
|---|---|
| Secret `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| Secret `CLOUDFLARE_PREVIEW_TOKEN` | Narrowly scoped Worker Preview token |
| Variable `BUILDKIT_WORKER_NAME` | Exact Worker name matching generated `wrangler.json` |
| Secret `CLOUDFLARE_PROD_TOKEN` | **Separate** production deploy token; only needed for approved release |

Buildkit creates/updates a Cloudflare Worker **Preview**, not an unrelated Cloudflare project. Any needed D1/KV/R2 bindings must reference **existing isolated preview resources**; the harness rejects production-resource reuse rather than creating paid or sensitive resources on your behalf. Review public-preview exposure before using real user data. [Cloudflare and preview guidance](docs/CLOUDFLARE.md).

### Commands on your original GitHub issue

`/start` · `/status` · `/approve CODE` · `/revise feedback` · `/resume` (after a blocker) · `/attest COMPLIANCE-REVIEWED` (records human compliance acknowledgment, **not** certification).

**What “free” means:** Buildkit is MIT-licensed, with no Buildkit hosting fee. GitHub Actions quotas, Cloudflare services, Claude/Codex API use, and optional search/model services may cost money. Set provider spending controls. [Licence](LICENSE).

## What is enforced

- **Source-to-claim discipline:** retrieved evidence IDs; no invented citations; executable critical technical probes.
- **Bounded implementation:** approved PRD/HLD cannot silently change; 1–3 ordered blocks and checkpoints; resume on failure.
- **Secrets and dependencies:** ignore common secret files; reject protected paths, known key patterns and leaked keys; run Gitleaks and npm dependency audits. `.gitignore` alone is not a secret guarantee. See [security controls](docs/SECURITY.md).
- **Deployment truth:** separate verified preview, exact SHA approval, production-token isolation and post-deployment HTTP check. Failed tests must not be presented as passed.
- **Human control:** no production merge/deploy before the explicit final issue approval.

**Limits:** This automated path currently targets **Cloudflare Workers-compatible Node/npm web products**. Unsupported mobile/server/GPU deployments must stop with an explicit blocker or follow the [manual playbook](START-HERE.md); a source-linked model evaluation is not a GPU benchmark. Research can still lack actual customer feedback if no search service is configured. The coding agent itself is **not** a hardened untrusted-code sandbox. No tool can guarantee secret scanning catches every possible credential. See [operations and limitations](docs/HARNESS.md).

## Buildkit included materials

| Where | Purpose |
|---|---|
| [docs/HARNESS.md](docs/HARNESS.md) | Exact user setup, approval flow and recovery |
| [docs/EVIDENCE.md](docs/EVIDENCE.md) | Research and feasibility evidence contracts |
| [docs/SECURITY.md](docs/SECURITY.md) | Secret, authorization and compliance controls |
| [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md) | Preview, isolated resources, live-browser QA and release |
| [START-HERE.md](START-HERE.md) / [PROMPTS.md](PROMPTS.md) | Manual workflow and copyable prompts |
| [docs/PRD_TEMPLATE.md](docs/PRD_TEMPLATE.md) / [HLD](docs/HLD_TEMPLATE.md) / [LLD](docs/LLD_TEMPLATE.md) | Product and engineering templates |
| [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) | Rules for coding agents |
| [six local skills](.agents/skills/) | Scope, anti-slop, OSS reuse, HF selection, costs, release checks |
| [harness](harness/) / [.github/workflows](.github/workflows/) | Github-native controller, research, tests, preview/release workflows |

[Previous audit and outstanding evidence](docs/AUDIT.md).
