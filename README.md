# Buildkit

**Build a real product by describing an idea in GitHub — and reviewing the decisions, evidence, live preview, and production release instead of managing prompts.**

Buildkit is a free, MIT-licensed, GitHub-native orchestration harness. You bring your own GitHub account, a supported coding-model API key, and infrastructure credentials only if the approved deployment adapter requires them. APIs, compute and optional hosting can still incur charges.

## Before you start — nothing to install locally

**Using the recommended GitHub workflow? You do not need to install Docker, Git, Node.js, Python, Rust, Claude Code, Codex, OpenCode, Wrangler, Gitleaks or Playwright on your computer.** Buildkit runs on GitHub-hosted Actions runners, which prepare the development tools and isolated build/test containers. You use your browser to open an Issue, inspect the draft PR, and approve decisions.

**You do need:** a GitHub account with permission to create a private repository and enable GitHub Actions (including Actions-created PRs), and **one** provider API key. Choose OpenAI, Anthropic, OpenRouter, Qwen/Alibaba, Z.ai/GLM, or a compatible custom endpoint. Add the key as a **GitHub Actions repository secret**, not in source files or Issues. Set your model-provider spending limits; GitHub Actions usage limits and charges may also apply.

**Only when the approved architecture requires them:** you may need an infrastructure account and scoped credentials (for example, Cloudflare for a Cloudflare deployment). Buildkit presents resource requirements, estimated/unknown costs, and permissions for approval first. An optional research search service can improve market evidence; it is not required to start.

