# Cloudflare Previews and production release

**Cloudflare hosts each product preview, not the Buildkit controller.** Buildkit remains a GitHub template + Actions workflows.

## What the user configures in the product repository

- GitHub Actions secret `CLOUDFLARE_ACCOUNT_ID`.
- Secret `CLOUDFLARE_PREVIEW_TOKEN` scoped to preview creation/Worker scripts.
- Actions variable `BUILDKIT_WORKER_NAME` — the exact app Worker name.
- Secret `CLOUDFLARE_PROD_TOKEN` only for production approval and deployment.

The user must authorize the Cloudflare account and any resources; Buildkit cannot silently create paid or production resources without permission.

## Example config

The agent generates a real, buildable Worker config with `wrangler.json` and a preview block:

```json
{
  "name": "my-product-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-09-01",
  "vars": {"ENVIRONMENT": "production"},
  "previews": {"vars": {"ENVIRONMENT": "preview"}}
}
```

This works as a **configuration illustration**, not a complete built application. If using D1, R2, KV, or other bindings, configure **separate existing preview resources** in `previews` and verify IDs differ from production. Some Cloudflare bindings have their own isolation rules. Service bindings may resolve to production in Previews and are rejected by this harness.

See [official Cloudflare preview setup](https://developers.cloudflare.com/workers/previews/get-started/) and [isolation rules](https://developers.cloudflare.com/workers/previews/resources/).

## What happens automatically

1. The build stage completes the application, unit/build checks, requirement traceability, and a real `tests/e2e.spec.mjs`.
2. `buildkit-preview.yml` checks the exact candidate SHA, configuration, dependency vulnerabilities and secret scan.
3. With preview-only credentials, Wrangler publishes to a named **Workers Preview**.
4. Playwright opens the URL, captures desktop/mobile screenshots, records page exceptions, and runs at least two user-journey tests.
5. The browser workflow saves evidence to the product branch and posts the URL to the original issue. Approve or revise only after inspecting it. The URL is normally accessible publicly: never populate it with real sensitive data.
6. After the human preview and separate release approval, `buildkit-release.yml` verifies the exact unchanged app/approved version, reruns security checks, merges the PR, deploys production Worker with the **production** credential, and smoke-tests the returned URL. A failure is reported as failure, not a successful release.

## Known boundaries

- Native mobile applications, GPU-dependent services and unsupported frameworks require a different adapter; do not pretend a Workers preview is a complete deployment.
- This harness does **not** auto-create D1 databases, KV namespaces, R2 buckets, or DNS/custom domains. It requires correct authorized bindings or blocks clearly.
- Workers Preview URLs are not production releases. Access policies, secrets, cookies, data retention and third-party callbacks may need extra setup.
- Generated Playwright tests are not independent proof that every user journey is correct. Inspect assertions and evidence.
- Production merge cannot always be rolled back automatically. The owner remains responsible for safe migrations, backups and a tested rollback procedure.
