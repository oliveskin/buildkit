# Repository About metadata

For **tinmanlabsl/buildkit** only. The GitHub About sidebar is repository metadata; editing this file does not change it. The current connector has file/PR writes but no repository metadata update action.

**Description**

Approval-driven AI product building in GitHub. Turn an idea into PRD, HLD, LLD and reviewable code with Claude or Codex. Human decisions; explicit release checks.

**Website**

https://github.com/tinmanlabsl/buildkit/blob/main/docs/HARNESS.md

**Topics**

`ai-assisted-development`, `github-actions`, `claude-code`, `codex`, `spec-driven-development`, `human-in-the-loop`, `developer-tools`

A repository administrator can paste these into the gear icon beside **About**, or run the following with an authenticated GitHub CLI account authorized to edit repository settings:

```bash
gh repo edit tinmanlabsl/buildkit \
  --description 'Approval-driven AI product building in GitHub. Turn an idea into PRD, HLD, LLD and reviewable code with Claude or Codex. Human decisions; explicit release checks.' \
  --homepage 'https://github.com/tinmanlabsl/buildkit/blob/main/docs/HARNESS.md' \
  --add-topic ai-assisted-development,github-actions,claude-code,codex,spec-driven-development,human-in-the-loop,developer-tools
```
