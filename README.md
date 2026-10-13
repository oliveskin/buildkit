# Buildkit

**Have an idea for a product? Start with the idea, not a maze of AI tools.**

Buildkit is a free, open-source way to go from a plain-English idea to a researched plan, working code, tests and a reviewable release. It runs through **GitHub Issues and Actions**, with the coding model you choose. You review the important decisions; Buildkit handles the steps between them.

**[Get started: use the Buildkit template](https://github.com/tinmanlabsl/buildkit/generate)** · [See the walkthrough](docs/HARNESS.md)

## Who is it for?

- **People with a product idea** who want to start building without learning a collection of AI coding tools and workflows first.
- **Solo builders and small teams** who want more structure than prompting an agent to "build the whole app."
- **Developers** who want a repeatable, reviewable path from requirements through implementation and release.

You do not need to install Docker, Node.js, Git, Codex, Claude Code or OpenCode on your computer for the recommended GitHub-hosted workflow. GitHub Actions prepares the tools on its runners.

## How it works

| Step | What Buildkit does | Your part |
|---|---|---|
| **1. Describe your idea** | Starts a product workspace from a GitHub Issue | Say who it's for, what it should do and what matters to you |
| **2. Find the useful first version** | Researches relevant sources and proposes a **Minimum Marketable Feature Set (MMFS)** | Review the essential user journey, evidence, assumptions and exclusions |
| **3. Plan and check feasibility** | Creates product requirements (PRD), architecture (HLD), technical checks and an execution plan | Approve the approach, trade-offs and any proposed infrastructure costs |
| **4. Build and test** | Writes the detailed implementation plan (LLD), builds requirement-linked pieces and runs tests with saved checkpoints | Follow progress, request revisions or resume an interrupted run |
| **5. Review the result** | Produces a preview where a supported adapter exists, plus code/security review evidence | Try the product and review the code and findings |
| **6. Decide whether to release** | Deploys through a supported adapter only after the required approvals | Explicitly approve production release |

**MMFS means the smallest complete, useful set of features that delivers the product's core outcome**—not a collection of disconnected demo screens. For example, an appointment app's first version might let someone see available slots, make a booking, get confirmation and cancel. An analytics dashboard can come later. Buildkit proposes this scope; **you decide what belongs in it**. Market demand still needs real-world validation.

Buildkit doesn't silently remove approved requirements just to finish quickly. It links features to implementation tasks and tests, and pauses when important evidence or a required integration is missing.

## Start building

1. **[Create a private repository from this template](https://github.com/tinmanlabsl/buildkit/generate).** This public repository is the template; your product's code and decisions live in your own repository.
2. In your new repository, go to **Settings → Actions → General**. Enable GitHub Actions and allow Actions to create and approve pull requests.
3. In **Settings → Secrets and variables → Actions**, add a coding-model API key as a **repository secret**. For OpenRouter, Qwen, Z.ai or custom APIs, also select a model using the variables in the table below.
4. Go to **Issues → New issue → Build a product**. Describe what you want in everyday language. You can include budget, privacy requirements, integrations and preferred technologies.
5. Review the comments and draft pull request. Reply on the Issue with **`/approve CODE`** using the code supplied for the current decision, or **`/revise what you'd like changed`**.

You can check progress with `/status` and recover an interrupted workflow with `/resume`. Buildkit asks again before it provisions approved resources or releases to production. **Never paste API keys into Issues.**

## Choose your coding model

Bring an API key from a provider you already use. Buildkit can use Codex, Claude Code or OpenCode behind the scenes—you don't have to install or manage these CLIs yourself.

Set **Secrets** and **Variables** in the new product repository's GitHub Actions settings:

| Provider | Repository secret | `BUILDKIT_MODEL_PROVIDER` variable | Model |
|---|---|---|---|
| **OpenAI / Codex** | `OPENAI_API_KEY` | `openai` (optional) | CLI default or `BUILDKIT_MODEL` |
| **Anthropic / Claude** | `ANTHROPIC_API_KEY` | `anthropic` (optional if it's your only key) | CLI default or `BUILDKIT_MODEL` |
| **OpenRouter** | `OPENROUTER_API_KEY` | `openrouter` | Set `BUILDKIT_MODEL` to the exact model ID |
| **Qwen / Alibaba** | `QWEN_API_KEY` | `qwen`, `qwen-cn` or `qwen-us` | Exact model ID available in your region |
| **Z.ai / GLM** | `ZAI_API_KEY` | `zai` or `zai-coding` | Exact model ID available to your API or Coding Plan |
| **Other compatible APIs** | `BUILDKIT_API_KEY` | `custom` | Exact model ID, HTTPS API base URL and protocol |

**Example with OpenRouter:** add `OPENROUTER_API_KEY` under Secrets. Add `BUILDKIT_MODEL_PROVIDER=openrouter` and `BUILDKIT_MODEL=<your exact OpenRouter model ID>` under Variables. Then create your product Issue.

Buildkit checks that a newly selected OpenCode model can actually read and edit files before letting it work on your product. Not every model or “OpenAI-compatible” endpoint supports the required coding tools. It won't silently switch models or billing plans. An optional **different model family** can perform an independent code review, or you can complete the separate human review.

[Full model setup: supported APIs, custom endpoints and optional reviewers](docs/MODELS.md)

## What works today

Buildkit can research publicly available GitHub and Hugging Face sources, propose product scope, create specifications, check technical risks, write code in checkpointed blocks and run verification. Broader competitor/customer research requires a configured search service or source links; missing evidence is identified rather than invented.

| Capability | Current support |
|---|---|
| **Coding models** | OpenAI, Anthropic, OpenRouter, Qwen, Z.ai/GLM and compatible custom APIs, subject to model/tool compatibility |
| **Build verification** | Node.js/npm, Python/pytest and Rust/Cargo |
| **Hosted preview and production deployment** | Cloudflare Workers |
| **Cloudflare data resources** | Approval-gated D1, KV and R2 provisioning, with separate preview/production resources |
| **Other hosting, native mobile apps and GPU infrastructure** | Can be specified in the architecture, but automatic preview, deployment or provisioning adapters may be unavailable; Buildkit stops and explains what's missing |

**You don't have to choose Cloudflare to start.** The architecture is chosen for the product, not for the harness. If deployment requires an adapter Buildkit doesn't yet support, it does not substitute a different platform or claim the product is deployed.

[Execution and deployment support](docs/EXECUTION_ADAPTERS.md) · [Cloudflare setup](docs/CLOUDFLARE.md)

## Costs, privacy and approvals

**Buildkit itself is free (MIT licensed).** You pay for any model API usage, GitHub Actions usage beyond your available allowance, and hosting, storage or other services you choose. Model call limits are not guaranteed spending caps; use your provider's usage controls.

Your model keys belong in GitHub Actions **Secrets**, never in Issues or committed files. The selected coding provider processes prompts and relevant product source, so choose an endpoint you trust. Generated code runs through checks, but automated tests and model review cannot guarantee security, market demand, or legal compliance. Preview URLs may be public unless access controls are configured.

Infrastructure creation and production release require **separate explicit approvals**. A proposed cost estimate—including an unknown estimate—is information for your decision, not permission for unlimited spending.

## Guides and reference

- [Step-by-step setup and approvals](docs/HARNESS.md)
- [Model providers and OpenRouter / Qwen / GLM setup](docs/MODELS.md)
- [Supported execution and deployment adapters](docs/EXECUTION_ADAPTERS.md)
- [Security and credential handling](docs/SECURITY.md)
- [Product requirements template](docs/PRD_TEMPLATE.md) · [Architecture template](docs/HLD_TEMPLATE.md) · [Implementation template](docs/LLD_TEMPLATE.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)

Have a problem or improvement in mind? [Open an issue](https://github.com/tinmanlabsl/buildkit/issues).

**License:** [MIT](LICENSE).
