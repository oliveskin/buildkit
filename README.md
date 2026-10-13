# Buildkit

**Build a real product by describing an idea in GitHub — and reviewing the decisions, evidence, live preview, and production release instead of managing prompts.**

Buildkit is a free, MIT-licensed, GitHub-native orchestration harness. You bring your own GitHub account, one Claude/Codex API key, and a Cloudflare account for deployment. APIs, compute and optional hosting can still incur charges.

## Quick start

1. Click **[Use this template](https://github.com/tinmanlabsl/buildkit/generate)**. Create a **private** repository for your product.
2. In the new repository: **Settings → Actions → General**. Enable Actions and **Allow GitHub Actions to create and approve pull requests**. The workflows request their own scoped permissions.
3. Add **one** GitHub Actions secret: `OPENAI_API_KEY` (Codex) **or** `ANTHROPIC_API_KEY` (Claude). A consumer subscription does not necessarily cover API usage.
4. Open **Issues → New issue → Build a product**, describe what you want in a few sentences, and submit. Buildkit opens a draft PR and comments when it needs a decision.
5. On the **issue**, reply `/approve CODE` (use the supplied code), `/revise what to change`, or `/status`. Review the source evidence and architecture before approving.

**Before the first Cloudflare preview**, add the [Cloudflare settings below](#cloudflare-preview-and-release-setup). Buildkit stops with instructions if they are missing. It never asks you to paste credentials into an issue.

## The approval-driven workflow

| Phase | Buildkit executes | You review |
|---|---|---|
| **Product direction** | Retrieve GitHub/Hugging Face records and any configured market search sources; propose MMFS and document gaps | User, problem, exclusions, cited sources |
| **Architecture and feasibility** | Produce PRD/HLD; run allowed real HTTP/Node probes; record results and block critical failures | Requirements, alternatives, evidence and feasibility |
| **Implementation** | Generate LLD, 1–3 bounded build blocks, tests and isolated npm verification; security checks | Code, build evidence and intended user journey |
| **Cloudflare live preview** | Validate isolation, scan dependencies/secrets, publish Worker Preview, run Playwright tests/screenshots | **Real preview URL** and screenshots; `/approve CODE` or `/revise ...` |
| **Production decision** | Assess security, compliance classification and release readiness | Exact app/review version, costs and deployment target |
| **Production release** | **Only after your separate approval**, merge the approved PR and deploy the exact commit via Cloudflare, then smoke-test the URL | Actual deployment evidence and follow-up monitoring |

**Every gate is bound to the files reviewed.** Buildkit records evidence and saves completed blocks so `/resume` does not blindly restart everything. Commands: `/start`, `/status`, `/approve CODE`, `/revise feedback`, `/resume`, and for regulated products after qualified review `/attest COMPLIANCE-REVIEWED`.

### Research must distinguish proof from assumptions

Research is stored in `docs/research/EVIDENCE.json` and `docs/research/SOURCES.md`. The direction document cites evidence IDs such as `[E-001]`. Sources missing or market claims without evidence are explicitly marked **UNVERIFIED**. Feasibility plans and real observations are stored in `spikes/plan.json` and `spikes/results.json`; critical failures **block** the next stage. A retrieved model card or API documentation alone is not proof that your model or integration works.

The default research routes cover GitHub and Hugging Face metadata; customer/competitor web discovery needs a configured search endpoint or supplied source URLs. No tool can guarantee every market claim is true. Read the gaps, not just the recommendation.

## Cloudflare preview and release setup

Do this **in the generated product repository**, not `tinmanlabsl/buildkit`:

| GitHub Actions setting | Required for | Meaning |
|---|---|---|
| Secret `CLOUDFLARE_ACCOUNT_ID` | Preview and release | Cloudflare account identifier |
| Secret `CLOUDFLARE_PREVIEW_TOKEN` | Preview | Scoped permission to create/update **preview** deployments |
| Secret `CLOUDFLARE_PROD_TOKEN` | Production | Separate credential for approved **production** deployment |
| Variable `BUILDKIT_WORKER_NAME` | Preview and release | Exact intended Worker name; must equal `wrangler.json` `name` |

For applications using D1, KV, R2 or other account-level storage, create **separate Preview-safe resources** and list the matching bindings under `previews` in `wrangler.json`; Buildkit refuses obvious production-binding reuse. A public Preview URL is **not secret**: configure [Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) for private content, and never expose real customer data in test fixtures. Cloudflare permissions, app integrations and migrations may still require user authorization.

Optional: `BUILDKIT_SEARCH_ENDPOINT` (repository variable; HTTPS JSON search endpoint returning `results`), `BUILDKIT_SEARCH_KEY` (secret), and `BUILDKIT_SPIKE_HOSTS` (variable; comma-separated approved public hosts). External API keys are stored only in secrets and never in `wrangler.json`, issue comments or code.

## Security and cost principles

- Sensitive filenames and values are blocked before commit. **Gitleaks** runs in the GitHub harness and CI against the repository/diff; a local hook can be installed with `bash scripts/install-hooks.sh`.
- `.gitignore` is necessary but **not sufficient**: tracked files and normal source files are also scanned. If a key leaks, **revoke/rotate it**; Git history cleanup alone is not remediation.
- Generated npm scripts run in isolated containers without model/GitHub keys. The coding agent still receives the selected model key; it is not a security boundary for hostile tenants or arbitrary third-party code.
- Cloudflare preview and production credentials are separate from coding-agent credentials. Approval gates prevent automatic production deployment; failures stop the workflow rather than silently claiming success.
- This free repository does **not** pay for coding-model tokens, third-party APIs, GitHub runner overages, Cloudflare paid resources or GPU workloads.

## More detailed guides

- **[Complete walkthrough, setup, approvals, troubleshooting](docs/HARNESS.md)**
- **[Specification templates](docs/PRD_TEMPLATE.md)**: [PRD](docs/PRD_TEMPLATE.md) · [HLD](docs/HLD_TEMPLATE.md) · [LLD](docs/LLD_TEMPLATE.md)
- **[Release checklist](docs/RELEASE_CHECKLIST.md)**
- **[Prompts reference](PROMPTS.md)**, [manual playbook](START-HERE.md), [worked exercise](FIRST-PRODUCT-EXERCISE.md)
- **[Agent rules](AGENTS.md)** and project-local skills in `.agents/skills/` and `.claude/skills/`
- **[Architecture/examples](examples/)**: Cloudflare Worker and Modal inference (examples, not automatically configured infrastructure)
- [Prior security audit](docs/AUDIT.md)

### Current proof boundary

Unit/flow tests and GitHub CI exercise the controller with mocked AI/GitHub and real Docker/npm fixtures, not a paid-provider end-to-end product build. The Cloudflare preview/release jobs require each user's authorized account and real credentials. Generated E2E test **quality**, required compliance sign-off and real customer integration must still be assessed. See workflow logs and evidence; do not equate a passing CI run with business or regulatory assurance.

**Licence:** [MIT](LICENSE). This is a single open-source workflow, not artificially separated into feature tiers.
