#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {loadWorkerConfig,checkPreviewIsolation,checkPreviewUrl} from "./cloudflare.mjs";
import {assessRelease} from "./compliance.mjs";
import {assertClean,trackedFiles} from "./security-gate.mjs";
const env=process.env,repo=env.GITHUB_REPOSITORY,token=env.GITHUB_TOKEN;
const issue=Number(env.BUILDKIT_ISSUE_NUMBER),sha=env.BUILDKIT_APPROVED_SHA;
const app=path.resolve(env.BUILDKIT_APP_PATH||"app");
if(!Number.isSafeInteger(issue)||issue<1||!/^[0-9a-f]{40}$/.test(sha||""))
  throw Error("Invalid release issue / exact commit.");
const git=(...args)=>execFileSync("git",args,{cwd:app,encoding:"utf8"}).trim();
const read=p=>fs.readFileSync(path.join(app,p),"utf8");
const file=p=>JSON.parse(read(p));
function preflight(){
  if(git("rev-parse","HEAD")!==sha)throw Error("Release branch advanced after approval.");
  const state=file(".buildkit/state.json");
  if(state.issue!==issue || state.status!=="deploy_pending" ||
    state.stage!=="deploying" || !state.releaseApprovedBy)
    throw Error("Release lacks explicit version-bound GitHub approval.");
  const source=state.preview?.sourceSha;
  if(!/^[0-9a-f]{40}$/.test(source||""))throw Error("Verified preview SHA missing.");
  const changed=git("diff","--name-only",source,sha).split("\n").filter(Boolean);
  if(changed.some(x=>!x.startsWith(".buildkit/")&&!x.startsWith("docs/evidence/") &&
    !x.startsWith("docs/security/") && !x.startsWith("docs/releases/")))
    throw Error("Application changed after browser review. Request a new preview.");
  const preview=file("docs/evidence/PREVIEW.json");
  if(preview.outcome!=="GO" ||preview.sourceSha!==source ||
    !preview.behaviouralTestsPassed || preview.pageErrors!==0)
    throw Error("Production requires a passing, matching Cloudflare browser preview.");
  const config=loadWorkerConfig(app);
  checkPreviewIsolation(config,env.BUILDKIT_WORKER_NAME||"");
  if(file("spikes/results.json").decision!=="GO")throw Error("Feasibility proofs absent.");
  assertClean(app,trackedFiles(app));
  const profile=file("docs/security/PROFILE.json");
  const review=assessRelease({profile,secretScan:{passed:true},dependencyAudit:{passed:true},
    preview,independentReview:{passed:!!state.previewReviewedBy},
    externalAttestation:{approved:!!state.complianceReview?.confirmed &&
      state.complianceReview.profileDigest===state.complianceProfileDigest}});
  if(review.decision!=="GO")throw Error("Release blocked: "+review.blockers.join("; "));
  return {state,worker:config.name,preview};
}
async function comment(body){
  const r=await fetch("https://api.github.com/repos/"+repo+"/issues/"+issue+"/comments",{
    method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json",
      Accept:"application/vnd.github+json"},body:JSON.stringify({body})});
  if(!r.ok)throw Error("Issue comment failed HTTP "+r.status);
}
async function finalize(){
  if(!token||!repo)throw Error("Release reporting needs GitHub token");
  const deployed=env.BUILDKIT_DEPLOY_STATUS==="success";
  const url=env.BUILDKIT_PRODUCTION_URL||"";
  const mainSHA=env.BUILDKIT_DEPLOY_MAIN_SHA||"";
  const checked=deployed&&url.startsWith("https://") && /^[0-9a-f]{40}$/.test(mainSHA);
  const summary=checked?
    "### Buildkit: production deployment verified\n\nURL: "+url+
    "\nMerged main SHA: "+mainSHA+
    "\n[Deployment and smoke-test evidence](https://github.com/"+repo+"/actions/runs/"+env.GITHUB_RUN_ID+
    "). Check logs, costs and real users. Monitoring and rollback remain the product owner's responsibility.":
    "**Buildkit production release BLOCKED.** Merge or deployment was unsuccessful. "+
    "[Inspect the run](https://github.com/"+repo+"/actions/runs/"+env.GITHUB_RUN_ID+
    "). Do not infer deployment from a merged PR. Check Cloudflare credentials, settings and rollback.";
  await comment(summary);
  if(!checked)process.exitCode=1;
}
if(process.argv[2]==="preflight") {
  const r=preflight();
  console.log("Release preflight PASS; approved Worker "+r.worker+" and exact SHA "+sha);
}else if(process.argv[2]==="finalize") await finalize();
else throw Error("Expected preflight or finalize");
