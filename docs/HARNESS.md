# Buildkit: practical guided setup

Buildkit is a GitHub-native controller. **You supply the product idea and approve important decisions.** It writes a branch + draft pull request, records versions and verification evidence, runs source research and technical checks, and can deploy the reviewed version to your Cloudflare account after an explicit release approval.

## 1. Start from the public template

Visit **https://github.com/tinmanlabsl/buildkit/generate** → choose a new **private** repository.

In that new repo:

1. **Settings → Actions → General:** enable Actions and **Allow GitHub Actions to create and approve pull requests**. The workflows request their own scoped permissions; an organization policy may prohibit writes.
2. **Settings → Secrets and variables → Actions → Repository secrets:** add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. One is enough; both optional. For two providers choose `BUILDKIT_PROVIDER` repository variable (`codex` or `claude`) and optional `BUILDKIT_REVIEW_PROVIDER`.
3. **Provider dashboard:** set API spending limits; a GitHub-run model invocation is **not** necessarily paid by a ChatGPT/Claude app subscription.
4. **Issues → New issue → Build a product:** one or two sentences describing user, pain, outcome, preferred constraints. Keep `[Product]` in the title.

## 2. Let Buildkit run; approve the outputs

Buildkit opens `buildkit/issue-N` and a **draft PR**. It posts an issue comment for each gate, with direct links and a code. Post commands on the **original issue**:

| Comment | Meaning |
|---|---|
| `/approve 12ab34cd` | Approve this exact generated version (copy actual code from the latest comment) |
| `/revise Start with English only` | Regenerate the current decision with feedback |
| `/status` | Report completed stages, pending gate, PR and blockers |
| `/resume` | Retry after fixing a blocking error, without discarding verified blocks |
| `/start` | Start a valid idea that wasn't automatically picked up |
| `/attest COMPLIANCE-REVIEWED` | Acknowledge external human compliance review when needed; not a certification |

The sequential route is:

**Evidence-backed direction → approve → PRD/HLD and executed feasibility probes → approve → LLD/build/tests → Cloudflare live preview and Playwright checks → approve experience → security/compliance review → approve production → merge exact SHA + deploy + smoke test.**

No independent approval is needed after every file write. Buildkit pauses only for product, architecture, actual preview and production release decisions, or an unresolved blocker.

## 3. Research and feasibility are actual gates

- Default research checks GitHub OSS search and Hugging Face model metadata; sources are saved under `docs/research/`.
- For market/community searching, optionally add **Actions repository variable** `BUILDKIT_SEARCH_ENDPOINT` pointing to an authorized HTTPS JSON search endpoint returning `results[]` with `title`, `url`, and `content`/`snippet`. If necessary add **Actions secret** `BUILDKIT_SEARCH_KEY`.
- Research must cite retrieved source IDs; missing customer/competitor evidence is displayed as `UNVERIFIED`, not fabricated.
- Feasibility runs a typed `spikes/plan.json` (1–5 public HTTPS, GitHub, HF or offline Node test probes), records `spikes/results.json`, and stops if a **critical** test fails. Allowed network hosts are constrained; expand using optional Actions variable `BUILDKIT_SPIKE_HOSTS` only for hosts you trust and own. This is **not** authorization for arbitrary production-API calls.
- Tests that only retrieve documentation do not prove write permissions, integrations or model quality. If the core outcome needs unavailable credentials, preview data, GPU evaluation, or customer consent, it remains blocked or requires separately approved verification. See [evidence guide](EVIDENCE.md).

## 4. Connect Cloudflare for the preview

Before the first live preview, in the **product repo** (never the public template):

| Type | Name | Guidance |
|---|---|---|
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Your target account ID |
| Secret | `CLOUDFLARE_PREVIEW_TOKEN` | A narrowly scoped Worker Preview token |
| Variable | `BUILDKIT_WORKER_NAME` | Exact Worker name in the app's `wrangler.json` |
| Secret | `CLOUDFLARE_PROD_TOKEN` | Separate production token for *after* final approval |

The harness uses Cloudflare **Workers Previews**, rather than creating a permanent Buildkit web service. The generated `wrangler.json` must use separate preview bindings. Existing D1/KV/R2 resources referenced by previews must be isolated from production. Service bindings to production Workers are blocked. If a required resource or credential is missing, the workflow stops and explains what to configure. It does **not** auto-create databases or ask for keys in Issues.

The preview workflow performs npm dependency checks, credential scanning, `wrangler preview`, Playwright desktop/mobile screenshots and at least two real browser-test assertions. It posts the URL and test evidence to the Issue. Previews can be publicly reachable: use synthetic/mock data and protect sensitive deployments. See [Cloudflare guide](CLOUDFLARE.md).

## 5. Approve production only after inspection

After reviewing the actual preview, submit its `/approve CODE`. Buildkit generates a release review of secrets, dependency findings, browser evidence, agent/static review and risk profile. Sensitive regulated categories require qualified external review; the `/attest` command only records the authorized human's acknowledgment.

The final production `/approve CODE` authorizes a separate workflow to:

1. Verify the exact approved commit and unchanged application; check Cloudflare target/account and binding separation.
2. Re-run the Gitleaks secret scanner and production dependency audit.
3. Merge only the approved PR SHA, deploy the resulting main commit to the selected Worker, and smoke test the returned URL.
4. Post the outcome and deployed SHA on the Issue. A failed deployment **is not** marked successful.

## 6. Fix common blockers

| What you see | Fix |
|---|---|
| No Issue form | Verify Issues enabled and `.github/ISSUE_TEMPLATE/product-idea.yml` on main |
| No comment from Buildkit | Look at **Actions → Buildkit guided product build**; author needs write permission |
| Missing model key | Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` as Actions secret; comment `/resume` |
| No draft PR | Enable GitHub Actions to create PRs; comment `/status` to retry |
| Research incomplete | Add a search endpoint or real source links, then `/revise`; do not treat missing market evidence as validation |
| Critical feasibility probe blocked | Configure authorized test credentials/resources in an isolated testing workflow or revise architecture; do not mark it GO |
| Cloudflare name/binding mismatch | Set `BUILDKIT_WORKER_NAME` to match app config; isolate preview data bindings |
| Preview failure | Open the Actions run and screenshots; fix app, authorization or e2e tests and `/resume` |
| Security/compliance failure | Correct finding; obtain qualified compliance review if necessary; `/resume` |
| Need a different runtime | Cloudflare Worker workflow may not support it. Use [manual route](../START-HERE.md) rather than deploying an incompatible app |

## Boundaries

Buildkit uses only your GitHub and Cloudflare accounts. The harness is **MIT-licensed and self-service**, but API usage, GitHub runner quotas, Cloudflare resources and optional models may cost money. Any hosted preview is separate from production, and deployment is irreversible in the sense that an external service has been changed, so release approval is explicit. This framework cannot guarantee regulatory certification, absence of vulnerabilities, useful market demand, or compatibility with arbitrary application architectures. Coding agents still run on GitHub-hosted runners with a provider key; hostile/untrusted code requires stronger isolation.

[Back to README](../README.md) · [Evidence](EVIDENCE.md) · [Security](SECURITY.md) · [Cloudflare](CLOUDFLARE.md).
