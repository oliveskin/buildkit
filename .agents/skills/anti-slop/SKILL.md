---
name: anti-slop
description: Use for UI creation, feature completion and code review to eliminate AI-generated slop and misleading demos.
---

## UI
- Ground visual design in real product tasks and supplied design references; avoid gratuitous gradients, glassmorphism, random icons and generic dashboards.
- Check loaded/empty/error/disabled/success states, mobile layout, keyboard access, readable contrast and genuinely working CTAs.
- No invented metrics, customer photos, endorsements, fake data or dead links.
## Code
- No unused abstraction libraries, duplicate components, hardcoded demo success, hidden TODOs, suppressed errors or unexecuted test claims.
- Trace UI action → API → authorization → persistence/inference → response → UI state and test with real data where appropriate.
## Finish
- Summarize only actual defects fixed and evidence (screenshots, browser outcomes, test command logs).
