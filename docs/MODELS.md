# Choose the model that builds your product

Buildkit separates the **coding agent** (the program that edits files) from the **model provider** (the API serving the model). Your research → MMFS → PRD/HLD/LLD → build → review → release workflow stays the same.

Existing OpenAI/Codex and Anthropic/Claude Code setups continue working. OpenRouter, Qwen, Z.ai/GLM and compatible custom endpoints run through **OpenCode**, installed automatically on the GitHub runner. You do not install another application locally.

## Start with one provider

In **your private product repository**, open **Settings → Secrets and variables → Actions**. Put credentials under **Secrets**; put the provider and model choices under **Variables**.

| Your provider | Repository secret | `BUILDKIT_MODEL_PROVIDER` variable | `BUILDKIT_MODEL` variable |
|---|---|---|---|
| OpenAI using Codex | `OPENAI_API_KEY` | `openai` (optional for existing setup) | Optional; native CLI default retained |
| Anthropic using Claude Code | `ANTHROPIC_API_KEY` | `anthropic` (optional when it is the only native key) | Optional; native CLI default retained |
| OpenRouter | `OPENROUTER_API_KEY` | `openrouter` | Exact model ID from your OpenRouter account, including its publisher prefix |
| Qwen / Alibaba Singapore | `QWEN_API_KEY` | `qwen` | Exact model ID available in that region/account |
| Qwen / Alibaba China | `QWEN_API_KEY` | `qwen-cn` | Exact model ID available in that region/account |
| Qwen / Alibaba US | `QWEN_API_KEY` | `qwen-us` | Exact model ID available in that region/account |
| Z.ai general API | `ZAI_API_KEY` | `zai` | Exact GLM model ID available to your API account |
| Z.ai Coding Plan | `ZAI_API_KEY` | `zai-coding` | Exact GLM model ID supported by your coding subscription |
| Custom compatible API | `BUILDKIT_API_KEY` | `custom` | Exact model ID; endpoint and protocol are also required below |

**OpenRouter example:** add its API key as `OPENROUTER_API_KEY`; set `BUILDKIT_MODEL_PROVIDER=openrouter`; copy the chosen model's full ID into `BUILDKIT_MODEL`. Open a Product Issue normally. Buildkit chooses OpenCode and the OpenRouter endpoint for you.

There is no hardcoded third-party model or automatic model fallback. A model must support reliable coding tool calls. Missing model IDs, inaccessible models, incompatible protocols and exhausted quotas stop with a blocker; Buildkit does not silently switch model or billing plan.

Qwen API keys and availability depend on the selected region. Z.ai's Coding Plan and general API are different endpoints and may have different billing/usage terms. Choose deliberately; neither a consumer chat subscription nor interactive OAuth login is assumed to authorize unattended GitHub execution. Provider credits, subscriptions and compute charges are external to free Buildkit software.

## Advanced: custom endpoint or protocol

Use the same GitHub Variables page:

| Variable | Value |
|---|---|
| `BUILDKIT_MODEL_PROVIDER` | `custom` |
| `BUILDKIT_AGENT` | `opencode` (also selected automatically for custom/new presets) |
| `BUILDKIT_MODEL` | Exact model ID |
| `BUILDKIT_API_BASE_URL` | Your trusted public HTTPS **API base**, not the full messages/completions endpoint |
| `BUILDKIT_API_PROTOCOL` | `chat-completions`, `responses`, or `anthropic` |
| `BUILDKIT_CONTEXT_TOKENS` | Actual supported model context, if different from the conservative 32,768 default |

The three protocol choices use OpenCode's OpenAI-compatible Chat Completions, OpenAI Responses and Anthropic adapters respectively. A label saying “OpenAI compatible” is not enough: the endpoint must implement the selected protocol and the selected model must complete the tool-use probe.

Known provider presets also accept an explicit base-URL override when using OpenCode, for example an authorized workspace-specific Alibaba endpoint. Never point a provider credential at an endpoint you do not control or trust. Configuring that endpoint authorizes sending build prompts and project source to it.

Public HTTPS is required; embedded credentials, query strings, IP literals, private/loopback endpoints and custom ports are rejected. A local or self-hosted model is usable only through an authorized, reachable, authenticated public HTTPS endpoint meeting this contract. `localhost` on a GitHub runner is not your computer. DNS checks and restricted tools are safeguards, not a hardened network-isolation guarantee.

**Native runtimes:** `BUILDKIT_AGENT=codex` is reserved for native OpenAI; `claude` is reserved for native Anthropic. Set `opencode` to use those providers through the generic API adapters. Existing `BUILDKIT_PROVIDER=codex|claude` remains a supported legacy setting; `BUILDKIT_MODEL_PROVIDER` takes precedence.

## Optional independent model review

You can build with Qwen and review with GLM, including through the same OpenRouter account and OpenCode runtime. Set:

