# Buildkit — the complete GitHub-native builder workflow

**Buildkit is free, MIT-licensed software.** GitHub Issues provide the interface, Actions runs approved tasks, and a private product repository holds evidence, PRD/HLD/LLD and code. The HLD—not Buildkit—chooses the stack. Cloudflare is an optional adapter for suitable products, not a product requirement.

## Prerequisites and execution modes

### Recommended: GitHub-hosted, browser-only

**No local software installation is required.** You can use Buildkit entirely through GitHub Issues and Pull Requests. The GitHub-hosted Actions runners supply Git and Docker, set up Node.js 22, fetch isolated Node/Python/Rust build images as required, and install the selected Codex, Claude Code or OpenCode CLI, Wrangler, Gitleaks and Playwright when needed. You do not have to run a terminal or maintain a Docker daemon on your laptop.

Before starting, have a GitHub account that can create a **private repository**, enable **GitHub Actions**, and permit Actions to create PRs. Choose a supported provider—OpenAI, Anthropic, OpenRouter, Qwen/Alibaba, Z.ai/GLM, or a compatible custom API—and store its key in that repository's **Actions secrets**. Select the exact model and provider where required. The key is billed under that provider's API or coding-plan terms; a consumer chat subscription is not automatically API credit. Review usage controls and your GitHub Actions quota. Avoid inserting tokens into Issues or committed configuration.

Cloudflare is **not** an installation prerequisite. If the approved HLD selects Cloudflare Workers, you will need an authorized Cloudflare account and the stage-specific credentials described below before Buildkit can provision resources, preview, or deploy. Other selected platforms have their own account/adapter requirements. You may optionally configure a market-search endpoint to improve research evidence; without it, relevant gaps must remain `UNVERIFIED`.

### Advanced: local or self-hosted execution

This is **not required for normal users** and is not a promise of one-command local product deployment. For local development of the harness or self-hosted runners, the operator must supply:

- Git, Node.js **22** with npm, and a shell capable of running the harness commands.
- A working Docker Engine / Docker-compatible CLI and daemon for isolated builds and credential scanning, with permission to pull images.
- The chosen model CLI or working access for the harness to install it, plus a provider API key and appropriate secret management.
- Any additional host tooling required by the selected runtime, network permissions and self-hosted runner configuration.

The GitHub Issue/Actions workflow remains the supported default. The harness's GitHub API calls, event payload, approvals and separate cloud credentials do not become optional simply because you run the code on your own machine.

## Start a product

