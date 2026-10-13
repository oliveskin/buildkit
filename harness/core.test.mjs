import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {parseCommand,mayOperate,makeState,newGate,checkApproval,validateBlocks,permittedChange,selectProvider,cleanEnv,agentConfig,digest} from "./core.mjs";
import {inspectFile,assertChanges,makeTestSnapshot,containerArgs,redact} from "./security.mjs";

test("commands are explicit, never buried in prose",()=>{
  assert.deepEqual(parseCommand("/approve a1b2c3d4"),{name:"approve",arg:"a1b2c3d4"});
  assert.deepEqual(parseCommand("/revise Make it simpler"),{name:"revise",arg:"Make it simpler"});
  assert.equal(parseCommand("Please /approve a1b2c3d4"),null);assert.equal(parseCommand("/deploy"),null);
});
test("only write-capable collaborators may operate",()=>{
  for(const p of ["write","admin","maintain"])assert.equal(mayOperate(p),true);
  for(const p of ["read","triage",null,"owner"])assert.equal(mayOperate(p),false);
});
test("approval binds exact outputs and gate",()=>{
  const s=makeState(1);s.status="awaiting_approval";s.gate=newGate("architecture",["PRD"],1);
  assert.equal(checkApproval(s,s.gate.code,["PRD"]),null);
  assert.match(checkApproval(s,s.gate.code,["changed"]),/changed/);
  assert.match(checkApproval(s,"notacode",["PRD"]),/outdated/);
  s.status="blocked";assert.match(checkApproval(s,s.gate.code,["PRD"]),/Nothing/);
});
test("blocks must be ordered, finite, and testable",()=>{
  const good={id:"B01",goal:"Complete the main user workflow",acceptance:["Behavioural test passes"]};
  assert.equal(validateBlocks({blocks:[good]}).length,1);
  for(const blocks of [[],[null],[{...good,id:"B99"}],[{...good,acceptance:[]}],Array(4).fill(good)])assert.throws(()=>validateBlocks({blocks}));
});
test("file policies reject controls, credentials and path traversal",()=>{
  for(const p of ["../foo",".github/workflows/a.yml",".git",".git/config",".codex/config.toml",".mcp.json",".env.production","nested/.npmrc","nested/id_ed25519","harness/a.mjs","scripts/a.sh",".buildkit/state.json","README.md",".gitignore"])
    assert.equal(permittedChange(p),false,p);
  for(const p of ["src/App.tsx","package.json","package-lock.json","docs/PRD.md","tests/main.test.mjs"])assert.equal(permittedChange(p),true,p);
});
test("provider is automatically selected from the configured key",()=>{
  assert.equal(selectProvider({ANTHROPIC_API_KEY:"x"}),"claude");
  assert.equal(selectProvider({OPENAI_API_KEY:"x",ANTHROPIC_API_KEY:"y"}),"codex");
  assert.throws(()=>selectProvider({BUILDKIT_PROVIDER:"other"}));
});
const env={PATH:"/bin",HOME:"/tmp",GITHUB_TOKEN:"github-secret",OPENAI_API_KEY:"openai-secret",ANTHROPIC_API_KEY:"claude-secret",NODE_OPTIONS:"--require malicious",NPM_TOKEN:"npm-secret"};
test("non-agent subprocesses inherit no credentials or runtime injection",()=>{
  const out=cleanEnv(env);for(const key of ["GITHUB_TOKEN","OPENAI_API_KEY","ANTHROPIC_API_KEY","NODE_OPTIONS","NPM_TOKEN"])assert.equal(out[key],undefined);
});
test("Codex uses noninteractive API auth and least necessary sandbox",()=>{
  const cfg=agentConfig("codex",env);assert.equal(cfg.env.CODEX_API_KEY,"openai-secret");assert.equal(cfg.env.OPENAI_API_KEY,undefined);
  assert.equal(cfg.env.GITHUB_TOKEN,undefined);assert.equal(cfg.env.ANTHROPIC_API_KEY,undefined);
  assert.deepEqual(cfg.args,["exec","--sandbox","workspace-write","-"]);
  assert.ok(agentConfig("codex",env,true).args.includes("read-only"));assert.throws(()=>agentConfig("codex",{}));
});
test("Claude allowedTools is backed by a real tool restriction",()=>{
  const cfg=agentConfig("claude",env,true);assert.ok(cfg.args.includes("--tools"));assert.ok(cfg.args.includes("--max-turns"));
  assert.equal(cfg.env.GITHUB_TOKEN,undefined);assert.equal(cfg.env.OPENAI_API_KEY,undefined);
  assert.equal(cfg.args[cfg.args.indexOf("--tools")+1],"Read,Glob,Grep");
});
test("file snapshot detects deletion, binary changes, permissions and symlinks",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bk-unit-"));try{
    fs.writeFileSync(path.join(dir,"data"),Buffer.from([1,2]));const a=digest(inspectFile(dir,"data"));
    fs.writeFileSync(path.join(dir,"data"),Buffer.from([1,3]));assert.notEqual(a,digest(inspectFile(dir,"data")));
    fs.symlinkSync("data",path.join(dir,"link"));assert.throws(()=>inspectFile(dir,"link"),/Symlink/);
    assert.deepEqual(inspectFile(dir,"missing/nested"),{path:"missing/nested",missing:true});
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("known credential values cannot be committed in ordinary files",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bk-secret-"));try{
    fs.writeFileSync(path.join(dir,"data.txt"),"openai-secret");assert.throws(()=>assertChanges(dir,["data.txt"],[env.OPENAI_API_KEY]),/Credential/);
    assert.equal(redact("a openai-secret b",[env.OPENAI_API_KEY]),"a [REDACTED] b");
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("test containers omit credentials and disable build/test networking",()=>{
  const args=containerArgs("/tmp/test",["npm","test"]);assert.ok(args.includes("--network=none"));assert.ok(args.includes("--cap-drop=ALL"));
  assert.ok(args.includes("--read-only"));assert.ok(!args.join(" ").includes("GITHUB_TOKEN"));
  assert.ok(containerArgs("/tmp/test",["npm","ci"],true).includes("--network=bridge"));
});
test("test snapshots contain application files, not Git or harness state",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"bk-copy-"));let copy;
  try{fs.mkdirSync(path.join(dir,".git"));fs.writeFileSync(path.join(dir,".git/config"),"secret");fs.writeFileSync(path.join(dir,"package.json"),"{}");
    copy=makeTestSnapshot(dir,[".git/config","package.json"]);assert.ok(!fs.existsSync(path.join(copy,".git")));assert.ok(fs.existsSync(path.join(copy,"package.json")));
  }finally{fs.rmSync(dir,{recursive:true,force:true});if(copy)fs.rmSync(copy,{recursive:true,force:true});}
});
