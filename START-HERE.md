# THE SOLO BUILDER — Practical AI Product Playbook

**For:** a technically comfortable person shipping an actual product with Claude/Codex, open source, Hugging Face, Modal, GitHub, and Cloudflare.  
**Approach:** research → PRD → HLD → test the risky bits → LLD → build → independently verify → deploy → learn.  
**Rule:** the smallest **marketable** feature set (MMFS) is a finished, usable core workflow—not a half-working demo.

## 0. Set up once (macOS/Linux/WSL examples)

Accounts: GitHub, Cloudflare, Hugging Face, Modal, and at least one coding agent with access (Claude Code or Codex CLI). A second independent reviewer is valuable, not obligatory. Model subscriptions/API usage may cost money. Free infrastructure does not make coding tokens free.

```bash
# Install Node.js LTS, Git, Python 3.11+ and GitHub CLI using your OS package manager first.
# Claude Code official native installer (inspect source if required):
curl -fsSL https://claude.ai/install.sh | bash
claude --version
# Codex CLI: follow the current official installer instructions at:
# https://learn.chatgpt.com/docs/codex/cli
# GitHub CLI (after installing gh):
gh auth login
# Hugging Face CLI:
curl -LsSf https://hf.co/cli/install.sh | bash
hf auth login
# Modal CLI:
python -m pip install -U modal
modal setup
# Cloudflare CLI is run from project via npx wrangler
```

**Important:** install CLI tools from official instructions and inspect third-party skills before execution; don't paste secret tokens into prompts. On Windows use official PowerShell instructions.

## 1. Run the same 12-step workflow on every product

| Step | Action | Gate: do not advance until... |
|---|---|---|
| 1 | Explain the customer/problem in 6 sentences; challenge the premise | You can state who will use/pay and why |
| 2 | Search competitors, customer complaints, GitHub repos, APIs, HF models | A source-linked reuse-vs-build map exists |
| 3 | Define MMFS (3–5 user actions), exclusions, success metric | Every included feature enables the core outcome |
| 4 | Write `docs/PRD.md` from template | Flows, acceptance criteria, failure cases are testable |
| 5 | Write `docs/HLD.md` | Data, auth, trust boundaries, hosting, cost documented |
| 6 | Run *feasibility spikes* on hard OSS/model/API dependencies | Risky claims were actually tested |
| 7 | Write `docs/LLD.md` and ordered build blocks | Schemas, routes, modules and tests are unambiguous |
| 8 | Create private GitHub repo; install skills and agent rules | `main` protected and CI runnable |
| 9 | Build one end-to-end slice per branch/worktree | Each slice has passing tests and real UI/API behaviour |
| 10 | Independently review and test every slice | Spec + integration + security findings closed |
| 11 | Merge, deploy, smoke test production | Deployed SHA matches expected commit; URLs work |
| 12 | Watch errors, spend and behaviour; ship improvements | Real evidence determines next change |

**Recommended first release:** sign in (if needed) → do the primary job → see/save useful result → retry failure → pay or request access. Billing is required *only* if charging is part of the initial market test.

## 2. Get useful skills, not 50 random ones

A **skill** is a small reusable `SKILL.md` workflow that a coding agent can apply repeatedly. Read every skill before installing; third-party skills can run commands. Skill discovery: https://skills.sh

| Install/visit | Why | When |
|---|---|---|
| `npx skills add https://github.com/obra/superpowers --skill test-driven-development` | Test first; avoid fake completion | Every feature and bug fix |
| `npx skills add https://github.com/obra/superpowers --skill systematic-debugging` | Find root cause before random edits | Repeated failures |
| `npx skills add https://github.com/obra/superpowers --skill verification-before-completion` | Require command output / evidence | Before marking done |
| `npx skills add https://github.com/obra/superpowers --skill using-git-worktrees` | Safe independent branches | Parallel agents |
| `npx skills add https://github.com/anthropics/skills --skill frontend-design` | Reduce templated/generic UI | Any visual feature |
| `npx skills add https://github.com/vercel-labs/skills --skill find-skills` | Find task-specific skills as needed | Before reinventing workflow |
| https://github.com/anthropics/skills/tree/main/skills/skill-creator | Make/test your own skills | Repetitive custom tasks |
| https://github.com/anthropics/claude-code-security-review | Diff-aware security review | Auth, uploads, payments, external APIs |

The installer may ask which agent and project/global scope to use; prefer **project-local**. Use `npx skills find cloudflare` or `npx skills find playwright` to look for more—not an excuse to install all results.

