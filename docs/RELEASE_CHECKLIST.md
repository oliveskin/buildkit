# Release gate (fill for every block)

| Block | Built + tests run | Independent review | PR merged to main | Deployed exact SHA | Public flow smoke-tested |
|---|---|---|---|---|---|
| B01 | [ ] | [ ] | [ ] | [ ] | [ ] |

- [ ] Production app account/Worker/project name verified (do not touch other projects).
- [ ] PRD acceptance paths work for an actual user, including auth boundaries and timeout/error.
- [ ] Build/typecheck/tests/CI outputs attached; unrun tests identified.
- [ ] No demo fake data/placeholder UI/insecure dev toggles in production.
- [ ] Secrets managed securely; no keys in public bundle, Git, logs.
- [ ] Database migrations completed and checked; rollback/backup ready.
- [ ] Modal endpoint protected; per-user authorization, quotas and spending caps in place.
- [ ] Model version/evals passed (only if ML is used).
- [ ] Cross-device UI and accessibility spot checks passed.
- [ ] Deployment SHA, timestamp, URL recorded; real authenticated smoke test completed.
- [ ] Costs/budget alerts inspected; owner knows how to disable/rollback.