1. [Use the Buildkit template](https://github.com/tinmanlabsl/buildkit/generate) to create a **private repository**. No Buildkit server is required.
2. In that repository go to **Settings → Actions → General**. Enable Actions and allow GitHub Actions to create pull requests (subject to organization rules).
3. Add **one provider key** under Actions Secrets. Native `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` setups still work unchanged. For OpenRouter, add `OPENROUTER_API_KEY`, set the Actions Variable `BUILDKIT_MODEL_PROVIDER=openrouter`, and set `BUILDKIT_MODEL` to the exact accessible model ID. [Qwen, Z.ai and custom endpoint setup](MODELS.md) uses the same pattern. Set provider-side spending controls.
4. Open **Issues → New issue → Build a product**, describe the desired outcome and hard requirements. Do not paste credentials in the Issue.
5. Review Buildkit's Issue comments and draft PR. Use the exact current `/approve CODE`, or `/revise your feedback`.

### Model choice and preflight

Buildkit chooses the appropriate coding runtime for the configured provider rather than forcing every API through Codex. New providers use pinned OpenCode with explicit model/protocol configuration. Before product source is copied into its workspace, a synthetic read/edit probe must pass. This is a small real inference request that may be billed; no automatic model or billing-plan fallback occurs.

If preflight fails, check the provider preset, region or coding-plan endpoint, exact model access, tool-call support and quota. Correct the repository settings and comment `/resume`. A successful probe establishes basic tool compatibility, not proof the model can deliver every product requirement.

Optional reviewer settings are `BUILDKIT_REVIEW_MODEL_PROVIDER` and `BUILDKIT_REVIEW_MODEL`, with the relevant provider secret or a dedicated `BUILDKIT_REVIEW_API_KEY`. Different known model families may review one another through the same runtime; the same model through another CLI or gateway is not independent review. Missing/unknown independence leaves the human `/review CODE` gate intact. [Complete provider and budget reference](MODELS.md).

## The actual approval sequence

| Stage | What Buildkit does | What you approve |
|---|---|---|
| Direction | Retrieves source evidence, maps product/user need and proposed MMFS | Scope, evidence quality and exclusions |
| PRD/HLD/feasibility | Generates testable requirements, architecture and executed critical probes | The proposed product, risks and alternatives |
| Execution and infrastructure plan | Produces `docs/EXECUTION_PLAN.json` (runtime/build/preview/deploy adapters) and `docs/INFRA_PLAN.json` (resources, actual names, expected cost, unknown charges, permission scopes and domain intent) | The stack that genuinely fits, rather than mandatory Cloudflare |
| Provisioning consent, **only if resources or a domain are requested** | Posts the exact resource names, permissions and cost exposure. Creates approved D1/KV/R2 resources in separate preview/production environments using a provisioning-only credential | A separate `/approve CODE` authorizes the listed resource creation. A custom domain remains deferred until production release |
| Implementation | Generates LLD and a dependency-aware, requirement-mapped build plan with **no total number-of-blocks ceiling** | Full MMFS implementation, not a reduced three-block demo |
| Verification | Executes small checkpointed blocks with the architecture's Node, Python or Rust test adapter; automatically dispatches the next bounded batch | Review test evidence and failed constraints |
| Preview | Uses the adapter selected in the HLD. For Workers applications: builds immutable output without deployment credentials and runs Playwright against Cloudflare Preview | The actual user experience |
| Code/security review | Independent model review if configured, otherwise explicit human `/review CODE` after inspecting the PR | Code and security evidence; UX approval alone is not a security assessment |
| Production release | Requires another explicit approval; rechecks exact approved source/immutable artifact, merges and deploys using the chosen supported adapter | Deployment target, cost exposure and any intended custom domain |

**Important:** Currently automated build verification adapters: Node/npm, Python/pytest and Rust/Cargo. Cloudflare Workers has the wired preview and production adapter. Choosing native iOS/Android, Modal/GPU or another cloud provider is allowed, **but the current harness stops and names the missing adapter instead of pretending that app ran on Cloudflare**. It does not silently change the approved HLD. Coding-model choice and application-hosting choice are separate decisions.

## The resource and cost decision

There is **no need to pick Cloudflare before research or HLD**. When an approved plan uses Cloudflare, configure these Actions settings *in the private product repository*:

| Setting | When needed | Purpose |
|---|---|---|
| Secret `CLOUDFLARE_ACCOUNT_ID` | Provision, preview and release | The selected Cloudflare account |
| Secret `CLOUDFLARE_PROVISION_TOKEN` | After explicit resource approval | Create/reconcile **only** the plan's named D1/KV/R2 resources |
| Secret `CLOUDFLARE_PREVIEW_TOKEN` | Preview | Upload the reviewed build to Workers Previews |
| Secret `CLOUDFLARE_PROD_TOKEN` | Production approval | Deploy only the release-approved application and apply any approved domain |
| Variable `BUILDKIT_WORKER_NAME` | Optional | Additional assertion only; if present it must match the name in the approved HLD |

Buildkit does not give model agents Cloudflare keys. It stores non-secret resource identifiers in `docs/infrastructure/PROVISIONED.json`. Production and preview D1/KV/R2 bindings must agree **exactly** with this record; the preview must never reuse production data resources.

For custom domains, the plan must specify an exact hostname and an **owned, active Cloudflare zone ID**. Buildkit checks for conflicting ownership/DNS and attaches it only after separately approved, successful production deployment. It never seizes an existing domain or overrides DNS records.

The resource plan must declare estimated monthly USD cost (or **UNKNOWN**), source of pricing, assumptions, ability to exceed estimates, Cloudflare permission scopes and operations. **An estimate is not a spending limit.** The software is free; model tokens, hosting, storage and external service charges remain the user's responsibility.

External providers may be included in the HLD and resource plan, but automated resource creation waits for a compatible adapter. Do not fabricate provisioning success.

## Review and recovery commands

Post commands only on the **original product Issue**:

| Command | Result |
|---|---|
| `/start` | Start an eligible unopened product workflow |
| `/status` | Report stage, selected model/runtime, completed blocks, latest gate and actual GitHub workflow status |
| `/approve CODE` | Approve the exact current scope, architecture, infrastructure, preview or production version as indicated |
| `/revise Describe changes` | Invalidate affected documents/approvals and regenerate; existing data resources are never silently destroyed |
| `/refresh-research New evidence/URLs` | Re-retrieve evidence and invalidate decisions based on stale sources |
| `/review CODE` | Record a separate source/security review acknowledgment (not an automated certification) |
| `/attest COMPLIANCE-REVIEWED` | Record that a suitably qualified reviewer addressed regulated-category concerns |
| `/resume` | Recover an interrupted or failed build/provision/preview/release using the **original approved SHA** |

Buildkit persists before a dispatch, checks real Actions runs before retries, and will not duplicate a still-running workflow. If a run completed but its final callback was lost, the workflow is reconciled and, when safe, only the **same approved request** is repeated. For implementation, each runner performs a small number of dependency-ready blocks, commits their evidence and auto-dispatches the next batch. If auto-continuation fails, `/resume` recovers without discarding completed blocks.

If an infrastructure/preview adapter is missing or an API token is insufficient, Buildkit stops with a named blocker. Add the required capability or revise the approved HLD; **do not quietly switch to Cloudflare or falsify test results**.

## Security and verification boundaries

Gitignore, protected paths, secret-pattern checks, Gitleaks scanning and isolated build/test containers reduce credential exposure but cannot guarantee no leaks. Revoke/rotate any exposed secret immediately. Each coding process still holds its dedicated model key, so this is not a hardened multi-tenant hostile-code execution service. OpenCode uses a disposable copied workspace, restricted file tools, disabled sharing/plugins and separate credentials; product code never configures its provider runtime.

Model call/timeout/step bounds and nonsecret usage records are described in [MODELS.md](MODELS.md). Unknown provider cost remains unknown; an observed-cost stop cannot prevent charges already incurred. Set provider-side limits. Changing model settings does not authorize changing the approved product scope or infrastructure.

Critical feasibility findings need executed evidence, not a model's assertion. Generated E2E tests should be inspected for meaningful user journeys. For regulated work, automated classification and human acknowledgment are **not** legal certification. Production operations should account for rollbacks, backup, migrations, quota and monitoring.

Do not infer a live provider-backed product build from the harness's mocked CI flow or no-inference CLI checks. Provider permissions and third-party credentials are never copied from the public template, and no Cloudflare resources are provisioned until the relevant user-approved product workflow runs.

[README](../README.md) · [Model providers](MODELS.md) · [Execution adapters](EXECUTION_ADAPTERS.md) · [Cloudflare provisioning](CLOUDFLARE.md) · [Evidence](EVIDENCE.md) · [Release checklist](RELEASE_CHECKLIST.md)
