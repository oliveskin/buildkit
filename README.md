# Buildkit — the solo AI product builder's playbook

## Start here: build a product through GitHub

**No local setup or prompt copying needed.** Buildkit uses GitHub Issues as a guided interface and GitHub Actions to run an AI coding agent. It asks you to approve important outputs instead of asking you what to do next.

### Your first product (about four setup steps)

1. **[Use this template](https://github.com/oliveskin/buildkit/generate)** to create a new **private** repository for your idea. Do this in your own GitHub account. If the template button is missing, the maintainer must enable **Settings → General → Template repository** on the source repository (or you can copy the files).
2. In **your new product repository**, open **Settings → Actions → General**. Ensure Actions are enabled. Under **Workflow permissions**, enable **Allow GitHub Actions to create and approve pull requests**, then Save. Buildkit's workflow already requests scoped `contents: write`, `issues: write`, and `pull-requests: write`. If your account/org restricts those scopes, adjust the setting with your administrator.
3. Go to **Settings → Secrets and variables → Actions → New repository secret**. Add **one**: `OPENAI_API_KEY` (Codex, default) **or** `ANTHROPIC_API_KEY`. For Claude add an **Actions repository variable** `BUILDKIT_PROVIDER=claude`. Model usage is separately billed. Never paste keys in Issues.
4. Open **Issues → New issue → Build a product**, describe your idea in a sentence or two, and submit. The GitHub Action starts automatically. Watch the issue for updates and the Actions tab for logs.

### What happens next?

| Stage | Buildkit does | Your action |
|---|---|---|
| **1. Direction** | Proposes target user, MMFS, exclusions and risks in `docs/DIRECTION.md` | Review the draft PR. Comment `/approve CODE` or `/revise your feedback` on the **issue** |
| **2. Product & architecture** | Generates PRD, HLD and feasibility notes | Approve or request changes |
| **3. Implementation** | Writes LLD, builds up to 3 bounded blocks, runs npm build/tests and optionally uses a second model for review | Inspect code, tests and preview evidence; approve or revise |
| **4. Manual release** | Marks the work ready for release review | Independently verify, merge and deploy yourself |

The approval code is supplied in each Buildkit issue comment. Approval is tied to the exact generated content. Commands: `/start`, `/status`, `/approve CODE`, `/revise feedback`, `/resume` (after a blocked step).

**Important:** An automatically generated draft PR is **not** a running product. Buildkit does **not** merge, deploy, provision paid infrastructure, or guarantee that every generated app works without review. Never publish without independent testing and checking costs and security. If your issue receives no response, check **Actions → Buildkit · guided product build** for failures and [follow the troubleshooting guide](docs/HARNESS.md#troubleshooting).

**Maintainer setup:** Enabling the GitHub template flag is a one-time action on `oliveskin/buildkit`; workflow permissions and API keys are configured **separately in each new user's product repository**. See [full harness setup](docs/HARNESS.md) for screenshots-free exact paths and recovery steps.

---

**Go from an idea to a working, deployed, market-testable product with Claude Code, Codex, GitHub, Cloudflare, Hugging Face and Modal — without building unnecessary infrastructure.**

This is a **hands-on kit**, not a course. It includes reusable prompts, PRD/HLD/LLD templates, project-level agent rules, six development/quality skills for both Claude and Codex, a starter inference connection, and a worked exercise.

> **Principle:** Build the smallest *marketable* feature set (MMFS), not the smallest half-working demo. The product needs one real, complete user journey, trustworthy behaviour and a live deployment.

## Manual build playbook (optional: skip if using the guided GitHub harness)

1. Read **[START-HERE.md](START-HERE.md)** — step-by-step plan, commands, low-cost stack and reference links.
2. Read **[PROMPTS.md](PROMPTS.md)** — copy/paste prompts 01–14 for research, planning, coding, reviewing and release.
3. Try **[FIRST-PRODUCT-EXERCISE.md](FIRST-PRODUCT-EXERCISE.md)** — guided first implementation.
4. When starting a real project, copy the templates and relevant skills into that project's repository.

### The build sequence

`Idea → competitor/OSS research → MMFS scope → PRD → HLD → feasibility spike → LLD → build blocks → independent review → deploy → verify → iterate`

| Phase | Use this | Exit condition |
|---|---|---|
| Find the problem | [Prompts 01–02](PROMPTS.md) | Real customer/job, clear MMFS, specific exclusions |
| Specify the product | [PRD template](docs/PRD_TEMPLATE.md), [prompt 03](PROMPTS.md) | Testable user journeys and acceptance criteria |
| Challenge independently | [Prompt 04](PROMPTS.md) | High-risk assumptions corrected |
| Design the cheapest system | [HLD template](docs/HLD_TEMPLATE.md), [prompt 05](PROMPTS.md) | Architecture, auth, APIs, data, cost and limits identified |
| Prove the difficult parts | [Prompt 06](PROMPTS.md) | A measured spike confirms real integration feasibility |
| Specify implementation | [LLD template](docs/LLD_TEMPLATE.md), [prompt 07](PROMPTS.md) | Schemas, routes, screens, state and ordered build blocks |
| Build/review one block | [Prompts 08–09](PROMPTS.md), [agent rules](AGENTS.md) | Actual tests + independent diff review |
| Ship and verify | [Prompt 10](PROMPTS.md), [release checklist](docs/RELEASE_CHECKLIST.md) | Correct commit on production; core journey smoke-tested |
| Learn | [Prompt 14](PROMPTS.md) | Real behaviour and cost guide the next release |

## Tools to install (as needed)

- **Coding CLIs:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) and [OpenAI Codex CLI](https://github.com/openai/codex). Use one to build and the other to challenge/review.
- **Source control:** [Git](https://git-scm.com/), [GitHub](https://github.com/) and [GitHub CLI](https://cli.github.com/manual/).
- **Frontend + API:** [Cloudflare Workers](https://developers.cloudflare.com/workers/) and [Wrangler](https://developers.cloudflare.com/workers/wrangler/).
- **Models:** [Hugging Face models](https://huggingface.co/models) and [HF CLI](https://huggingface.co/docs/huggingface_hub/en/guides/cli).
- **Inference only if required:** [Modal](https://modal.com/docs) — verify current free credits, usage limits and cold-start behaviour before deploying.
- **Test and skills:** [Playwright](https://playwright.dev/), [Skills directory](https://skills.sh/), [Superpowers](https://github.com/obra/superpowers), [Anthropic frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design).

**Cost rule:** use deterministic code first; use managed inference or a small open model second; add paid, always-on GPUs *only when measured product demand justifies it*. A free tier is a starting point, not a promise of zero bills.

## The six project-local skills

| Skill | Why it matters | Codex path | Claude path |
|---|---|---|---|
| Anti-slop | Prevent generic UI, fake integrations and inert controls | [anti-slop](.agents/skills/anti-slop/SKILL.md) | [anti-slop](.claude/skills/anti-slop/SKILL.md) |
| Scope guard | Stop feature creep beyond approved MMFS | [scope-guard](.agents/skills/scope-guard/SKILL.md) | [scope-guard](.claude/skills/scope-guard/SKILL.md) |
| OSS-first | Reuse vetted maintained code instead of reinventing | [oss-first](.agents/skills/oss-first/SKILL.md) | [oss-first](.claude/skills/oss-first/SKILL.md) |
| HF model evaluation | Test task fitness, licensing, latency, cost | [hf-model-eval](.agents/skills/hf-model-eval/SKILL.md) | [hf-model-eval](.claude/skills/hf-model-eval/SKILL.md) |
| Cost-first | Question unnecessary infra and inference spend | [cost-first](.agents/skills/cost-first/SKILL.md) | [cost-first](.claude/skills/cost-first/SKILL.md) |
| Release truth | Separate coded, merged, deployed and tested | [release-truth](.agents/skills/release-truth/SKILL.md) | [release-truth](.claude/skills/release-truth/SKILL.md) |

The skill definitions are intentionally duplicated for both conventions. `AGENTS.md` is for Codex/cross-agent project instructions, and `CLAUDE.md` is for Claude Code. See [skills copy script](scripts/copy-skills-for-claude.sh) if starting with only `.agents/skills`.

## Build and deploy reference

For a simple web product, **Cloudflare Workers + a frontend + D1 when SQL is needed + R2 when file storage is needed** is a reasonable default. A Worker is *not* a GPU. If model inference requires one, run the smallest viable open model on Modal, behind a private HTTPS endpoint.

```text
User browser
   ↓
Cloudflare frontend + Worker API (authentication, rate limiting)
   ├── D1 / R2 (only if needed)
   └── Modal HTTPS endpoint (only if inference is needed)
           └── Hugging Face model
```

Starter examples:

- [Modal inference demo (Python)](examples/modal_inference.py)
- [Cloudflare Worker inference proxy (TypeScript)](examples/cloudflare_worker_proxy.ts)
- [Full walkthrough and commands](START-HERE.md#6-wire-model-inference-cheaply)

**Important:** these are integration *examples*, not a turnkey production backend. They require credentials, deployment configuration, an appropriate model and production security/reliability checks. Never commit keys or expose inference secrets in browser code.

## Working rules

- First research **maintained OSS**, current licences, model cards and direct customer evidence.
- Maintain a **PRD** (what), **HLD** (architecture) and **LLD** (implementation contract); log decisions in [DECISIONS.md](docs/DECISIONS.md).
- Build **one small vertical slice per branch**; parallelize only independent blocks with separate file ownership/worktrees.
- Run real tests, type checks and browser journeys. A second model's agreement is not evidence.
- Distinguish **implemented / reviewed / merged / deployed / production-verified** using [STATUS.md](docs/STATUS.md).
- Protect secrets and user data; review auth boundaries, failure states and cost before accepting a release.

## Repository contents

```text
README.md                         ← this entry point
START-HERE.md                     ← practical step-by-step manual
PROMPTS.md                        ← 14 copyable prompts
FIRST-PRODUCT-EXERCISE.md         ← worked beginner exercise
AGENTS.md / CLAUDE.md             ← agent instructions
docs/                             ← PRD / HLD / LLD and release templates
.agents/skills/                   ← six Codex-compatible project skills
.claude/skills/                   ← the same six Claude skills
examples/                         ← Modal + Cloudflare inference examples
scripts/                          ← skills utility
```

## A note about reuse

This repository is published for reading and practical reference. A **public** GitHub repository does not automatically grant an open-source reuse licence. If you intend to redistribute or modify these files, check whether a licence has been added by the maintainer.
