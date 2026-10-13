# Build output contract

Buildkit builds application code **without cloud or model credentials**, keeps the resulting bytes in a GitHub Actions artifact, and deploys those bytes to preview and production. Production does not rebuild from source.

The coding agent must make `npm run build` emit a self-contained directory, by default `dist/buildkit/`. An alternative under `dist/` can be set in `package.json` as `buildkit.deploymentDirectory`.

```text
dist/buildkit/
  wrangler.json        # strict JSON; same approved runtime settings and bindings
  worker/index.mjs     # prebundled Worker; no npm install needed to upload
  assets/              # compiled frontend assets, where required
```

The emitted Wrangler configuration must set `no_bundle: true`. Its `main` and `assets.directory` refer only to files inside the emitted directory. Every other runtime setting, binding, preview override and rule must match the approved root `wrangler.json`. No credential files, package manifests, dependencies, build commands, symlinks, external paths or executable setup hooks may be shipped in this directory. Static-only Workers may omit `main`.

For React/Vite, the agent configures the build to copy Vite's compiled frontend and bundle the Worker into this layout. Build support can live under `tooling/`; agents may not change Buildkit's protected `scripts/` directory. Native framework-generated configuration needs an explicit conversion into this contract; it must not silently override approved bindings.

The preview build job performs a clean locked install, dependency audit, build and tests in an isolated snapshot. The controller then validates output, scans it, records a per-file hash manifest and uploads the package. The preview report records its immutable GitHub artifact ID, run ID, source SHA and payload digest.

Production retrieves **that artifact ID from that verified preview run**, revalidates every payload hash and the approved target, and uploads without running project scripts. If the artifact expires or is deleted, obtain a new preview and fresh approvals. Do not substitute a rebuild for missing reviewed bytes.

GitHub retains these artifacts for 30 days, subject to account policy. A deployment failure does not invalidate the original release approval unless source, target, review or artifact changes; safe retries use the same approved source and artifact.
