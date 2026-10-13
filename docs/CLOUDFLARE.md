# Cloudflare is an optional Buildkit adapter

Buildkit itself runs from GitHub. **Only if the approved HLD chooses Cloudflare Workers** does this adapter manage Worker previews, D1/KV/R2 resources, custom-domain attachment and production release. Native applications, GPU services and other providers must retain their chosen stack; unsupported adapters are explicit blockers.

## Review cost and permissions before creating anything

The architecture agent generates `docs/EXECUTION_PLAN.json` and `docs/INFRA_PLAN.json`. Human approval of the execution plan is followed by a **separate provisioning approval** whenever resources or a custom domain are proposed.

The resource plan includes exact names, isolation requirements, pricing source, estimated monthly USD charges (or **UNKNOWN**), assumptions, possibly variable charges, token permission scopes and side effects. Reviewing the estimate is not the same as enabling an account-level hard spend cap.

In the **private product repository** under GitHub Actions secrets, configure only the credentials needed by that product:

| Setting | When used |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Provision, preview and release |
| `CLOUDFLARE_PROVISION_TOKEN` | Dedicated D1/KV/R2 create/list permission after provisioning approval |
| `CLOUDFLARE_PREVIEW_TOKEN` | Upload the approved staging Worker Preview |
| `CLOUDFLARE_PROD_TOKEN` | After production release approval: deploy Worker and attach any exact approved domain |
| Optional variable `BUILDKIT_WORKER_NAME` | Additional assertion that must match `EXECUTION_PLAN.json` Worker name; **not** a universal requirement |

Never put API keys in Issues, README, environment examples, Wrangler config or the public Buildkit source repository.

## Resource isolation and reconciliation

For a Cloudflare Worker, Buildkit can **actually create** approved D1 databases, Workers KV namespaces and R2 buckets using Cloudflare's API. Each resource is named specifically for the product and has separate preview/production identities. Exact resource identifiers and account fingerprint are persisted in the nonsecret `docs/infrastructure/PROVISIONED.json` receipt.

The agent generates `wrangler.json` from those bound resources. Before preview or release, the controller checks the resolved binding names and IDs against the approved infrastructure plan and receipt. Existing resources are only reused through an explicitly approved `reuse` mode with exact resource IDs, or safely reconciled within Buildkit's product-specific namespace on retries.

Cloudflare Workers Previews automatically isolate certain Worker-owned state, but D1, KV and R2 are account-level resources and **must** use separate staging bindings. Do not populate public previews with real customer data.

For resources outside the adapter (e.g. other provider managed databases, specialised GPU infrastructure), the plan remains valid but Buildkit reports the missing provider-specific adapter rather than using an unrelated Cloudflare resource.

## Preview

After implementing all approved, requirement-mapped blocks, the Worker adapter builds the application in a credential-free container, preserves immutable output and a SHA-256 manifest, scans dependencies and secrets, and publishes the exact build to Workers Previews. Playwright records browser journeys and screenshots. The user approves the actual result.

See [output contract](BUILD_OUTPUT.md). The source code, built application, plan, checked artifact and approval codes must remain version-bound.

## Custom domains and production

A custom domain is optional. A plan can propose an exact hostname and the ID of the user's **active, owned Cloudflare zone**. The provisioning stage records the intent but **does not change DNS**.

After a distinct production release approval, Buildkit verifies the existing zone, account and DNS/Worker-domain conflicts. Only then does it attach the approved hostname to the approved Worker, without overwriting an existing record. Domain attachment failure is reported as a partial release requiring reconciliation, not a successful launch.

Production uploads the **same exact immutable build tested in preview** and verifies the real production URL. Approval never grants permission to deploy to a different Worker or Cloudflare account. Provider usage charges, migrations, backups and rollback need separate operating consideration.

References: [Workers Previews](https://developers.cloudflare.com/workers/previews/) · [Provision D1/KV/R2](https://developers.cloudflare.com/changelog/post/2025-10-24-automatic-resource-provisioning/) · [Custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

[Back to guided setup](HARNESS.md) · [Execution adapters](EXECUTION_ADAPTERS.md).
