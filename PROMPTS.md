# Copy/paste prompt library

Use **one prompt at a time**. Replace text in `[brackets]`. Tell the agent to **read the existing repository and documents** when available. Ask an independent model to *try to disprove* conclusions. Agents must cite sources for external claims and show command output for implementation claims.

## 01 — Idea + real-world research (planning model)
> My product idea is: [idea]. The intended paying user is [user]. The pain is [pain]. Research competing products, current open-source repos, maintained APIs and real customer complaints. Give me: a concise product thesis, actual alternatives with links, 5 evidence-backed opportunities, 5 reasons not to build, and a BUILD / ADAPT OSS / NO-GO recommendation. No generic AI startup claims; cite sources, licenses, dates. Ask only essential questions.

## 02 — MMFS scope (planning model)
> Define the smallest marketable feature set for [idea]. It must solve one real end-to-end customer job and be credible enough to charge/test. Create 3–5 primary user actions, one measurable success outcome, must-have failure states and a list of excluded features. Separate release 0, release 1, and someday. Highlight compliance, privacy, security and external dependencies. Make the scope aggressively small without making the core flow unusable.

## 03 — PRD (planning model)
> Write docs/PRD.md using docs/PRD_TEMPLATE.md. Base it only on approved MMFS, constraints and research. Include concrete personas, trigger-to-result user journeys, numbered functional requirements, nonfunctional requirements, success metrics, acceptance tests, out-of-scope and unknowns. Explicitly distinguish real integrations from mocks. Do not propose architecture yet. Mark each unverified assumption.

## 04 — Independent PRD challenge (different model)
> You did not author this PRD. Act as a skeptical product lead. Read docs/PRD.md. Locate vague requirements, missing edge cases, nonmarketable flows, assumptions disguised as facts, scope creep and security/privacy omissions. Return a short severity-ranked table with exact sections and proposed corrections. Do NOT rewrite the PRD unless asked. Focus on things that could cause an expensive build error.

## 05 — HLD + cost (architect)
> Using approved PRD, write docs/HLD.md per template. Prefer Cloudflare Workers/React, D1 only if needed, R2 only if needed, GitHub, and managed or Modal model inference as justified. Show request/data flows, trust/auth boundaries, secrets, third-party APIs, observability, resilience, scaling constraints, cost drivers and alternatives. Challenge every component: remove anything unnecessary. Compare deterministic implementation vs model call vs open-source component. State actual deployment units and environments.

## 06 — Risk spike (coding CLI)
> Before LLD, identify the 3 riskiest assumptions in docs/HLD.md. For the highest-impact one, implement a disposable proof in spikes/[name] using real APIs or an openly licensed model. Limit time and scope. Capture setup, exact commands, observed output, latency/cost, failure, and GO / CHANGE / NO-GO. Do not secretly turn spike code into production architecture. Do not assert success without executed evidence.

## 07 — LLD + build blocks (architect)
> Read approved PRD, HLD, feasibility results. Produce docs/LLD.md using template. Specify DB schemas/migrations, API methods, auth checks, typed contracts, frontend screens/states, component boundaries, error states, rate limits, telemetry, tests and rollback. Divide into vertical build blocks each completing usable behaviour, ordered by dependencies. Each block: files touched, acceptance tests, risk, ready/done criteria. Cross-reference PRD IDs. Flag any design needing PRD/HLD update; do not silently change product scope.

## 08 — Implement one block (primary coding CLI)
> You own ONLY block [BLOCK-ID] in docs/LLD.md. First read AGENTS.md, docs/PRD.md, docs/HLD.md, docs/LLD.md and relevant skills. Briefly state the existing implementation, file boundaries and acceptance criteria. Implement the smallest correct vertical slice; use test-first where practical. No fake service responses, no hidden TODOs, no unnecessary dependencies or architecture changes. Run actual tests, typecheck/build, and report exact commands/results, changed files, and incomplete items. Stop if work would overwrite another agent's files or touch another project.

## 09 — Independent adversarial code review (different CLI/model)
> You are an independent reviewer and did not implement this branch. Read the approved docs and inspect `git diff` against main. Focus on functional misalignment, missing integrations, auth bypass, broken error paths, costs, privacy, incorrect model wiring, slop/placeholder UI, untested claims and regressions. Rank findings Critical/High/Medium/Low with file:line and a reproducible failure. Run focused tests yourself if tools permit. Do not approve because the original agent said it passed. List whether this branch is safe to merge.

## 10 — Truthful release / deployment check (release CLI)
> Verify production release of [product] in exact GitHub repository [owner/repo], Cloudflare Worker [worker name], environment [environment] and, if applicable, Modal app [name]. Check PRs, merge commits and remote main HEAD. Confirm build/tests/CI, deployed version/SHA, resource bindings/secrets by name (never print secret values), correct production URL, HTTP and browser user flow, logs, rollback option, and budget alerts. Return a matrix: built | reviewed | merged | deployed | smoke-tested for every completed block, with evidence and remaining gaps. Never equate a pushed branch or successful local build with deployment.

## 11 — OSS reuse (before implementing a hard subsystem)
> Search for maintained, production-quality OSS components solving [subsystem]. Compare at most five: URL, license incl. commercial terms, last meaningful maintenance, dependencies, API fit, test coverage, integration complexity, security flags and what precise source files/interfaces could be reused. Prefer lifting a small component under its license to adopting an entire unrelated framework. Return the top two with pros/cons and a one-hour spike plan. If none is appropriate, say BUILD.

## 12 — Hugging Face model choice (before paying for GPU)
> We need [AI task], languages [x], context/input lengths [x], latency [x], precision/privacy constraints [x], and expected volume [x]. Compare up to five current HF models (or explain why a deterministic algorithm/hosted API is superior). Verify licenses, model cards, benchmarks, precision/memory, runtime compatibility and serving cost. Propose a reproducible evaluation with 20–50 examples, quality threshold, p50/p95 latency, concurrency and cost per 1000 requests. Pick smallest passing model; don't confuse benchmark leaderboard with task fitness.

## 13 — Anti-slop UX/code pass (before UI acceptance)
> Apply the anti-slop skill to [feature]. Inspect real rendered screens AND implementation. Find generic templated styling, irrelevant graphics, invented numbers/testimonials, missing empty/loading/error states, inert CTAs, duplicated abstractions, any mocks represented as production, unreadable mobile UI and accessibility errors. Produce a concrete fix list ranked by usability and credibility. Make only approved changes, then verify in browser at mobile and desktop widths.

## 14 — Post-launch reality check
> Read production metrics for [period]. Compare actual success rate, drop-offs, feature usage, errors, response latency and real infrastructure/model cost against the PRD's market-test goal. Distinguish evidence from interpretation. Propose at most 3 next changes, each with effort/risk/expected outcome. Do not recommend large architecture or feature expansion without data.
