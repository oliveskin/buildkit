# GitHub-native Buildkit harness (v1)

## What it does

Use **GitHub Issues** for instructions and approvals, **Actions** for execution, and one review **pull request** per product idea. Output and approvals live on `buildkit/issue-N`; `main` is never modified automatically.

1. Create a **private** repository from Buildkit (or copy the harness + playbook into an existing repo).
2. Enable GitHub Actions and grant **Read and write permissions** for the workflow token, including **Allow GitHub Actions to create and approve pull requests** (Settings → Actions → General), as applicable to your plan. Only authorized collaborators can start paid work.
3. Configure **one** repository secret: `OPENAI_API_KEY` (default Codex) **or** `ANTHROPIC_API_KEY` (Claude). API billing is separate. Optional repo variable `BUILDKIT_PROVIDER=claude`; optional `BUILDKIT_REVIEW_PROVIDER` for separate review. Do not paste secrets into issues.
4. Open **Issues → New issue → Build a product**. An issue titled `[Product] ...` starts discovery; alternatively comment `/start` on your issue. You may optionally create/use the `buildkit:idea` label.
5. Buildkit writes `docs/DIRECTION.md`, opens/updates an overview PR, and comments with a one-time approval code.
6. Reply `/approve CODE` or `/revise your feedback`. A revised output gets a new code. Use `/status` any time.
7. Approval drives PRD/HLD/feasibility notes, then 1–3 bounded implementation blocks, local tests and a preview review gate.
8. After preview approval Buildkit marks it **ready for manual release review**. **It never merges or deploys on your behalf.**

## Commands

| Comment | Outcome |
|---|---|
| `/start` | Start on an eligible product issue |
| `/status` | Read the recorded stage, PR and pending gate |
| `/approve 8hexcode` | Approve exactly the displayed document/build digest |
| `/revise Please change ...` | Regenerate the current gate with your feedback |
| `/resume` | Re-run a blocked stage after fixing configuration |

## Scope of v1

- **Implemented:** issue/label triggers, write-access checks, document/code generation via Codex or Claude CLI, version-bound review codes, persistent branch state, resumable stages, sequential build blocks, real npm build/test commands, optional second-provider advisory review, and PR summaries.
- **Not implemented:** automatic Cloudflare account provisioning, paid infrastructure creation, browser/live-preview hosting, unattended merges/deployments, guaranteed independent reviews without second provider, or real-time market research when an agent has no access to sources.
- A generated application may need manual dependencies and configuration. If tests fail or no tests are provided, Buildkit marks the result **blocked**, not verified. Do not call a PR a live deployment.
- The runner limits time, and three blocks are a maximum for a first cut. For a larger product, extend the LLD after a reviewed first version.

## Security / cost

- Run only on repos you control; use a **private repository** for unreleased products.
- Only repository collaborators with write/maintain/admin permission may trigger model execution or approve.
- AI-written code and instructions are untrusted. Protected paths and credential files are rejected by the controller.
- Workflow control code runs from `main`, not the agent-created branch.
- The coding CLI is given the model API key but not `GITHUB_TOKEN`; runner git operations use ephemeral authentication.
- GitHub-hosted runners, model API calls and npm dependencies can incur charges. For strong isolation of hostile repositories, use dedicated ephemeral runners / containers; this starter harness is not a hardened untrusted-code sandbox.
- Before publishing any generated product, independently review changes, establish CI and browser tests, configure secrets/budgets, and approve deployment.
