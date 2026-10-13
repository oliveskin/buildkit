/** Illustrative drop-in handler for a Cloudflare React + Vite Worker scaffold.
 * Adapt file location/router to your generated project before deploy.
 * Critical: implement actual user authentication, user-specific quotas and abuse controls
 * before making this a public paid API. A shared Modal secret authenticates servers ONLY.
 */
interface Env {
  MODAL_INFERENCE_URL: string;  // Wrangler secret
  MODAL_INFERENCE_TOKEN: string; // Wrangler secret; NEVER expose to browser
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/api/infer") return new Response("Not found", { status: 404 });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    // DEMO ONLY: authenticate user and enforce per-user quotas here for public release.
    let body: unknown;
    try { body = await request.json(); }
    catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    const prompt = (body as { prompt?: unknown } | null)?.prompt;
    if (typeof prompt !== "string" || prompt.length < 1 || prompt.length > 1000) {
      return Response.json({ error: "prompt must be 1–1000 chars" }, { status: 400 });
    }
    try {
      const response = await fetch(env.MODAL_INFERENCE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.MODAL_INFERENCE_TOKEN}`,
        },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(90000), // First cold start may be slow
      });
      if (!response.ok) return Response.json({ error: "Model request failed" }, { status: 502 });
      return Response.json(await response.json());
    } catch {
      return Response.json({ error: "Model timed out or unavailable" }, { status: 504 });
    }
  },
};