This kit **already includes original, project-local anti-slop skills** in `.agents/skills/`. If Claude Code doesn't discover that location automatically, run `bash scripts/copy-skills-for-claude.sh` to mirror them into `.claude/skills/`. Codex can read `.agents/skills/`. The `AGENTS.md` / `CLAUDE.md` rules tell both agents when to use them.

## 3. Start a product in 15 shell commands

```bash
# Run from outside this starter-kit directory; change name
npm create cloudflare@latest -- my-product --framework=react
cd my-product
# Follow scaffold prompts; check project name and deployment account before deploying.
# Copy the contents of this kit: docs/, .agents/, AGENTS.md, CLAUDE.md, PROMPTS.md, scripts/
# (from your extracted solo-builder-kit directory; source path may differ)
mkdir -p docs .agents/skills .claude/skills
# After copying the files, keep your secrets out of Git.
printf '\n.env\n.env.local\n.dev.vars\n' >> .gitignore
npm install
npm run dev
# In another terminal: plan with an agent reading the docs and prompts
claude
# Or use Codex CLI: codex (after official installation)
git status
# after finishing documentation and first tests:
git add .
git commit -m "chore: initialize product foundation"
gh repo create my-product --private --source=. --remote=origin --push
# Set required PR checks/branch protection via GitHub repository Settings
```

**Use one backend path initially:** Cloudflare Worker + React/Vite static assets. Add D1 **if relational data is needed**, R2 **if user files are needed**, KV **if key/value config or cache helps**. Do not add every Cloudflare product by default. Worker runtime is not a GPU host.

## 4. Copy/paste prompts, in this exact order

Open `PROMPTS.md` and use prompts 01–10. The starting sequence is:

1. `01` product / competition / OSS research; record URLs and dates.
2. `02` MMFS and explicit exclusions.
3. `03` PRD → review with a *different* model using `04`.
4. `05` HLD with cheapest viable infra and trust boundaries.
5. `06` feasibility spike on the riskiest assumption.
6. `07` LLD + small build-block backlog.
7. `08` implement a single block; `09` independent review.
8. `10` release verification after merge and deployment.

Never hand an agent “build everything from these documents” as the only instruction. Give it one bounded block, acceptance tests and the files it owns.

## 5. Where OSS and Hugging Face fit

**Before starting a subsystem** (authentication, scheduling, rich text, parsing, AI): search GitHub and official repos. In a short table record: URL, license (commercial use?), maintained recently?, API compatibility?, transitive dependencies?, test quality?, estimated integration time, and **lift component vs vendor dependency vs build**. Avoid copying entire unrelated systems or violating licenses.

**For AI tasks:** first ask if rules/SQL/search solve them deterministically. If a model is required, search https://huggingface.co/models and check:

- License and use restrictions (model license may differ from its code license).
- Task match + language + data domain; quantitative benchmarks and eval set.
- Memory at target precision, cold starts, latency, concurrency, quality on *your* examples.
- Model size and inference price versus managed provider/Workers AI/CPU.
- Security/privacy: don't transmit sensitive real user data unless authorized.

Use `hf` CLI to fetch permitted models and metadata; never assume a model works simply because its card looks impressive. Run **20–50 representative labelled examples** and record correct answers, bad failures, median/p95 latency, cost/request. Store the test set and results in `evals/`.

## 6. Wire model inference, cheaply

Architecture: `Browser → Cloudflare Worker (auth/rate limits) → Modal HTTPS inference (private token) → Worker → Browser`. **Never** put the Modal secret in frontend JavaScript. The minimum runnable example is in `examples/modal_inference.py` and `examples/cloudflare_worker_proxy.ts`.

```bash
# Work in a small separate directory/virtual environment for the Modal demo
python -m pip install -U modal fastapi
modal setup
# Supply a random long token YOURSELF; this creates a secret inside Modal
modal secret create solo-builder-inference INFERENCE_TOKEN=REPLACE_WITH_RANDOM_VALUE
modal serve examples/modal_inference.py          # temporary endpoint
modal deploy examples/modal_inference.py         # persistent endpoint
# Copy the returned Modal HTTPS endpoint into a Cloudflare secret:
npx wrangler secret put MODAL_INFERENCE_URL
npx wrangler secret put MODAL_INFERENCE_TOKEN
# Wire worker/index.ts from the example, adapting to your scaffold's Env types/routes.
npm run deploy
```

