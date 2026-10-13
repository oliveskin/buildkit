# Build a product through GitHub

**No local terminal or Cloudflare controller needed.** Describe the idea in an Issue; Buildkit runs a coding agent in Actions and asks you to review outputs. Your product code stays in your own repository.

## 1. Set up your product repository

1. [Use the template](https://github.com/tinmanlabsl/buildkit/generate). Create a **private** repository in your account. Keep `main` as the default branch for the supplied CI. Do not start customer products in the shared Buildkit source repository.
2. In **your new repo → Settings → Actions → General**, enable Actions and **Allow GitHub Actions to create and approve pull requests**. The workflow requests only the write scopes it needs. Organization policy may require an administrator to allow them. Settings and secrets are not copied from the source repository.
3. In **Settings → Secrets and variables → Actions → New repository secret**, add one key:

| Provider | Secret | Selection |
|---|---|---|
| Codex | `OPENAI_API_KEY` | Automatically selected when present |
| Claude Code | `ANTHROPIC_API_KEY` | Automatically selected when this is the only key |

With both keys, Codex builds by default. Set repository variable `BUILDKIT_PROVIDER=claude` to change that. For optional separate-model static review, set `BUILDKIT_REVIEW_PROVIDER` to the other provider and supply its key. One key is enough to start.

API usage is separately billed. Do not assume a consumer subscription covers it. Set provider-side budgets/alerts before use. A runner timeout is **not** a hard dollar cap. Claude calls additionally use a 20-turn, approximately $2 per-invocation limit; several invocations can occur in one stage. Codex costs are governed by your provider controls and the invocation timeout.

## 2. Describe the product

Open **Issues → New issue → Build a product** in your new repo. For a first run, choose something small: “A shared task list for a small team. Add, complete and filter tasks; no billing or external integrations yet.” Keep the `[Product]` title prefix and submit.

Only write/maintain/admin collaborators may start paid work or approve it. Buildkit records the original brief, creates `buildkit/issue-N`, and opens one draft pull request for that idea. Commands belong on the **original issue**, not the PR.

## 3. Review three outputs

| Gate | Produced automatically | Your decision |
|---|---|---|
| Direction | `docs/DIRECTION.md`: customer, MMFS, exclusions, assumptions, risks | Approve scope or revise |
| Architecture | `docs/PRD.md`, `docs/HLD.md`, `docs/FEASIBILITY.md` | Approve requirements/design and acknowledge unresolved risks, or revise |
| Code review (internal name: `preview`) | `docs/LLD.md`, `docs/BUILD_BLOCKS.json`, 1–3 code blocks, npm command evidence; optional separate-model review | Inspect actual changes and tests, approve or revise |

Each comment includes document excerpts, branch/PR links and a fresh approval code. Copy that issue's code, for example `/approve a1b2c3d4`. Codes bind the current file contents, including binary content and file mode, and cannot be reused for a later revision. Approved direction/architecture files are protected from silent edits during coding.

**The third gate is not a live website.** It is generated code with recorded npm command results. Browser QA, actual customer journeys and live integration testing are separate checks. A successful exit from a generated test script is not proof that its assertions adequately cover the product.

LLD is generated after architecture approval and inspected with the code. There is no separate LLD approval gate in this minimal version. A change to approved product scope must be reviewed upstream, not silently implemented in an unrelated block.

## Commands and recovery

| Comment | Effect |
|---|---|
| `/start` | Initialize work if the product issue has not started |
| `/status` | Show recorded stage, blocks, gate, blocker; retry missing draft PR creation |
| `/approve CODE` | Accept the exact current review version |
| `/revise Describe the change` | Regenerate the current gate; creates a new code |
| `/resume` | Retry blocked work, or recover an interrupted run after it has stopped |

Work is checkpointed before a stage, after the implementation plan, and after each successful block. If B02 fails, B01 remains saved. Resume does not rebuild already verified blocks. Failed builds produce a failed Actions run, not a misleading green result. Retries are explicit; there is no automatic self-repair loop.

Use **Actions → Buildkit · guided product build → Run workflow** on the default branch for `start`, `status` or `resume` with the issue number. Approvals still require the issue's current code. Do not edit the issue body to change an active brief: use `/revise` at the relevant gate. Major changes to an already approved upstream stage require a fresh product issue in this version.

## 4. Finish release manually

Final approval marks the branch **ready for manual release review**. Buildkit never auto-merges, deploys or provisions paid infrastructure. Review the PR, add real application CI/browser tests, check [the release checklist](RELEASE_CHECKLIST.md), then merge and deploy to your selected target. Cloudflare/Modal examples are wiring demonstrations, not configured production services.

## What is actually automated?

| Capability | Current implementation |
|---|---|
| Prompt handoff, scope → PRD → HLD → LLD → bounded code | Yes |
| Version-bound approvals, checkpoints and restart | Yes |
| GitHub-hosted execution, one product branch/draft PR | Yes |
| Separate-provider review | Optional static review of the complete diff, not test execution |
| Live market/OSS/HF research | Best effort only; no configured research service or guaranteed browsing |
| Feasibility spikes | Notes and reproducible plans; real API/model experiments are not automatically provisioned/executed |
| Generated application tests | npm install/build/test in isolated containers; scope/quality of tests still needs human review |
| Browser previews, UI screenshots, live deployments | Not implemented |
| Parallel agents, automatic repair loops, unified spend accounting | Not implemented |
| Marketing/GTM | Not added |

## Security boundary

Control code loads from the default branch. File checks reject protected/staged paths, credential values and symlinks. Only the active provider's key enters its CLI process. Controller Git credentials are not passed to agents. Claude tool availability is restricted, not merely pre-approved.

Generated npm scripts run in separate Docker containers with only an application snapshot mounted: no `.git`, agent settings, controller state, runner home, Docker socket or keys. Dependency installation has network access with lifecycle scripts disabled; build and test run without network. The snapshot's lockfile and sanitized command evidence are retained. This requires Docker on the GitHub runner and currently targets Node/npm applications.

**This is not a hardened hostile-code service.** The coding CLI itself still runs on the runner and receives its model key. Use only repositories and collaborators you trust. Stronger agent isolation, pinned tool/image versions and a real-key end-to-end validation remain work before broad untrusted use. Do not attach production secrets to this workflow.

## Troubleshooting

| Symptom | Action |
|---|---|
| No template button | Source owner: Settings → General → Template repository. It is enabled on `tinmanlabsl/buildkit`. |
| No issue form | Check Issues enabled and `.github/ISSUE_TEMPLATE/product-idea.yml` on `main`. |
| No response | Check Actions enabled, `[Product]` title, collaborator access and the Actions log. |
| Missing key/provider error | Add the right secret/variable in the product repo; `/resume`. |
| No draft PR | Enable Actions PR creation, then `/status`; generated files remain on the branch. |
| 403 writing | Review organization/repository Actions policy and workflow scopes. |
| Code rejected | Use the newest code. Older v1 gates created before the audit need `/revise` to refresh. |
| Build/test/network failure | Inspect Actions and `docs/evidence/`; fix the underlying dependency/test/configuration, then `/resume`. External network tests need a separately approved workflow. |
| Need a live preview | Deploy manually after security/release review; this harness does not publish a URL. |

[README](../README.md) · [Audit and outstanding work](AUDIT.md) · [Manual playbook](../START-HERE.md)
