---
name: oss-first
description: Use before adding a large dependency, subsystem, parser, authentication layer or integration.
---

1. Search current official repos and note URL/license/version/maintainers.
2. Compare: what can be extracted independently? what maintenance burden is inherited? security/license issue?
3. Don't copy code if license is incompatible; preserve required notices/attribution.
4. Spike the smallest candidate using its real API and check tests.
5. Recommend one of: reuse component / rely on maintained library / implement small custom module; explain total long-term cost.
