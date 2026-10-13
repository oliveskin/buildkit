import { createHash, randomBytes } from "node:crypto";

export const PRODUCT_LABEL = "buildkit:idea";
export const STAGE_FILES = Object.freeze({
  direction: ["docs/DIRECTION.md", "docs/research/EVIDENCE.json"],
  architecture: ["docs/PRD.md", "docs/HLD.md", "docs/FEASIBILITY.md","spikes/plan.json","spikes/results.json"],
  implementation: ["docs/LLD.md", "docs/BUILD_BLOCKS.json"],
});
export const GATE_NEXT = Object.freeze({direction:"architecture", architecture:"implementation", preview:"release-ready"});
export const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function parseCommand(body = "") {
  const match = String(body).trim().match(/^\/(start|status|approve|revise|resume)(?:\s+([\s\S]*))?$/i);
  return match ? { name: match[1].toLowerCase(), arg: (match[2] || "").trim() } : null;
}
export function mayOperate(permission) {
  return ["admin","maintain","write"].includes(String(permission || "").toLowerCase());
}
export function makeState(issue) {
  if (!Number.isSafeInteger(issue) || issue <= 0) throw new Error("Invalid issue number");
  return {version:1, issue, stage:"direction", status:"new", revision:0, gate:null,
    completedBlocks:[], eventIds:[], history:[], approvedDocs:{}};
}
export function newGate(stage, fileContents, revision) {
  if (!Object.hasOwn(GATE_NEXT, stage)) throw new Error("Invalid approval stage");
  return {stage, revision, digest:digest(fileContents), code:randomBytes(4).toString("hex")};
}
export function checkApproval(state, code, files) {
  if (state.status !== "awaiting_approval" || !state.gate) return "Nothing is awaiting approval.";
  if (!/^[0-9a-f]{8}$/i.test(code || "") || code.toLowerCase() !== state.gate.code) return "Incorrect or outdated approval code.";
  if (digest(files) !== state.gate.digest) return "The documents have changed since review; request /revise before approval.";
  return null;
}
export function validateBlocks(parsed) {
  if (!parsed || !Array.isArray(parsed.blocks) || parsed.blocks.length < 1 || parsed.blocks.length > 3) throw new Error("Need 1–3 bounded build blocks.");
  for (const [i,b] of parsed.blocks.entries()) {
    if (!b || b.id !== `B${String(i+1).padStart(2,"0")}` || typeof b.goal !== "string" || b.goal.trim().length < 12 ||
        !Array.isArray(b.acceptance) || !b.acceptance.length || b.acceptance.some(x=>typeof x!=="string" || !x.trim())) throw new Error("Invalid block definition.");
  }
  return parsed.blocks;
}
export function permittedChange(path) {
  if (typeof path !== "string" || !path || path.includes("..") || path.startsWith("/") || path.includes("\\") || /\p{Cc}/u.test(path)) return false;
  const forbidden = [".github", "harness", ".agents", ".claude", ".codex", ".buildkit", "node_modules", ".git", "scripts"];
  if (forbidden.some(x=>path===x || path.startsWith(x+"/"))) return false;
  if (["AGENTS.md","CLAUDE.md","PROMPTS.md","README.md","START-HERE.md",".gitignore"].includes(path)) return false;
  if (/(^|\/)\.(env(\.|$)|dev\.vars|npmrc$|yarnrc|mcp\.json$)/.test(path) || /(^|\/)(id_rsa|id_ed25519|credentials\.json)(\.|$)/.test(path)) return false;
  return true;
}
export function selectProvider(env) {
  const provider=(env.BUILDKIT_PROVIDER || (env.OPENAI_API_KEY ? "codex" : env.ANTHROPIC_API_KEY ? "claude" : "codex")).trim().toLowerCase();
  if (!["codex","claude"].includes(provider)) throw new Error("BUILDKIT_PROVIDER must be codex or claude.");
  return provider;
}
export function cleanEnv(env) {
  const result={CI:"true",TERM:"dumb",GIT_TERMINAL_PROMPT:"0"};
  for (const key of ["PATH","HOME","TMPDIR","LANG","LC_ALL","SystemRoot"])
    if (env[key]) result[key]=env[key];
  return result;
}
export function agentConfig(provider, env, readOnly=false) {
  const safeEnv=cleanEnv(env);
  if (provider==="codex") {
    if (!env.OPENAI_API_KEY) throw new Error("Set OPENAI_API_KEY repository secret.");
    safeEnv.CODEX_API_KEY=env.OPENAI_API_KEY;
    return {env:safeEnv,args:["exec","--sandbox",readOnly?"read-only":"workspace-write","-"]};
  }
  if (provider!=="claude") throw new Error("Unknown provider.");
  if (!env.ANTHROPIC_API_KEY) throw new Error("Set ANTHROPIC_API_KEY repository secret.");
  safeEnv.ANTHROPIC_API_KEY=env.ANTHROPIC_API_KEY;
  const tools=readOnly?"Read,Glob,Grep":"Read,Write,Edit,Glob,Grep";
  return {env:safeEnv,args:["-p","--permission-mode",readOnly?"dontAsk":"acceptEdits",
    "--tools",tools,"--allowedTools",tools,"--disallowedTools","mcp__*",
    "--strict-mcp-config","--mcp-config",'{"mcpServers":{}}',
    "--max-turns","20","--max-budget-usd","2","--no-session-persistence"]};
}
