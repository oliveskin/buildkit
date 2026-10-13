# Execution and deployment adapters

Buildkit is the **GitHub controller**. The user's approved HLD chooses the architecture and runtime; it does not inherit Cloudflare simply because the harness itself runs on GitHub.

## Architecture contracts

`docs/EXECUTION_PLAN.json` contains:

- `schema: 1`, `productKind`, human-readable `rationale`, complete MMFS `requirements` (FR identifiers), `risks` and `tradeoffs`
- `build: {adapter, language}`
- `preview: {adapter}`
- `deploy: {adapter, provider}` (plus `workerName` only for approved Cloudflare Worker apps)

`docs/INFRA_PLAN.json` contains a separately reviewed resource/cost/permission/domain plan. No resource is created merely because an agent proposed it.

| Area | Wired adapter(s) | If not yet wired |
|---|---|---|
| Verify source code | `node-npm`, `python-pytest`, `rust-cargo` | Stop with missing build adapter |
| Publish a working live preview | `cloudflare-workers` | `external-url`, `native-artifact` and `unsupported` must not pretend to pass browser verification |
| Production deployment | `cloudflare-workers` | `external-manual` / `unsupported` report a precise blocker, never change provider |
| Provision D1/KV/R2 | `cloudflare` after specific resource approval | Other providers are recorded in the HLD but need their own provisioner |

This deliberate separation means Buildkit can generate and verify a Python service, native product source or a GPU component without first converting the product into a Cloudflare Worker. A missing deploy/preview adapter is a genuine unresolved task, not evidence that the product is finished.

## Build-block scheduling

`docs/BUILD_BLOCKS.json` contains all approved blocks. Each has `id`, user-visible `goal`, `requirements`, `dependsOn`, and observable `acceptance`. The validator rejects cycles, nonexistent dependencies and missing MMFS requirement coverage.

There is **no fixed maximum number of blocks in a product**. Each GitHub Actions run handles a small dependency-ready batch and persists completed outputs. Automatic continuation dispatches another run, while manual `/resume` recovers an interrupted dispatch or worker. This deliberately runs against one controlled product branch until safe parallel integration support is implemented; unrelated agents do not concurrently write the same worktree.

## Infrastructure creation

For Cloudflare apps, a proposed `INFRA_PLAN.json` has an explicit cost estimate **or `null` meaning UNKNOWN**, assumptions, pricing source, exposure to variable charges, required token scopes and exact preview/production resource names. Names for newly created resources are scoped to the unique product-repository/issue identity. The user must give a **separate approval** before provisioning.

`CLOUDFLARE_PROVISION_TOKEN` is only present in the provisioning job. D1/KV/R2 are provisioned and reconciled by exact name. A nonsecret `PROVISIONED.json` receipt records distinct resource IDs and an account fingerprint. Buildkit verifies every Worker binding against those approved IDs before preview or release.

An approved **custom domain** requires an already owned active Cloudflare zone, and is attached **only after the separate production release approval**. Existing DNS and unrelated Workers must never be replaced.

For other providers, the plan can still declare exact dependencies and costs, but Buildkit must flag a missing adapter honestly. Provisioning a container service, a new phone-app distribution account or a GPU cluster is not falsely represented as part of the existing Cloudflare adapter.

## Recovery

The original source/plan SHA is stored in the workflow request. `/status` checks GitHub Actions runs and `/resume` reconciles pending provision, preview and release requests; a later commit never changes an already approved deployment request. Non-finalized successful runs can be replayed idempotently after a visibility window to rebuild missing receipts, without destructive operations.

[Start here](HARNESS.md) · [Cloudflare details](CLOUDFLARE.md) · [README](../README.md)