- `BUILDKIT_REVIEW_MODEL_PROVIDER`: provider preset, such as `openrouter` or `zai-coding`.
- `BUILDKIT_REVIEW_MODEL`: the exact reviewer model ID.
- The relevant provider secret; optionally use a separate `BUILDKIT_REVIEW_API_KEY` instead.

Advanced reviewer settings mirror the builder: `BUILDKIT_REVIEW_AGENT`, `BUILDKIT_REVIEW_API_BASE_URL`, `BUILDKIT_REVIEW_API_PROTOCOL`, `BUILDKIT_REVIEW_CONTEXT_TOKENS`.

Review independence is deliberately conservative: the reviewer must belong to a known, different model family from **every model that wrote the implementation**. Merely using another CLI, API key, OpenRouter route or provider endpoint does not make the same model independent. Unknown aliases require an explicit correct `BUILDKIT_MODEL_FAMILY` / `BUILDKIT_REVIEW_MODEL_FAMILY` setting, or the existing human code/security review. Family declarations are configuration assertions, not vendor attestation.

A missing or non-independent reviewer leaves the separate human `/review CODE` gate in place. Product/UX approval and final production approval remain separate. Existing `BUILDKIT_REVIEW_PROVIDER=codex|claude` works as before.

## Compatibility preflight

Before sending product source to a newly selected OpenCode model in each Actions run, Buildkit uses a disposable directory with synthetic data. The model must actually read a random value from a file and edit a JSON file correctly; a reviewer must read it and return the requested JSON without editing. A successful HTTP response or an assertion that it can code does not count.

Failure stops before the real task. Correct the provider, model, plan/region, protocol or quota and use `/resume`; completed product checkpoints remain. Passing the probe establishes basic protocol/tool compatibility, **not** product quality or marketability. It is a real, small inference request billed to the user's provider, not a free provider health check.

## Credentials, tool permissions and cost controls

Only the selected model credential reaches that model's child process. GitHub, other model-provider and Cloudflare credentials are not passed to it. OpenCode runs with a disposable HOME/config/data directory and a copied product workspace without Git metadata; it has no shell, subagent, web-fetch or deployment tools. Sharing, auto-updates and external plugins are disabled. Its read-only reviewer cannot copy changes back. Temporary OpenCode state is removed after normal completion or failure; runner termination still relies on ephemeral runner cleanup.

Project-authored `opencode.json`, `opencode.jsonc` and `.opencode` contents are rejected. Configuration is supplied by Buildkit from administrator-controlled GitHub variables, not Issue text. Existing specification locks, protected-path checks, credential redaction and Gitleaks continue to apply. This is not an OS-level sandbox for hostile multi-tenant execution.

| Optional GitHub Variable | Default | Applies to |
|---|---|---|
| `BUILDKIT_MAX_AGENT_CALLS` | 32 per Actions run | All model calls, including OpenCode preflight |
| `BUILDKIT_AGENT_TIMEOUT_SECONDS` | 600 per call | Native and OpenCode calls |
| `BUILDKIT_MAX_AGENT_STEPS` | 20 | OpenCode tool/response loop |
| `BUILDKIT_MAX_OUTPUT_TOKENS` | 8,192 | OpenCode output limit |
| `BUILDKIT_CONTEXT_TOKENS` | 32,768 | OpenCode model-context declaration; never exceed actual model support |
| `BUILDKIT_MAX_RUN_COST_USD` | Not set | Stop **subsequent** calls when observed cost reaches the ceiling; stop if earlier cost cannot be determined |

Native Claude retains its existing per-call budget/turn controls. Native Codex/Claude output is not rewritten solely to infer billing. OpenCode token usage is recorded where supplied; unavailable tokens/costs remain `null`. A custom model's reported zero price is treated as unknown rather than free.

Nonsecret profile and usage summaries are stored in the private product's `.buildkit/state.json`; `/status` names the selected provider/model/runtime. Buildkit does not commit model transcripts or API keys. Call/time/token bounds and an observed-cost ceiling are **not a hard provider billing cap**: a current request may already incur charges, costs may be unavailable, and `/resume` starts a new bounded run. Set provider-side spending controls and review provider terms.

## Verification boundary

Buildkit includes offline profile/permission/workspace/review regression tests and a secret-free check against the pinned OpenCode CLI. These are not paid-provider end-to-end product tests. Each user's selected model must pass the live preflight before use. Unsupported protocol variants and weak coding models remain explicit blockers, not guaranteed compatibility with every API or model.

Reference documentation: [OpenCode CLI](https://opencode.ai/docs/cli/) · [OpenCode configuration](https://opencode.ai/docs/config/) · [OpenCode permissions](https://opencode.ai/docs/permissions/) · [Z.ai OpenCode integration](https://docs.z.ai/devpack/tool/opencode) · [Alibaba OpenAI compatibility](https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope) · [OpenRouter API](https://openrouter.ai/docs/api/reference/overview).

[Back to setup](HARNESS.md) · [README](../README.md)
