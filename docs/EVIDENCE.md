# Evidence and feasibility: what “verified” means

Buildkit is designed to **refuse unsupported success claims**. A generated summary is not evidence.

## Research evidence

- `docs/research/EVIDENCE.json`: recorded source URL, category, retrieval time, excerpt, ID, hash and gaps.
- `docs/research/SOURCES.md`: human-readable index.
- `docs/DIRECTION.md`: product recommendation citing actual `[E-001]` style evidence IDs.

The default retrieval covers public GitHub repository listings and Hugging Face model metadata. Real market/customer research requires a configured search service or supplied sources. No market evidence → mark `UNVERIFIED`. Even a valid citation can be irrelevant; inspect primary sources, conflicting reports, licence text, last meaningful commit and user complaints.

For a serious proposed OSS component, verify licence, API interface, maintenance, dependencies and at least one integration test before adopting.

## Technical probes

- `spikes/plan.json`: ordered hypotheses, declared criticality, tool, precise expected observation, allowed host.
- `spikes/results.json`: observed result, timestamp, probe ID and GO/BLOCK decision.
- `docs/FEASIBILITY.md`: human explanation citing **executed** probe IDs.

Supported automatic probes are **public HTTPS read**, **GitHub repository lookup**, **Hugging Face model metadata lookup** and **offline Node test**. A 200 response from API documentation does **not** prove an authenticated integration or user outcome. The selected probe must actually test the risky thing; reject irrelevant easy PASSes.

If critical evidence needs signed user authorization, paid API access, a GPU, a private customer database or a live write operation, obtain consent/access and test it in a separate isolated workflow, or keep the blocker explicit. Don't fake an authenticated API response.

## Human approval

Product-direction and architecture approvals bind document contents. Approving an architecture with explicitly unresolved noncritical risks does not turn them into verified facts.

**Hard limits:** citations are not a substitute for independent reasoning; synthetic benchmark fixtures do not prove real model quality, and market demand cannot be certified by an automated agent.
