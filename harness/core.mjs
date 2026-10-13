import { createHash, randomBytes } from "node:crypto";

export const PRODUCT_LABEL = "buildkit:idea";
export const STAGE_FILES = Object.freeze({
  direction: ["docs/DIRECTION.md"],
  architecture: ["docs/PRD.md", "docs/HLD.md", "docs/FEASIBILITY.md"],
  implementation: ["docs/LLD.md", "docs/BUILD_BLOCKS.json"],
});
export const GATE_NEXT = Object.freeze({direction:"architecture", architecture:"implementation", preview:"release-ready"});
export function parseCommand(body = "") {
  const match = String(body).trim().match(/^\/(start|status|approve|revise|resume)(?:\s+([\s\S]*))?$/i);
  return match ? { name: match[1].toLowerCase(), arg: (match[2] || "").trim() } : null;
}
export function mayOperate(permission) {
  return ["admin","maintain","write"].includes(String(permission || "").toLowerCase());
}
export function makeState(issue) {
  if (!Number.isSafeInteger(issue) || issue <= 0) throw new Error("Invalid issue number");
  return { version:1, issue, stage:"direction", status:"new", revision:0, gate:null, completedBlocks:[], eventIds:[], history:[] };
}
export function newGate(stage, fileContents, revision) {
  if (!["direction","architecture","preview"].includes(stage)) throw new Error("Invalid approval stage");
  const digest = createHash("sha256").update(JSON.stringify(fileContents)).digest("hex");
  return {stage, revision, digest, code:randomBytes(4).toString("hex")};
}
export function checkApproval(state, code, files) {
  if (state.status !== "awaiting_approval" || !state.gate) return "Nothing is awaiting approval.";
  if (!/^[0-9a-f]{8}$/i.test(code || "") || code.toLowerCase() !== state.gate.code) return "Incorrect or outdated approval code.";
  const digest = createHash("sha256").update(JSON.stringify(files)).digest("hex");
  if (digest !== state.gate.digest) return "The documents have changed since review; request /revise before approval.";
  return null;
}
export function validateBlocks(parsed) {
  if (!parsed || !Array.isArray(parsed.blocks) || parsed.blocks.length < 1 || parsed.blocks.length > 3) throw new Error("Need 1–3 bounded build blocks.");
  const ids = new Set();
  for(const [i,b] of parsed.blocks.entries()) {
    if (b.id !== `B${String(i+1).padStart(2,"0")}` || typeof b.goal !== "string" || b.goal.length < 12 ||
        !Array.isArray(b.acceptance) || !b.acceptance.length || b.acceptance.some(x=>typeof x!=="string" || !x.trim()) ||
        ids.has(b.id)) throw new Error("Invalid block definition.");
    ids.add(b.id);
  }
  return parsed.blocks;
}
export function permittedChange(path) {
  if (!path || path.includes("..") || path.startsWith("/") || path.includes("\\") || /\p{Cc}/u.test(path)) return false;
  const forbidden = [".github/", "harness/", ".agents/", ".claude/", ".buildkit/", "node_modules/", ".git/", "scripts/"];
  if (forbidden.some(x=>path.startsWith(x)) || ["AGENTS.md","CLAUDE.md","PROMPTS.md","README.md","package-lock.json.bak"].includes(path)) return false;
  if (/(^|\/)\.env(\.|$)/.test(path) || /(^|\/)(\.dev\.vars|id_rsa|credentials\.json)/.test(path)) return false;
  return true;
}