**Example intentionally runs a tiny public HF model on CPU** to keep the first end-to-end test cheap; it is a **connectivity demonstration**, not a production model choice. For a task that genuinely requires GPU, change to a suitable GPU instance in Modal, re-evaluate cold-start and memory costs, and re-test quality. The Modal Starter plan currently includes **$30/month of eligible compute** but overages and excluded items (including Shared Endpoints) can be billed. Set a spend limit. The token is a server-to-server secret; production must additionally enforce user authorization, quotas, abuse prevention, input bounds and proper privacy policy.

## 7. Implement one feature with two independent models

```bash
git switch -c feat/first-usable-workflow
# In coding CLI: paste prompt 08 plus acceptance criteria from PRD/LLD.
# Ask Claude Code to write tests + implement + show commands/results.
npm run build
npm test --if-present
# In a separate CLI/context: paste prompt 09, inspect the actual diff.
git diff --check
git status
# Commit, push and open PR after all checks pass:
git add . && git commit -m "feat: implement first workflow"
git push -u origin feat/first-usable-workflow
gh pr create --fill
# Merge only after CI/review. Switch to main, pull latest, deploy confirmed main SHA.
```

Parallel work: independent blocks in **separate git worktrees** (not two agents modifying the same files). Make API/schema contracts first; integration owner reviews merging order. Start with **one builder + one reviewer**, add more agents only when there is truly independent work.

## 8. Anti-slop release gate: show evidence, not adjectives

**Code:** no fake APIs, unused packages, placeholder TODO paths, silently swallowed errors, mock data on production paths, hidden auth bypasses, or invented passing tests. **UI:** no random gradients, generic stock heroes, dead controls, decorative fake analytics, canned testimonials. **Product:** every MMFS flow genuinely completes, including errors, empty states and permission boundaries. **AI:** eval quality/cost meets a written threshold. **Ops:** deployed app tested *at public URL*, deployment SHA and Cloudflare resource IDs checked.

Pre-release commands vary by scaffold, but run at least `npm run build`, repo typecheck/lint if configured, `npm test`/`npx vitest run` if installed, browser E2E, `git diff --check`, vulnerability scans, and a **real authenticated browser smoke test**. Each missing test must be listed as a gap, not reported as a pass.

Use `docs/RELEASE_CHECKLIST.md` for the exact signoff table. `docs/STATUS.md` must say **built / reviewed / merged / deployed / production-tested** separately: a branch, commit, or green CI run is not deployment.

## 9. Cost discipline

Start: Cloudflare free eligible resources + GitHub private repo + 1 coding agent + pay-as-you-go inference only when necessary. Budget **coding-agent tokens** as well as hosting. Measure model invocations, GPU cold starts and requests per paid user. Don't keep GPU instances warm to solve a problem you don't yet have. Cache deterministic repeated results when safe, trim prompt/token volume, route easy tasks to cheap models, and move expensive jobs async where UX allows.

Set limits/alerts in **Modal and Cloudflare** before publishing; pricing, eligibility and quota details change. Never market a product as “free to run” based on trial credits.

## 10. Try the worked exercise

Open `FIRST-PRODUCT-EXERCISE.md` for one realistic, four-block customer-feedback sorter. It gives the scope, acceptance checks, exact agent prompts, model evaluation and deployment standard.

## 11. Reference shelf (official & inspected)

**Coding tools**
- Claude Code setup: https://code.claude.com/docs/en/setup
- Codex CLI: https://learn.chatgpt.com/docs/codex/cli
- Codex skills: https://learn.chatgpt.com/docs/build-skills
- Claude skill creator: https://github.com/anthropics/skills/tree/main/skills/skill-creator
- Agent skills discovery: https://skills.sh
- Superpowers (tests/debugging/worktrees): https://github.com/obra/superpowers
- Frontend design: https://github.com/anthropics/skills/tree/main/skills/frontend-design
- Claude security review: https://github.com/anthropics/claude-code-security-review

**Hosting and models**
- Cloudflare React + Workers starter: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Wrangler secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Hugging Face models: https://huggingface.co/models
- HF CLI: https://huggingface.co/docs/huggingface_hub/guides/cli
- HF model cards: https://huggingface.co/docs/hub/model-cards
- Modal docs and HTTP endpoints: https://modal.com/docs/guide/webhooks
- Modal pricing and credits: https://modal.com/pricing
- GitHub CLI: https://cli.github.com/manual/

**Practical reminder:** first get a boring, correct, end-to-end workflow working. Then improve the model, polish the UX, automate delivery, and expand scope based on usage.
