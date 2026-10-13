import test from "node:test";
import assert from "node:assert/strict";
import {researchQuery,normalizeEvidence,verifyResearch,collectResearch,safeSourceUrl} from "./research.mjs";
import {verifySpikePlan,executeSpikes,allowedProbeHost} from "./feasibility.mjs";
import {detectSecret} from "./security-gate.mjs";
const github={items:[{full_name:"sample/tool",html_url:"https://github.com/sample/tool",
  description:"Open source reservation scheduler",license:{spdx_id:"MIT"},
  stargazers_count:100,pushed_at:"2026-10-01",archived:false}]};
const hf=[{id:"sample/assistant",tags:["license:apache-2.0"],lastModified:"2026-10-01",downloads:50}];
const searx={results:[{title:"Known competitor",url:"https://example.com/competitor",content:"Competes on bookings and scheduling"}]};
const mock=async url=>({ok:true,status:200,text:async()=>JSON.stringify(url.includes("api.github.com")?github:url.includes("huggingface.co")?hf:searx)});
test("source normalization filters duplicates and unsafe URLs",()=>{
 const x=normalizeEvidence([{category:"oss",url:"https://github.com/a/b",title:"x",excerpt:"Documented source"},
  {category:"oss",url:"https://github.com/a/b",title:"duplicate",excerpt:"Documented source"},
  {category:"market",url:"http://localhost:8080",title:"bad",excerpt:"Documented source"}]);
 assert.equal(x.length,1);assert.ok(x[0].sha256);assert.equal(safeSourceUrl("http://127.0.0.1/a"),null);
});
test("structured source acquisition and citation quality gate",async()=>{
 const e=await collectResearch("Appointment reservation scheduling for restaurants",
  {request:mock,searchEndpoint:"https://search.example.com/search"});
 assert.equal(e.sources.length,3);assert.equal(e.gaps.length,0);
 assert.deepEqual(verifyResearch(e,"Alternative [E-001]. Competitor [E-003].").citations,["E-001","E-003"]);
 assert.throws(()=>verifyResearch(e,"Claim [E-999]."),/fabricated/);
 assert.throws(()=>verifyResearch(e,"Claims without references"),/reference/);
});
test("honest research gap forces UNVERIFIED labeling",async()=>{
 const e=await collectResearch("Reservation tool",{request:mock});
 assert.equal(e.categories.market,0);
 assert.throws(()=>verifyResearch(e,"Found [E-001]"),/UNVERIFIED/);
 assert.ok(verifyResearch(e,"Market UNVERIFIED [E-001]").gaps.length);
});
const plan={schema:1,probes:[{id:"RISK-1",risk:"Live API response contract must be verified",kind:"http_contract",
  url:"https://developers.cloudflare.com/workers/",method:"GET",critical:true,
  assertion:"HTTP status 200 and Cloudflare response text",expectedStatus:200,expectedText:"Cloudflare"}]};
test("metadata-only checks cannot prove critical feasibility",()=>{
 assert.throws(()=>verifySpikePlan({schema:1,probes:[{...plan.probes[0],kind:"https_read"}]}),/Critical risk/);
 assert.throws(()=>verifySpikePlan({schema:1,probes:[{...plan.probes[0],kind:"hf_model"}]}),/Critical risk/);
});
test("spikes reject implicit / unsafe destinations",()=>{
 assert.equal(verifySpikePlan(plan).length,1);
 assert.equal(allowedProbeHost("https://api.github.com/repos/a/b"),true);
 assert.equal(allowedProbeHost("https://localhost/foo"),false);
 assert.throws(()=>verifySpikePlan({schema:1,probes:[{...plan.probes[0],url:"http://127.0.0.1"}]}));
});
test("executed spike must prove response; critical failures block",async()=>{
 const pass=await executeSpikes(plan,{request:async()=>({status:200,text:async()=>"Cloudflare Docs"})});
 assert.equal(pass.decision,"GO");assert.equal(pass.results[0].outcome,"PASS");
 const fail=await executeSpikes(plan,{request:async()=>({status:200,text:async()=>"wrong"})});
 assert.equal(fail.decision,"BLOCK");assert.equal(fail.results[0].outcome,"FAIL");
});
test("node spike uses observable test result, not generated prose",async()=>{
 const p={schema:1,probes:[{id:"LOCAL-1",risk:"Core logic needs proof with runnable test",kind:"node_test",
   file:"spikes/sanity.test.mjs",critical:true,
   assertion:"Node test completes with meaningful passing assertions"}]};
 assert.equal((await executeSpikes(p,{runNodeTest:async()=>({passed:true,output:"3 tests passed"})})).decision,"GO");
 assert.equal((await executeSpikes(p,{runNodeTest:async()=>({passed:false,error:"failed"})})).decision,"BLOCK");
});
test("additional known credential signatures detected before commit",()=>{
 assert.ok(detectSecret("token = ghp_"+"A".repeat(40)).includes("github-token"));
 assert.ok(detectSecret("-----BEGIN PRIVATE KEY-----").includes("private-key"));
 assert.deepEqual(detectSecret("const a = 42;"),[]);
});
