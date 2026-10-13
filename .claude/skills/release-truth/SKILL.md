---
name: release-truth
description: Use at end of every block and whenever asked status/merged/deployed.
---

1. Examine local & remote Git SHA, branch, PR merge status and CI artifacts.
2. Check expected Cloudflare worker/environment bindings and deployment SHA, and Modal app/version if present.
3. Run public URL/API smoke test with a real authorized workflow and one failure path.
4. Record evidence separately as BUILT, REVIEWED, MERGED, DEPLOYED, PRODUCTION-TESTED.
5. If live verification unavailable, explicitly say UNKNOWN, not DONE.
6. Record rollback commit/deployment and any missing checks.
