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

## Risk-based app assurance

All products: authorization, tenant boundaries, safe error messages, input validation, rate limits, dependencies, logging without sensitive data, browser tests and rollback procedures.

Sensitive categories (health, finance, children, biometric data, regulated identity): require human review by appropriately qualified professionals before claiming compliance. Buildkit's pattern-based screening is a **triage tool**, not legal advice or certification. Keep a record of jurisdiction, data flows, retention policies, processors and applicable obligations.

## Where the safeguards live

- `harness/security.mjs` — file/path checks and isolated npm test execution.
- `harness/security-gate.mjs` — application file scanning.
- `harness/compliance.mjs` — risk triage and release blockers.
- `.github/workflows/harness-tests.yml` — CI.
- `.github/workflows/buildkit-preview.yml` and `buildkit-release.yml` — privilege separation and release checks.

See [Cloudflare deployment guidance](CLOUDFLARE.md).
