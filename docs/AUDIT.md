# Buildkit audit — 13 October 2026

## Finding

The transferred repository is `tinmanlabsl/buildkit`, public and template-enabled. The original three-gate GitHub-native design exists, but the prior five unit tests were not evidence of a successful end-to-end product build. The GitHub harness and the more complete manual playbook must not be presented as identical levels of automation.

This audit fixes concrete execution/safety/recovery gaps and documents what remains. It does **not** claim a real provider-backed product was built or deployed.

## Changes in this audit

| Finding | Correction |
|---|---|
| Old owner in onboarding links | Canonical links use `tinmanlabsl/buildkit` |
| Blank About metadata | Prepared exact description/homepage/topics in [ABOUT.md](ABOUT.md); GitHub repository-settings write action is unavailable through this connection. A Markdown change does not update the sidebar. |
| Codex invocation relied on the wrong CI environment variable | Map the user's `OPENAI_API_KEY` secret to `CODEX_API_KEY` only for `codex exec`; use explicit sandbox policy |
| Single Claude key still required an extra selection variable | Auto-detect the sole available key; explicit variable remains supported |
| Claude `allowedTools` was treated as a tool restriction | Use `--tools` as well; disable MCP tools and set turn/per-call budget controls |
| Generated npm code inherited controller/provider credentials | Execute install/build/test in isolated Docker application snapshots, without host home, Git metadata, controller state or keys |
| Staged changes and symlinks were not fully checked | Check staged + unstaged + untracked paths; reject protected paths, symlinks and known credential values |
| Builder could silently change approved documents | Store document digests, enforce upstream locks and protect LLD/plan during implementation |
| All successful blocks were discarded on failure | Persist plan and each verified block; resume from checkpoint; rerun integrated app verification before review |
| Approval records lacked the approved digest | Record stage, actor, revision and digest; current contents must match |
| Review failures could lose their report | Persist separate-provider findings on the product branch |
| Caught build failures could leave Actions green | Persist blocker, post recovery message, and return a failed workflow exit |
| Review cards contained only generic instructions | Include bounded output excerpts and branch/PR links; `/status` retries a missing PR |
| Documentation implied a running preview | Explicitly name the third stage code review; hosted preview/browser testing is not implemented |
| Manual one-branch-per-block rule conflicted with harness | Document one product branch/draft PR with block checkpoints in guided mode |

## Verification performed

The local suite has **21 tests**: core policy/unit tests and controller-flow tests using temporary real Git repositories. GitHub API replies, model calls and container execution are mocked in that offline suite. It tests the three approval gates, stale-code rejection, unauthorized users, missing credentials, blocked/resumed blocks, protected/staged changes, complete-diff review, recovery of PR creation and default-branch dispatch restrictions.

CI also runs a **real Docker/npm fixture** for the three-gate flow with simulated GitHub and AI responses and no API spend. Its result must be checked on the audit PR/merge; adding the job alone does not prove it passed. These tests check harness mechanics and isolation, not model output quality, real web research, browser UX, production correctness or provider billing.

## Remaining before calling it a fully validated novice builder

- Run a small real product with actual Codex and Claude credentials separately, including rejection/revision, interruption/recovery and cross-provider review. No paid-provider run was performed during this audit.
- Add a real research/source acquisition path and an executed feasibility-spike mechanism. The current harness creates notes/plans and marks inaccessible evidence UNVERIFIED.
- Add browser/E2E verification and an approval-gated preview/deployment adapter. Merging and production deployment remain manual by design in v1.
- Strengthen isolation of the coding agent itself. Generated npm scripts are isolated, but the coding CLI still runs on the runner with its provider key; this is not a hostile multi-user execution service.
- Pin and validate agent versions, action references and container image digests; add unified usage accounting and bounded auto-repair only after measurement.
- Select an explicit reuse licence before describing this as freely reusable open source. No licence was silently added in this audit.

## What matches the agreed v1

GitHub-native, no separate hosting; one provider sufficient; optional independent provider; PRD → HLD → LLD preserved; small sequential build blocks; persistent outputs; human approvals; no automatic merge/deploy; Cloudflare/Modal examples available without becoming mandatory infrastructure.

## Source references checked

- [Codex non-interactive authentication](https://developers.openai.com/codex/noninteractive)
- [Codex CLI flags](https://developers.openai.com/codex/cli/reference)
- [Claude Code tool restrictions and limits](https://code.claude.com/docs/en/cli-reference)
- [GitHub workflow event security](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)

[Harness guide](HARNESS.md) · [README](../README.md)
