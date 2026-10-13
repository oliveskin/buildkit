import test from "node:test";
import assert from "node:assert/strict";
import {parseCommand, mayOperate, makeState, newGate, checkApproval, validateBlocks, permittedChange} from "./core.mjs";

test("commands are explicit, not buried in issue content", () => {
  assert.deepEqual(parseCommand("/approve a1b2c3d4"),{name:"approve",arg:"a1b2c3d4"});
  assert.deepEqual(parseCommand("/revise Make it simpler"),{name:"revise",arg:"Make it simpler"});
  assert.equal(parseCommand("Please /approve a1b2c3d4"),null);
  assert.equal(parseCommand("/deploy"),null);
});
test("only write-capable collaborators control paid workflows", () => {
  assert.equal(mayOperate("write"),true); assert.equal(mayOperate("admin"),true);
  assert.equal(mayOperate("read"),false); assert.equal(mayOperate("triage"),false);
});
test("approval is bound to exact outputs and one gate", () => {
  const s=makeState(14), contents=["PRD A","HLD A"];
  s.status="awaiting_approval";s.gate=newGate("architecture",contents,1);
  assert.equal(checkApproval(s,s.gate.code,contents),null);
  assert.match(checkApproval(s,s.gate.code,["PRD B","HLD A"]),/changed/);
  assert.match(checkApproval(s,"deadbeef",contents),/outdated/);
  s.status="blocked"; assert.match(checkApproval(s,s.gate.code,contents),/Nothing/);
});
test("build plans are bounded and ordered", () => {
  assert.equal(validateBlocks({blocks:[{id:"B01",goal:"Build core user flow",acceptance:["End-to-end test passes"]}]}).length,1);
  assert.throws(()=>validateBlocks({blocks:[{id:"B07",goal:"Invalid block id",acceptance:["ok"]}]}));
  assert.throws(()=>validateBlocks({blocks:Array.from({length:4},(_,i)=>({id:`B0${i+1}`,goal:"Too many blocks to build",acceptance:["test"]}))}));
});
test("protected workflow files, credentials, and traversal paths cannot be committed by agents", () => {
  for(const p of [".github/workflows/a.yml","harness/run.mjs",".buildkit/state.json","../bad",".env.production","some/.dev.vars","AGENTS.md","scripts/run.sh"]) assert.equal(permittedChange(p),false,p);
  for(const p of ["src/App.tsx","docs/PRD.md","tests/example.test.ts","package.json"]) assert.equal(permittedChange(p),true,p);
});
