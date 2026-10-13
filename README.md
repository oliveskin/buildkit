# Buildkit

**Approval-driven AI product building, directly in GitHub.** Turn an idea into PRD, HLD, LLD and reviewable code with Claude Code or Codex. You make the important decisions; Buildkit manages the next step.

## Start a product

1. **[Use this template](https://github.com/tinmanlabsl/buildkit/generate)** to create your own **private product repository**.
2. In that new repo, enable Actions and **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests**. Organization policy may require an administrator.
3. Add **one Actions repository secret**: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. The matching provider is selected automatically; Codex is the default with both keys. API charges are yours.
4. Open **Issues → New issue → Build a product**, describe your idea, and submit with the `[Product]` title prefix.
5. Review the generated summary and draft PR. Reply `/approve CODE` or `/revise your feedback` on the **issue**. Buildkit selects the next step.

**[Full setup, example walkthrough and recovery guide →](docs/HARNESS.md)**

```text
Idea → direction approval
     → PRD + HLD + feasibility notes → architecture approval
     → LLD + 1–3 build blocks + npm checks → code-review approval
     → manual review, merge and deployment
```

Commands: `/start` · `/status` · `/approve CODE` · `/revise feedback` · `/resume`.

## What the guided workflow does

| You review | Buildkit produces |
|---|---|
| Product direction | Target user, smallest marketable feature set, exclusions and risks |
| Product and architecture | PRD, HLD and feasibility notes |
| Implementation | LLD, bounded code blocks, isolated npm build/test results and optional separate-model static review |

Approvals bind the actual file contents. Approved specifications are protected against silent changes. Each successful block is checkpointed, so `/resume` does not discard previously verified work. A failed build is a failed Actions run. Generated npm scripts run in isolated containers without GitHub/model credentials or runner-home access.

**Current boundary:** this is a starter harness for small Node/npm web products, not a guaranteed autonomous product factory. The code-review gate is **not a hosted preview**. Market/OSS research and real feasibility experiments need sources/access and may remain unverified. Model and assertion quality still need review. It **never auto-merges or deploys**. See [tested behaviour and remaining gaps](docs/AUDIT.md).

The source template is enabled on `tinmanlabsl/buildkit`. Each user's product repo needs its own Actions permissions and keys; settings and secrets are not inherited.

## Manual playbook and reusable materials

These are the optional local/manual route, not extra setup required for the GitHub harness.

| Material | Open |
|---|---|
| Practical build sequence, commands, low-cost stack and references | [START-HERE.md](START-HERE.md) |
| 14 prompts: research, specification, implementation, review and release | [PROMPTS.md](PROMPTS.md) |
| Guided first-product exercise | [FIRST-PRODUCT-EXERCISE.md](FIRST-PRODUCT-EXERCISE.md) |
| Product specification templates | [PRD](docs/PRD_TEMPLATE.md) · [HLD](docs/HLD_TEMPLATE.md) · [LLD](docs/LLD_TEMPLATE.md) |
| Decision, status and release records | [Decisions](docs/DECISIONS.md) · [Status](docs/STATUS.md) · [Release checklist](docs/RELEASE_CHECKLIST.md) |
| Agent instructions | [AGENTS.md](AGENTS.md) · [CLAUDE.md](CLAUDE.md) |
| Inference examples, not configured production backends | [Modal](examples/modal_inference.py) · [Cloudflare Worker](examples/cloudflare_worker_proxy.ts) |

## Six project skills

| Skill | Purpose | Codex / cross-agent | Claude |
|---|---|---|---|
| Anti-slop | Reject fake integrations, generic UI and inert controls | [Skill](.agents/skills/anti-slop/SKILL.md) | [Skill](.claude/skills/anti-slop/SKILL.md) |
| Scope guard | Stay within approved MMFS | [Skill](.agents/skills/scope-guard/SKILL.md) | [Skill](.claude/skills/scope-guard/SKILL.md) |
| OSS-first | Reuse vetted components before rebuilding | [Skill](.agents/skills/oss-first/SKILL.md) | [Skill](.claude/skills/oss-first/SKILL.md) |
| HF model evaluation | Check task fitness, licensing and serving cost | [Skill](.agents/skills/hf-model-eval/SKILL.md) | [Skill](.claude/skills/hf-model-eval/SKILL.md) |
| Cost-first | Avoid unnecessary infrastructure and inference | [Skill](.agents/skills/cost-first/SKILL.md) | [Skill](.claude/skills/cost-first/SKILL.md) |
| Release truth | Separate built, reviewed, merged, deployed and verified | [Skill](.agents/skills/release-truth/SKILL.md) | [Skill](.claude/skills/release-truth/SKILL.md) |

Six definitions are mirrored for the two agent conventions. The [copy script](scripts/copy-skills-for-claude.sh) keeps them aligned. Skill instructions are not proof that every check ran; browser and deployment checks need the corresponding tools and evidence.

## Cost and release rules

Use deterministic code first; adopt a model only when justified. Cloudflare can host the finished application; Modal is an optional inference host, not a required harness service. Free infrastructure does not mean free model/API usage. Set budgets, protect secrets and independently review generated code before exposing it to real users.

**One useful complete workflow beats a large unfinished demo.** Do not silently reduce approved requirements to fit a three-block run.

## Project status and reuse

[Audit and outstanding work](docs/AUDIT.md) · [About metadata](docs/ABOUT.md)

No licence has been selected yet. Do not describe the public repository as unrestricted open source until an explicit reuse licence is added by the maintainer.
