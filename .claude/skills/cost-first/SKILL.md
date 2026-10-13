---
name: cost-first
description: Use on HLD, model selection, deployment or new third-party services.
---

1. List every paid meter: agent tokens, API tokens, GPU seconds, warm containers, DB ops, object storage, bandwidth, notifications, observability and support.
2. Estimate unit cost at 1, 10, 100 and 1000 users, indicating assumptions and prices requiring verification.
3. Ask: can this be deterministic? cached? on CPU? scale-to-zero? delayed/queued? removed until a real user needs it?
4. Set service spend limits/alerts and volume/rate safeguards before public access.
5. Record biggest driver and precise trigger for revisiting infrastructure.
