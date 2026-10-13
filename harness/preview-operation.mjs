#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {newGate,cleanEnv} from './core.mjs';
import {inspectFile} from './security.mjs';
import {assertClean,trackedFiles} from './security-gate.mjs';
import {loadWorkerConfig,checkPreviewIsolation,verifyBrowserResults} from './cloudflare.mjs';
import {validateExecutionPlan,validateInfrastructurePlan} from './execution-plan.mjs';
import {verifyProvisionedBindings} from './binding-policy.mjs';
const env=process.env,dir=path.resolve(env.BUILDKIT_APP_PATH||'app');
const issue=Number(env.BUILDKIT_ISSUE_NUMBER),sha=env.BUILDKIT_CANDIDATE_SHA,token=env.GITHUB_TOKEN;
if(!Number.isSafeInteger(issue)||issue<1||!/^[0-9a-f]{40}$/.test(sha||''))throw Error('Invalid preview request.');
const repo=env.GITHUB_REPOSITORY;
const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],{cwd:dir,env:cleanEnv(env),encoding:'utf8'}).trim();
const file=p=>path.join(dir,p),read=p=>fs.readFileSync(file(p),'utf8');
const write=(p,v)=>{fs.mkdirSync(path.dirname(file(p)),{recursive:true});fs.writeFileSync(file(p),JSON.stringify(v,null,2)+'\n');};
function preflight(){
  const state=JSON.parse(read('.buildkit/state.json'));
  if(git('rev-parse','HEAD')!==sha||state.issue!==issue||state.status!=='awaiting_preview'||
    state.stage!=='implementation'||state.previewSourceSha!==git('rev-parse','HEAD^'))throw Error('Stale or unauthorized preview request.');
  if(JSON.parse(read('spikes/results.json')).decision!=='GO')throw Error('Critical feasibility evidence absent.');
  const execution=JSON.parse(read('docs/EXECUTION_PLAN.json'));
  const infrastructure=JSON.parse(read('docs/INFRA_PLAN.json'));
  validateExecutionPlan(execution);validateInfrastructurePlan(infrastructure,execution);
  if(execution.preview.adapter!=='cloudflare-workers')throw Error('Wrong preview adapter for selected architecture.');
  const worker=execution.deploy.workerName;
  if(env.BUILDKIT_WORKER_NAME&&env.BUILDKIT_WORKER_NAME!==worker)
    throw Error('Worker override differs from the approved execution plan.');
  const wrangler=loadWorkerConfig(dir);
  checkPreviewIsolation(wrangler,worker);
  const ledger=fs.existsSync(file('docs/infrastructure/PROVISIONED.json'))?
    JSON.parse(read('docs/infrastructure/PROVISIONED.json')):null;
  verifyProvisionedBindings({execution,infrastructure,ledger,wrangler});
  if(env.GITHUB_OUTPUT)fs.appendFileSync(env.GITHUB_OUTPUT,'worker_name='+worker+'\n');
  assertClean(dir,trackedFiles(dir));return state;
}
function versionFiles(){
  const names=new Set([...trackedFiles(dir),...git('ls-files','--others','--exclude-standard','-z').split('\0').filter(Boolean)]);
  return [...names].filter(p=>!p.startsWith('.buildkit/')).sort().map(p=>inspectFile(dir,p));
}
async function comment(body){
  const response=await fetch('https://api.github.com/repos/'+repo+'/issues/'+issue+'/comments',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({body})});
  if(!response.ok)throw Error('Issue comment failed HTTP '+response.status);
}
function save(state,message){
  write('.buildkit/state.json',state);assertClean(dir,['.buildkit/state.json','docs/evidence/PREVIEW.json']);
  git('add','.buildkit/state.json','docs/evidence/PREVIEW.json');
  git('-c','user.name=buildkit[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m',message);
  const auth=Buffer.from('x-access-token:'+token).toString('base64');
  git('-c','http.https://github.com/.extraheader=AUTHORIZATION: basic '+auth,'push','origin','HEAD:refs/heads/buildkit/issue-'+issue);
}
function synchronizeProductBranch() {
  // Dispatch metadata can have been committed after the immutable preview candidate.
  // Accept ONLY controlled metadata changes; never apply stale browser evidence to new code.
  const name='buildkit/issue-'+issue;
  const auth=Buffer.from('x-access-token:'+token).toString('base64');
  git('-c','http.https://github.com/.extraheader=AUTHORIZATION: basic '+auth,
    'fetch','--no-tags','origin','refs/heads/'+name+':refs/remotes/origin/'+name);
  const latest=git('rev-parse','refs/remotes/origin/'+name);
  if(latest!==sha){
    git('merge-base','--is-ancestor',sha,latest);
    const touched=git('diff','--name-only',sha,latest).split('\n').filter(Boolean);
    if(touched.some(p=>!['.buildkit/state.json','docs/evidence/PREVIEW.json'].includes(p)))
      throw Error('Product code changed since the verified preview. Fresh approval required.');
    git('switch','--detach',latest);
  }
  const state=JSON.parse(read('.buildkit/state.json'));
  if(state.issue!==issue||state.stage!=='implementation'||
     (state.previewRequest && state.previewRequest.sha!==sha)||
     !['awaiting_preview','blocked'].includes(state.status))
    throw Error('Preview result is obsolete or another stage has started.');
  return state;
}
async function complete(){
  if(!token||!repo)throw Error('GitHub authorization missing.');
  // The callback runs on the candidate ref, even when preflight failed.
  // A failed preflight must still create a recoverable, visible blocker.
  const original=JSON.parse(read('.buildkit/state.json'));
  if(git('rev-parse','HEAD')!==sha||original.issue!==issue||
     original.stage!=='implementation'||original.status!=='awaiting_preview')
    throw Error('Invalid or obsolete preview candidate.');
  const state=synchronizeProductBranch(),runURL='https://github.com/'+repo+'/actions/runs/'+env.GITHUB_RUN_ID;
  let result,problem;
  try {
    if(env.BUILDKIT_BROWSER_JOB!=='success')throw Error('Preview build/deploy/browser job failed.');
    result=JSON.parse(fs.readFileSync(env.BUILDKIT_PREVIEW_RESULT_PATH,'utf8'));
    verifyBrowserResults(result,env.BUILDKIT_EXPECTED_PREVIEW_URL);
    if(result.sourceSha!==sha)throw Error('Browser report belongs to another commit.');
    if(!/^[1-9][0-9]*$/.test(env.BUILDKIT_ARTIFACT_ID||'')||!/^[0-9a-f]{64}$/.test(env.BUILDKIT_ARTIFACT_DIGEST||''))
      throw Error('Verified deployment artifact identity is missing.');
  } catch(e){problem=String(e.message||e);}
  state.dispatch=null;
  if(problem){
    write('docs/evidence/PREVIEW.json',{schema:1,outcome:'BLOCK',sourceSha:sha,reason:problem,runURL});
    state.status='blocked';state.gate=null;state.lastError='Preview: '+problem;
    save(state,'buildkit: preview blocked #'+issue);
    await comment('**Preview blocked:** '+problem+'. [Evidence]('+runURL+'). Correct the blocker and /resume. Production was not deployed.');
    process.exitCode=1;return;
  }
  const artifact={id:String(env.BUILDKIT_ARTIFACT_ID),runId:String(env.GITHUB_RUN_ID),
    payloadDigest:env.BUILDKIT_ARTIFACT_DIGEST,sourceSha:sha};
  write('docs/evidence/PREVIEW.json',{...result,outcome:'GO',sourceSha:sha,artifact,runURL});
  state.status='awaiting_approval';state.lastError=null;state.dispatch=null;state.previewRequest=null;
  state.preview={url:result.previewUrl,sourceSha:sha,report:'docs/evidence/PREVIEW.json',artifact};
  state.codeReview=null;state.previewReviewedBy=null;
  state.gate=newGate('preview',versionFiles(),state.revision);
  save(state,'buildkit: browser-reviewed artifact #'+issue);
  await comment('### Buildkit: live preview\n\n[Open preview]('+result.previewUrl+') · [Browser evidence]('+runURL+')\n\n'+
    'Build artifact: `'+artifact.payloadDigest+'`. Review the real product, then **/approve '+state.gate.code+'** or **/revise your feedback**. '+
    'This is product/UX approval, not code/security sign-off. Production requires a separate final approval.');
}
if(process.argv[2]==='preflight'){preflight();console.log('Candidate preflight passed.');}
else if(process.argv[2]==='complete')await complete();
else throw Error('Expected preflight or complete.');
