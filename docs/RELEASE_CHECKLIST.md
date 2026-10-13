# Evidence-driven release checklist

Use this checklist for every product. The Buildkit harness blocks automatically on checks it can execute; humans still own business/compliance decisions.

## Sources and technical feasibility

- [ ] `docs/research/EVIDENCE.json` contains retrievable sources, licences/model metadata and source dates where applicable.
- [ ] Significant direction claims are cited with real evidence IDs, not unsourced market assumptions.
- [ ] `spikes/plan.json` identifies actual critical technical risks and runnable proofs.
- [ ] `spikes/results.json` contains real observations and a `GO` result; missing critical integration proof is a BLOCK.
- [ ] Chosen model passes a representative task-specific evaluation if ML output quality is material.

## Security and correctness

- [ ] No secrets in code, generated files, tests, front-end assets, Git history or logs. Gitignore is not sufficient.
- [ ] Gitleaks and local controlled-path checks pass; key rotation performed if exposure occurred.
- [ ] Dependencies pass npm vulnerability audit; material supply-chain or licence problems addressed.
- [ ] Authorization, tenant isolation, input validation, privacy, rate limits and failure states verified.
- [ ] No fake integrations, TODO-only features or placeholder data disguised as complete workflows.
- [ ] Critical compliance categorization resolved; qualified reviewer explicitly attested if required.
- [ ] No production credentials or production D1/KV/R2 bindings available to preview/browser tests.

## Preview and release

- [ ] Preview Worker name/account verified and distinct preview bindings configured.
- [ ] Real Cloudflare Preview URL works, with actual Playwright user journeys and screenshots.
- [ ] Preview visibility is appropriate (Cloudflare Access for confidential content) and contains no real customer secrets.
- [ ] Latest reviewed SHA matches branch, evidence reports and current approval digest.
- [ ] Final release approval provided by an authorized collaborator, separately from preview.
- [ ] Production merge targets precisely that approved SHA; deployment is to approved Worker/account.
- [ ] Post-deployment HTTP and critical authenticated user journeys tested; logs inspected.
- [ ] Costs/quotas, backup/migrations, monitoring and rollback strategy accepted by owner.
- [ ] Status distinguishes generated, tested, reviewed, previewed, approved, merged, deployed and production-verified.
