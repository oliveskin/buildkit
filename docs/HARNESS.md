# Buildkit GitHub harness — guided setup and use

Buildkit runs **inside your own GitHub repository**. GitHub Issues collect the idea and approvals; Actions runs the coding agent; a draft pull request stores generated documents and code. No separate Cloudflare controller or local terminal is required for the harness.

## A. Once, for the Buildkit maintainer

Visit **https://github.com/oliveskin/buildkit/settings** → **General** → check **Template repository**. This exposes the **Use this template** button to other people. It is a GitHub repository-administration setting, not a feature controlled by the Buildkit workflow. The source repository must remain public for broad public access.

> Each person using the kit has to complete the configuration in section B on their own repository. The source repository's secret and workflow settings are **not** inherited by a generated repository.

## B. First-time user: create a product repo (no CLI)

**1 — Make the repository.** Open https://github.com/oliveskin/buildkit/generate. Choose a name, set **Private**, and create your repository. This copies the Buildkit harness and documentation, but not anyone's API keys. If the template button has not been enabled, ask the maintainer or copy the repository files instead.

**2 — Allow the workflow to run and open a draft PR.** In your **new repository** navigate to **Settings → Actions → General**.

- Ensure GitHub Actions is enabled for the repository.
- Under **Workflow permissions**, select **Allow GitHub Actions to create and approve pull requests** and Save. This is needed for the draft PR step.
- The Buildkit workflow already declares `permissions: contents: write, issues: write, pull-requests: write`. You can keep the repository's default token permissions restricted where GitHub allows the workflow override. If an organization policy prevents write scopes, an owner/admin must permit them; otherwise the Action will fail.
- You do **not** need to make your product repository public.

**3 — Add one paid-model API key.** In the new repository navigate to **Settings → Secrets and variables → Actions → Repository secrets → New repository secret**.

Choose exactly one for the first run:

| Model choice | New repository secret | Additional repository variable |
|---|---|---|
| **Codex** (default) | `OPENAI_API_KEY` | None |
| **Claude Code** | `ANTHROPIC_API_KEY` | `BUILDKIT_PROVIDER` = `claude` |

A ChatGPT or Claude consumer subscription should **not** be assumed to cover these GitHub-run API calls. API usage may cost money. Do not put secrets into issues, files or public comments. A second independent reviewer can be added later with `BUILDKIT_REVIEW_PROVIDER` and the appropriate second API key.

**4 — Open your first product issue.** Visit **Issues → New issue → Build a product** in your new repository. Enter what you want to build, who needs it, and any hard constraints. Keep the idea short; Buildkit should propose and ask you to review the rest. Submit the issue with its `[Product]` title.

## C. Example: what the user sees

**You enter:** “A simple AI assistant for cafés that answers common questions and manages appointment requests. I'd like it cheap, with a web dashboard.”

1. Buildkit starts a GitHub Actions run, generates `docs/DIRECTION.md`, creates the `buildkit/issue-N` branch and opens a **draft PR**. It comments on the original issue with its scope recommendation and a code such as `/approve a1b2c3d4`.
2. You follow the PR link in the issue comment to read the actual proposed scope. Comment **`/approve <the-code-from-your-issue>`** on the **issue** (not on the PR). Or comment `/revise Start with email rather than phone.`
3. After approval, Buildkit generates `docs/PRD.md`, `docs/HLD.md`, and `docs/FEASIBILITY.md`. It asks you for a **second approval**.
4. After that approval it generates `docs/LLD.md`, chooses 1–3 bounded build blocks, writes code, runs **npm build** and **npm test**, and asks for **preview review**. A failure stops the workflow and reports the blocker.
5. Final preview approval changes the stage to **ready for manual release review**. You must inspect the draft PR, address remaining issues, merge and configure production deployment separately.

**Issue comment commands**

| Command | Meaning |
|---|---|
| `/start` | Start on a product issue if it has not started |
| `/status` | Show stage, pending approval and any blocker |
| `/approve a1b2c3d4` | Approve the exact current review code (example code is not reusable) |
| `/revise Describe the change` | Regenerate the current stage with specific feedback |
| `/resume` | Retry after fixing a blocked stage, such as a missing API key |

You may use **Actions → Buildkit · guided product build → Run workflow** with an issue number and `start`, `status` or `resume` when recovering; approval must still happen via the issue comment with the correct code.

## D. Troubleshooting

| Problem | What to check |
|---|---|
| **Use this template** does not appear | Source owner must check **Settings → General → Template repository** once |
| **Build a product** issue form missing | Confirm `.github/ISSUE_TEMPLATE/product-idea.yml` exists on `main` and Issues are enabled in repository settings |
| Issue submitted but no comment | **Actions → Buildkit · guided product build**. Ensure Actions enabled, new issue title starts with `[Product]`, and issuer has write/admin permission |
| Missing `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Add an Actions repository secret to the **product** repo, then comment `/resume` |
| Pull request not created | **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests**; check the Action logs |
| Action gets 403 writing files/issues | Verify its explicit `permissions` stanza isn't blocked by repository or organization policy |
| Test/build failed | Open Actions logs, inspect the error, fix configuration or code, then `/resume`; failed tests are not approval |
| Approval code rejected | Use the **latest** code shown on the issue; changing documents invalidates older approvals |
| Want to use a different model | Set `BUILDKIT_PROVIDER` to `codex` or `claude` and add the corresponding Actions repository secret |

## E. Boundaries and safety

- Only collaborators with **write**, **maintain** or **admin** access can start paid work or approve stages.
- The agent may generate or edit code in the working branch, but the controller prevents edits to its own workflow files and secret paths. Do not use this starter harness to execute untrusted repositories without stronger sandbox isolation.
- Agent-written code and external content can still be unsafe. Review dependencies, data permissions, auth, credentials, production costs and the final PR before merging.
- OpenAI/Anthropic model/API charges, GitHub runner usage beyond free allowances, and any subsequent hosting are the user's responsibility.
- Buildkit **never auto-merges or auto-deploys**. No Cloudflare account setup is needed merely to use the harness; Cloudflare is an optional application-hosting target.
- A product can be blocked on missing integrations, credentials, npm dependencies, feasibility evidence, browser checks or manual review. A draft PR is not proof of a working app.

[Back to the quick-start README](../README.md).