**Local or self-hosted execution is an advanced, separate setup**, not part of the browser-only Quick start. You would manage Git, Node.js 22/npm, Docker Engine or an equivalent Docker-compatible runtime, a shell, model access, and any additional tools required by your selected build adapter. See the [prerequisites and execution modes](docs/HARNESS.md#prerequisites-and-execution-modes).

## Quick start

1. Click **[Use this template](https://github.com/tinmanlabsl/buildkit/generate)**. Create a **private** repository for your product.
2. In the new repository: **Settings → Actions → General**. Enable Actions and **Allow GitHub Actions to create and approve pull requests**. The workflows request their own scoped permissions.
3. Add your provider's **GitHub Actions secret** and model variables using the table below. Existing `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` setups still work without new variables. Consumer chat subscriptions do not necessarily cover API usage.
4. Open **Issues → New issue → Build a product**, describe what you want in a few sentences, and submit. Buildkit opens a draft PR and comments when it needs a decision.
5. On the **issue**, reply `/approve CODE` (use the supplied code), `/revise what to change`, or `/status`. Review the source evidence and architecture before approving.

### Bring your preferred coding model

Set these in **Settings → Secrets and variables → Actions** in the new product repository:

| Provider | Secret | `BUILDKIT_MODEL_PROVIDER` variable | Model selection |
|---|---|---|---|
| OpenAI / Codex | `OPENAI_API_KEY` | `openai` (optional) | Native default, or `BUILDKIT_MODEL` |
| Anthropic / Claude Code | `ANTHROPIC_API_KEY` | `anthropic` (optional for sole native key) | Native default, or `BUILDKIT_MODEL` |
| OpenRouter | `OPENROUTER_API_KEY` | `openrouter` | Set `BUILDKIT_MODEL` to the exact provider/model ID |
| Qwen / Alibaba | `QWEN_API_KEY` | `qwen`, `qwen-cn` or `qwen-us` | Exact regional model ID |
| Z.ai / GLM | `ZAI_API_KEY` | `zai` or `zai-coding` | Exact model ID available under the selected API/plan |
| Custom compatible endpoint | `BUILDKIT_API_KEY` | `custom` | Exact model, public HTTPS base URL and API protocol |

OpenCode runs the new provider options; Buildkit configures it automatically. Before a new model receives product source, a small live read/edit probe checks tool compatibility. There is **no silent model or billing-plan fallback**. API compatibility does not guarantee coding quality. Region, model access and quotas must match your account.

A different model can independently review the builder, including via the same OpenRouter account. The same model through another CLI or gateway does not count as independent. Human code/security review remains available. See **[model/provider setup, custom endpoints, review and costs](docs/MODELS.md)**.

**No Cloudflare decision is required at the outset.** Buildkit proposes an execution and resource plan *after researching the product and creating the HLD*. You approve the stack, expected costs, permissions and requested resources. Cloudflare is one possible adapter, not the architecture. You do not paste credentials into Issues.

## The approval-driven workflow

| Phase | Buildkit executes | You review |
|---|---|---|
| **Product direction** | Retrieve GitHub/Hugging Face records and any configured market search sources; propose MMFS and document gaps | User, problem, exclusions, cited sources |
| **Architecture and feasibility** | Produce PRD/HLD, execute critical checks and select the build/preview/deployment adapters in `docs/EXECUTION_PLAN.json` | Requirements, architecture, rationale, unverified dependencies and adapter availability |
| **Infrastructure consent** | Show exact data resources, staging isolation, account permissions, variable usage costs, domain intent and operations in `docs/INFRA_PLAN.json` | **Separately approve actual resource creation** or revise; domain changes wait for production approval |
| **Implementation** | Generate complete requirement-mapped LLD blocks (no total-block ceiling), run small dependency-ready batches with checkpoints, and verify using the selected Node/Python/Rust adapter | Actual implemented requirements and evidence; no MMFS features omitted to satisfy a counter |
| **Selected preview adapter** | For approved Workers apps, deploy a hashed build and run Playwright. Other targets keep their own runtime and require a compatible adapter | Review real product evidence where supported; unsupported adapters are explicit BLOCKs, not converted to Workers |
| **Independent code/security review** | Record a separate-model PASS bound to the preview artifact, or request explicit human review | Inspect PR diff, secrets, authorization, dependency audit; `/review CODE` if prompted |
| **Production decision** | Assess security and applicable compliance, preserving the exact reviewed artifact identity | Costs, version, security evidence and deployment target |
| **Production release** | **Only after separate approval**, merge reviewed product code and use the chosen deployment adapter; Workers releases reuse exact preview-tested bytes and attach only an approved custom domain | Actual deployment evidence and follow-up monitoring |

**Every gate is bound to the files reviewed.** Buildkit records evidence and saves completed blocks so `/resume` does not blindly restart everything. Commands: `/start`, `/status`, `/approve CODE`, `/revise feedback`, `/refresh-research optional sources`, `/review CODE` (only when a separate code/security sign-off is requested), `/resume`, and for regulated products after qualified review `/attest COMPLIANCE-REVIEWED`.

### Research must distinguish proof from assumptions

Research is stored in `docs/research/EVIDENCE.json` and `docs/research/SOURCES.md`. The direction document cites evidence IDs such as `[E-001]`. Sources missing or market claims without evidence are explicitly marked **UNVERIFIED**. Feasibility plans and real observations are stored in `spikes/plan.json` and `spikes/results.json`; critical failures **block** the next stage. A retrieved model card or API documentation alone is not proof that your model or integration works.

The default research routes cover GitHub and Hugging Face metadata; customer/competitor web discovery needs a configured search endpoint or supplied source URLs. After adding a source/search connection or changing the market brief, use `/refresh-research details-or-links`: Buildkit must regenerate the decision and invalidate dependent approvals. No tool can guarantee every market claim is true. Read the gaps, not just the recommendation.

## Cloudflare preview and release setup

Do this **in the generated product repository**, not `tinmanlabsl/buildkit`:

| GitHub Actions setting | Required for | Meaning |
|---|---|---|
| Secret `CLOUDFLARE_ACCOUNT_ID` | Preview and release | Cloudflare account identifier |
| Secret `CLOUDFLARE_PREVIEW_TOKEN` | Preview | Scoped permission to create/update **preview** deployments |
| Secret `CLOUDFLARE_PROD_TOKEN` | Production | Separate credential for approved **production** deployment |
| Secret `CLOUDFLARE_PROVISION_TOKEN` | Approved resource creation | Narrowly scoped D1/KV/R2 provisioning; never passed to coding agents |
| Variable `BUILDKIT_WORKER_NAME` | Optional guard | If supplied, must equal the **Worker name in the approved HLD**; not required for non-Cloudflare apps |

For Cloudflare applications using D1, KV or R2, Buildkit **proposes the exact resource names, permissions and cost assumptions**, requests a separate authorization, then provisions and verifies preview and production resources using the account-scoped provisioning credential. The coding agent receives only resolved nonsecret binding identifiers. Custom domains are applied **only after a separate approved production release**. An unknown monthly estimate is not a spending cap. A public Preview URL is **not secret**: configure [Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) for private content, and never expose real customer data in test fixtures. Cloudflare permissions, app integrations and migrations may still require user authorization.

Optional: `BUILDKIT_SEARCH_ENDPOINT` (repository variable; HTTPS JSON search endpoint returning `results`), `BUILDKIT_SEARCH_KEY` (secret), and `BUILDKIT_SPIKE_HOSTS` (variable; comma-separated approved public hosts). External API keys are stored only in secrets and never in `wrangler.json`, issue comments or code.

## Security and cost principles

- Sensitive filenames and values are blocked before commit. **Gitleaks** runs in the GitHub harness and CI against the repository/diff; a local hook can be installed with `bash scripts/install-hooks.sh`.
- `.gitignore` is necessary but **not sufficient**: tracked files and normal source files are also scanned. If a key leaks, **revoke/rotate it**; Git history cleanup alone is not remediation.
- Generated build/test scripts run in isolated containers without model/GitHub keys. Each model child process receives only its selected credential; OpenCode uses a disposable workspace and restricted file tools. This is not an OS sandbox for hostile tenants.
- Cloudflare preview and production credentials are separate from coding-agent credentials. Approval gates prevent automatic production deployment; failures stop the workflow rather than silently claiming success.
- Model usage records preserve unknown cost as unknown. Call/time/token limits and optional observed-cost checks do not replace provider-side spending limits. This free repository does **not** pay for coding-model tokens, third-party APIs, GitHub runner overages, Cloudflare paid resources or GPU workloads.

### Runtime and cost boundaries

Buildkit's **product specification and unlimited checkpointed block plan are platform-neutral**. The current automated verification recipes are Node/npm, Python/pytest and Rust/Cargo; Cloudflare Workers remains the available managed live-preview/release adapter. A native app, GPU pipeline or external host can be chosen by the HLD, but Buildkit must report a missing build/preview/deploy adapter rather than claiming deployment or quietly replacing the stack. Supported adapters can be extended without changing the product approval process.

For unsupported external resource providers, Buildkit records the necessary resources and costs and pauses at a specific provisioning-adapter blocker. It does not create unrelated Cloudflare databases. **Free OSS software does not imply free compute or unlimited provider quotas.**

## More detailed guides

- **[Complete walkthrough, setup, approvals, troubleshooting](docs/HARNESS.md)**
- **[Model providers, OpenRouter/Qwen/GLM and custom APIs](docs/MODELS.md)**
- **[Specification templates](docs/PRD_TEMPLATE.md)**: [PRD](docs/PRD_TEMPLATE.md) · [HLD](docs/HLD_TEMPLATE.md) · [LLD](docs/LLD_TEMPLATE.md)
- **[Release checklist](docs/RELEASE_CHECKLIST.md)**
- **[Prompts reference](PROMPTS.md)**, [manual playbook](START-HERE.md), [worked exercise](FIRST-PRODUCT-EXERCISE.md)
- **[Agent rules](AGENTS.md)** and project-local skills in `.agents/skills/` and `.claude/skills/`
- **[Architecture/examples](examples/)**: Cloudflare Worker and Modal inference (examples, not automatically configured infrastructure)

### Current proof boundary

Unit/flow tests and GitHub CI exercise the controller with mocked AI/GitHub, real Docker/npm fixtures and the pinned OpenCode CLI, not a paid-provider end-to-end product build. Each user's OpenCode model must pass a live capability preflight. The Cloudflare preview/release jobs require each user's authorized account and real credentials. Generated E2E test **quality**, required compliance sign-off and real customer integration must still be assessed. See workflow logs and evidence; do not equate a passing CI run with business or regulatory assurance.

**Licence:** [MIT](LICENSE). This is a single open-source workflow, not artificially separated into feature tiers.
