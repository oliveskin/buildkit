---
name: hf-model-eval
description: Use whenever selecting or wiring a Hugging Face model, fine tuning or moving inference to Modal.
---

1. Write the task, input/output schema, ground-truth examples, languages, response deadline and privacy constraints.
2. Verify model card, license, weights access, quantization and runtime; cite exact model revision.
3. Compare with rules/SQL and hosted API before GPU infrastructure.
4. Evaluate >=20 representative examples, including hard negatives; record quality/errors, median and p95 latency, VRAM/CPU and cost/request.
5. Deploy via server-side authenticated endpoint, cap concurrency, use scale-to-zero if appropriate, keep secrets out of client.
6. Document rollback and model-version pinning. Do not declare the model good based solely on public benchmark scores.
