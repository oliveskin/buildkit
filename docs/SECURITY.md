# Security, credentials and compliance

## Secret protection: layered, never a guarantee

1. Repo `.gitignore` excludes `.env*`, `.dev.vars*`, node modules, local artefacts and credentials. Only **examples with placeholders** belong in Git.
2. `harness/security-gate.mjs` rejects known token formats, private keys, suspicious credential paths and discovered actual model/GitHub token values, before the controller saves generated files.
3. `harness/scan-local.mjs` and `scripts/install-hooks.sh` can install pre-commit scanning locally. Hooks can be bypassed; they are **not** the required control.
4. GitHub Actions and the Preview/Release pipelines run **Gitleaks** on code and history and stop on findings; Release also runs an npm high-severity audit.
5. Repository secrets and Cloudflare secrets hold values. Never post keys in GitHub Issues, docs, chat examples or `.env.example`.
6. Preview token and production token are distinct; production secrets must not reach the agent or browser job. Deploy only after explicit, exact-version approval.

If an actual key is ever exposed, revoke or rotate it **immediately**. Editing or deleting the visible file is not enough: repository history, cached logs and copies may persist. Investigate before reusing the key.

**Reality check:** scanners cannot catch all secrets, and the coding agent's process still receives its provider key. Buildkit is not safe for arbitrary adversarial repositories; avoid giving an agent access to your production credentials.

## Model providers and custom endpoints

`harness/model-config.mjs` enumerates the supported model secret names for redaction. Each coding subprocess receives only its selected credential; other provider, GitHub and Cloudflare keys stay out of that process. OpenCode credentials are passed through its isolated environment, never embedded into committed configuration. A reviewer can use a separate `BUILDKIT_REVIEW_API_KEY`.

OpenCode runs in a disposable copied workspace without Git metadata and uses a separate temporary HOME/config/data directory. Shell commands, subagents, network tools, external directories, external plugins and session sharing are disabled. The controller validates changed files before copying them back; read-only review cannot change the product. Product-controlled `.opencode` or `opencode.json` configuration is rejected. These restrictions are not a hardened operating-system sandbox; the provider key is still present in the coding process.

Custom API URLs are administrator-controlled repository variables, not commands from an Issue. They must be public HTTPS base URLs without credentials, query parameters or IP literals; hostname resolution is checked before a new OpenCode profile runs. Only configure trusted endpoints: choosing one authorizes sending build prompts and source to that service. DNS validation does not claim complete network isolation or protection from a malicious provider.

Preflight uses synthetic files, not customer source, to check basic read/edit capability. Failed preflight blocks the task. Usage records contain only model identity, call outcomes and available counters; unknown billing is not recorded as free. Provider spending limits remain necessary. See [model setup and exact controls](MODELS.md).

## Risk-based app assurance

All products: authorization, tenant boundaries, safe error messages, input validation, rate limits, dependencies, logging without sensitive data, browser tests and rollback procedures.

Sensitive categories (health, finance, children, biometric data, regulated identity): require human review by appropriately qualified professionals before claiming compliance. Buildkit's pattern-based screening is a **triage tool**, not legal advice or certification. Keep a record of jurisdiction, data flows, retention policies, processors and applicable obligations.

## Where the safeguards live

- `harness/security.mjs` — file/path checks and isolated build/test execution.
- `harness/security-gate.mjs` — application file scanning.
- `harness/model-config.mjs`, `model-runtime.mjs`, `opencode-agent.mjs` — provider selection, credential filtering, limits, preflight and copied workspaces.
- `harness/review-policy.mjs` — version-bound human/model review; gateway changes do not create independent models.
- `harness/compliance.mjs` — risk triage and release blockers.
- `.github/workflows/harness-tests.yml` — offline regressions and real CLI checks with a simulated local API, not paid inference.
- `.github/workflows/buildkit-preview.yml` and `buildkit-release.yml` — privilege separation and release checks.

See [Cloudflare deployment guidance](CLOUDFLARE.md).
