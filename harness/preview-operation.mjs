#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {newGate} from "./core.mjs";
import {inspectFile} from "./security.mjs";
import {assertClean,trackedFiles} from "./security-gate.mjs";
import {loadWorkerConfig,checkPreviewIsolation,verifyBrowserResults} from "./cloudflare.mjs";
const env=process.env,dir=path.resolve(env.BUILDKIT_APP_PATH||"app");
const issue=Number(env.BUILDKIT_ISSUE_NUMBER),sha=env.BUILDKIT_CANDIDATE_SHA,token=env.GITHUB_TOKEN;
if(!Number.isSafeInteger(issue)||issue<1||!/^[0-9a-f]{40}$/.test(sha||""))
  throw Error("Invalid issue number or candidate SHA.");
const repo=env.GITHUB_REPOSITORY;
const git=(...args)=>execFileSync("git",args,{cwd:dir,encoding:"utf8"}).trim();
const file=p=>path.join(dir,p),read=p=>fs.readFileSync(file(p),"utf8");
const write=(p,value)=>{fs.mkdirSync(path.dirname(file(p)),{recursive:true});
  fs.writeFileSync(file(p),JSON.stringify(value,null,2)+"\n");};
function preflight(){
  if(git("rev-parse","HEAD")!==sha)throw Error("Stale preview: branch/ref changed.");
  const state=JSON.parse(read(".buildkit/state.json"));
  if(state.issue!==issue||state.status!=="awaiting_preview"||state.stage!=="implementation"||
    state.previewSourceSha!==git("rev-parse","HEAD^"))throw Error("Preview request not approved for this SHA.");
  if(JSON.parse(read("spikes/results.json")).decision!=="GO")
    throw Error("Unverified critical feasibility dependency.");
  if(!fs.existsSync(file("docs/security/PROFILE.json")))throw Error("Security profile missing.");
  checkPreviewIsolation(loadWorkerConfig(dir),env.BUILDKIT_WORKER_NAME||"");
  assertClean(dir,trackedFiles(dir));
  return state;
}
function versionFiles(){
  const names=new Set([...trackedFiles(dir),...git("ls-files","--others","--exclude-standard","-z").split("\0").filter(Boolean)]);
  return [...names].filter(p=>!p.startsWith(".buildkit/")).sort().map(p=>inspectFile(dir,p));
}
async function comment(body){
  const r=await fetch("https://api.github.com/repos/"+repo+"/issues/"+issue+"/comments",
    {method:"POST",headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json",
      "Content-Type":"application/json"},body:JSON.stringify({body})});
  if(!r.ok)throw Error("Issue comment HTTP "+r.status);
}
function save(state,msg){
  write(".buildkit/state.json",state);
  git("-c","user.name=buildkit[bot]",
    "-c","user.email=41898282+github-actions[bot]@users.noreply.github.com",
    "add",".buildkit/state.json","docs/evidence/PREVIEW.json");
  git("-c","user.name=buildkit[bot]",
    "-c","user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m",msg);
  const auth=Buffer.from("x-access-token:"+token).toString("base64");
  git("-c","http.https://github.com/.extraheader=AUTHORIZATION: basic "+auth,
    "push","origin","HEAD:refs/heads/buildkit/issue-"+issue);
}
async function complete(){
  if(!token||!repo)throw Error("GitHub authorization missing for the report");
  const state=JSON.parse(read(".buildkit/state.json")),reportPath=env.BUILDKIT_PREVIEW_RESULT_PATH||"";
  if(git("rev-parse","HEAD")!==sha||state.issue!==issue||state.status!=="awaiting_preview"||
    state.stage!=="implementation"||state.previewSourceSha!==git("rev-parse","HEAD^"))
    throw Error("Stale preview result or branch changed.");
  let result=null,problem=null;
  try{
    if(env.BUILDKIT_BROWSER_JOB!=="success")throw Error("Preview build or browser job failed.");
    if(!fs.existsSync(reportPath))throw Error("No browser evidence uploaded.");
    result=JSON.parse(fs.readFileSync(reportPath,"utf8"));
    verifyBrowserResults(result,result.previewUrl);
    if(result.sourceSha!==sha)throw Error("Browser report is from another commit.");
  }catch(e){problem=String(e.message||e);}
  const runURL="https://github.com/"+repo+"/actions/runs/"+env.GITHUB_RUN_ID;
  if(problem){
    write("docs/evidence/PREVIEW.json",{schema:1,outcome:"BLOCK",sourceSha:sha,
      reason:problem,runURL});
    state.status="blocked";state.gate=null;state.lastError="Preview: "+problem;
    state.history.push({event:"preview_failed",reason:problem,time:new Date().toISOString()});
    save(state,"buildkit: preview blocked for #"+issue);
    await comment("**Preview blocked:** "+problem+". [Actions evidence]("+runURL+
      "). Fix the configuration, then comment **/resume**. No deployment occurred.");
    process.exitCode=1;return;
  }
  write("docs/evidence/PREVIEW.json",{...result,outcome:"GO",sourceSha:sha,runURL});
  state.status="awaiting_approval";state.lastError=null;
  state.gate=newGate("preview",versionFiles(),state.revision);
  state.preview={url:result.previewUrl,sourceSha:sha,report:"docs/evidence/PREVIEW.json"};
  save(state,"buildkit: live preview verified for #"+issue);
  await comment("### Buildkit: live preview for review\n\n"+
    "**[Open Cloudflare Preview]("+result.previewUrl+")** · [Screenshots and test logs]("+runURL+")\n\n"+
    "HTTP, rendering and Playwright assertions passed. Review the actual user journey, UI and real integrations.\n\n"+
    "Approve this exact version: **/approve "+state.gate.code+"**; or **/revise your feedback**. "+
    "Production requires a separate approval.");
}
if(process.argv[2]==="preflight") {
  preflight();console.log("Preview preflight: validated commit, evidence and isolated resources.");
}else if(process.argv[2]==="complete")await complete();
else throw Error("Expected preflight or complete");
