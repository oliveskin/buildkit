# Repository agent rules — read before any code change

1. Repository and deployed project names are exact; NEVER touch other repos, workers, accounts or environments.
2. `docs/PRD.md` controls product behaviour; `docs/HLD.md` controls architecture; `docs/LLD.md` controls implementation details. If they disagree, stop and flag the mismatch before changing scope.
3. Manual mode: one LLD block per branch. Guided GitHub mode: one `buildkit/issue-N` branch/draft PR per idea, with controller-owned block checkpoints. Agents must not commit or push. Never modify main automatically.
4. Prefer an audited OSS component or deterministic code when it is simpler. Don't introduce new frameworks or cloud resources without explaining why.
5. Test real behaviour; don't claim a test ran unless command output exists. Never substitute mocks for production integrations without explicit signoff.
6. Before completion apply skills: `scope-guard`, `anti-slop`, `release-truth`; use `oss-first`, `hf-model-eval`, `cost-first` whenever applicable.
7. Run available build, type checks, tests, and security checks. Report commands, results and gaps explicitly.
8. Secrets live in environment managers, never client code, Git, fixtures or logs. Protect user data and ensure auth on every privileged operation.
9. A PR is not merged; a merge is not deployed; a deployment is not verified. Track every state distinctly in `docs/STATUS.md`.
10. If unsure, inspect existing code and current official docs before guessing. Never silently edit unrelated features.
