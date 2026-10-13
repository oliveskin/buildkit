"""Minimal *demo* HF model on Modal with auth. CPU first; switch to GPU only if evaluated need.

Install locally: pip install modal fastapi
Create secret: modal secret create solo-builder-inference INFERENCE_TOKEN=your_random_secret
Then: modal serve examples/modal_inference.py or modal deploy examples/modal_inference.py
Set Cloudflare MODAL_INFERENCE_URL and MODAL_INFERENCE_TOKEN secrets server-side.

Publicly callable Modal endpoint is protected by shared server-to-server token.
This DOES NOT authenticate end-users: protect /api/infer at Cloudflare before public release.
"""
import hmac
import os

import modal
from fastapi import Header, HTTPException

app = modal.App("solo-builder-hf-demo")
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "fastapi[standard]", "transformers>=4.45,<5", "torch>=2.3,<3"
)
_pipeline = None

@app.function(
    image=image,
    cpu=2,
    memory=4096,
    min_containers=0,             # Scale to zero for demo
    max_containers=1,             # Guard demo spend
    scaledown_window=30,
    timeout=300,
    secrets=[modal.Secret.from_name("solo-builder-inference")],
    # For a genuinely GPU-worthy model and verified cost, consider gpu="T4".
)
@modal.fastapi_endpoint(method="POST")
def infer(payload: dict, authorization: str = Header(default="")) -> dict:
    secret = os.environ["INFERENCE_TOKEN"]
    if not hmac.compare_digest(authorization, f"Bearer {secret}"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    prompt = payload.get("prompt")
    if not isinstance(prompt, str) or not 1 <= len(prompt) <= 1000:
        raise HTTPException(status_code=400, detail="prompt must be 1–1000 chars")
    global _pipeline
    if _pipeline is None:
        from transformers import pipeline
        _pipeline = pipeline("text2text-generation", model="google/flan-t5-small")
    result = _pipeline(prompt, max_new_tokens=96, do_sample=False)
    return {"text": result[0]["generated_text"]}
