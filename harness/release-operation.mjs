#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {loadWorkerConfig,checkPreviewIsolation,checkPreviewUrl} from "./cloudflare.mjs";
import {assessRelease} from "./compliance.mjs";
import {digest,STAGE_FILES} from "./core.mjs";
import {inspectFile} from "./security.mjs";
import {assertClean,trackedFiles} from "./security-gate.mjs";
import {validateExecutionPlan,validateInfrastructurePlan} from "./execution-plan.mjs";
import {verifyProvisionedBindings} from "./binding-policy.mjs";
import {createHash} from "node:crypto";
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
  if(!state.releaseApprovedDigest ||
     digest(STAGE_FILES.release.map(p=>inspectFile(app,p)))!==state.releaseApprovedDigest)
    throw Error("Release documents no longer match the approved gate.");
  if(!state.previewReviewedBy)throw Error("Human approval of the browser experience is missing.");
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
  const artifact=preview.artifact;
  if(!artifact || !/^[1-9][0-9]*$/.test(artifact.id||"") ||
     !/^[1-9][0-9]*$/.test(artifact.runId||"") ||
     !/^[0-9a-f]{64}$/.test(artifact.payloadDigest||"") ||
     artifact.sourceSha!==source ||
     state.preview?.artifact?.payloadDigest!==artifact.payloadDigest)
    throw Error("Version-bound browser-reviewed deployment artifact is missing or changed.");
  const execution=file("docs/EXECUTION_PLAN.json"),infra=file("docs/INFRA_PLAN.json");
  validateExecutionPlan(execution);validateInfrastructurePlan(infra,execution);
  if(execution.deploy.adapter!=="cloudflare-workers")
    throw Error("Approved release adapter is not Cloudflare. Do not substitute another provider.");
  const worker=execution.deploy.workerName;
  if(env.BUILDKIT_WORKER_NAME&&env.BUILDKIT_WORKER_NAME!==worker)
    throw Error("Worker setting differs from approved architecture.");
  const config=loadWorkerConfig(app);
  checkPreviewIsolation(config,worker);
  const ledger=fs.existsSync(path.join(app,"docs/infrastructure/PROVISIONED.json"))?
    file("docs/infrastructure/PROVISIONED.json"):null;
  verifyProvisionedBindings({execution,infrastructure:infra,ledger,wrangler:config});
  if(infra.resources.length&&ledger.accountFingerprint!==
     createHash("sha256").update(env.CLOUDFLARE_ACCOUNT_ID||"").digest("hex"))
    throw Error("Provisioned resources belong to a different Cloudflare account.");
  if(file("spikes/results.json").decision!=="GO")throw Error("Feasibility proofs absent.");
  assertClean(app,trackedFiles(app));
  const profile=file("docs/security/PROFILE.json");
  const review=assessRelease({profile,secretScan:{passed:true},dependencyAudit:{passed:true},
    preview,codeReview:state.codeReview,
    externalAttestation:{approved:!!state.complianceReview?.confirmed &&
      state.complianceReview.profileDigest===state.complianceProfileDigest}});
  if(review.decision!=="GO")throw Error("Release blocked: "+review.blockers.join("; "));
  if(env.GITHUB_OUTPUT){
    const outputs={artifact_id:artifact.id,artifact_run:artifact.runId,
      payload_digest:artifact.payloadDigest,source_sha:source,
      base_branch:state.baseBranch,base_sha:state.baseSha,worker_name:worker};
    for(const [k,value] of Object.entries(outputs)){
      if(!/^[a-z0-9_-]+$/.test(k) || /[\r\n]/.test(String(value||"")))
        throw Error("Invalid release workflow output");
      fs.appendFileSync(env.GITHUB_OUTPUT,k+"="+value+"\n");
    }
  }
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
  const state=file(".buildkit/state.json");
  if(state.issue!==issue || state.stage!=="deploying" || !state.releaseApprovedBy)throw Error("Release attestation missing.");
  state.status=checked?"release-ready":"blocked";
  state.lastError=checked?null:"Production merge/deployment did not finish; inspect Actions run.";
  state.releaseResult={outcome:checked?"GO":"BLOCK",mainSha:checked?mainSHA:null,
    url:checked?url:null,sourceSha:sha,runId:env.GITHUB_RUN_ID,
    at:new Date().toISOString()};
  state.history.push({event:checked?"production_verified":"production_blocked",
    time:new Date().toISOString(),mainSha:checked?mainSHA:null});
  fs.writeFileSync(path.join(app,".buildkit/state.json"),JSON.stringify(state,null,2)+"\n");
  git("-c","user.name=buildkit[bot]",
      "-c","user.email=41898282+github-actions[bot]@users.noreply.github.com",
      "add",".buildkit/state.json");
  git("-c","user.name=buildkit[bot]",
      "-c","user.email=41898282+github-actions[bot]@users.noreply.github.com",
      "commit","-m","buildkit: "+(checked?"production verified":"production blocked")+" for #"+issue);
  const auth=Buffer.from("x-access-token:"+token).toString("base64");
  git("-c","http.https://github.com/.extraheader=AUTHORIZATION: basic "+auth,
      "push","origin","HEAD:refs/heads/buildkit/issue-"+issue);
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
