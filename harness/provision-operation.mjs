#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateExecutionPlan,validateInfrastructurePlan,executionDigest} from './execution-plan.mjs';
import {assertScopedResources,cfAPI,provisionCloudflare} from './cloudflare-provision.mjs';
import {inspectFile} from './security.mjs';
import {digest} from './core.mjs';
const env=process.env,root=path.resolve(env.BUILDKIT_APP_PATH||'app');
const issue=Number(env.BUILDKIT_ISSUE_NUMBER),sha=env.BUILDKIT_PLAN_SHA;
const repo=env.GITHUB_REPOSITORY;
if(!Number.isSafeInteger(issue)||issue<1||!/^[a-f0-9]{40}$/.test(sha||''))
  throw Error('Provisioning requires the exact approved Git commit and issue.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const config=()=>({execution:JSON.parse(read('docs/EXECUTION_PLAN.json')),
  infrastructure:JSON.parse(read('docs/INFRA_PLAN.json'))});
const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],{
  cwd:root,encoding:'utf8',env:{PATH:env.PATH,HOME:env.HOME,GIT_TERMINAL_PROMPT:'0'}}).trim();
function preflight(){
  if(git('rev-parse','HEAD')!==sha)throw Error('Provision request is not for this checkout.');
  const state=JSON.parse(read('.buildkit/state.json'));
  if(state.issue!==issue||state.stage!=='provisioning'||state.status!=='awaiting_provision'||
     !state.history.some(x=>x.event==='approved'&&x.stage==='infrastructure'))
    throw Error('Provisioning lacks human approval of its exact plan.');
  if(state.approvedDocs?.['docs/INFRA_PLAN.json']!==
     digest(inspectFile(root,'docs/INFRA_PLAN.json')))
    throw Error('Provisioning plan was modified since approval.');
  const {execution,infrastructure}=config();
  validateExecutionPlan(execution);validateInfrastructurePlan(infrastructure,execution);
  if(infrastructure.provider!=='cloudflare')throw Error('No Cloudflare resources authorized by the approved plan.');
  assertScopedResources(infrastructure,repo,issue);
  return {execution,infrastructure};
}
async function apply(){
  const {execution,infrastructure}=preflight();
  const client=cfAPI({accountId:env.CLOUDFLARE_ACCOUNT_ID,token:env.CLOUDFLARE_API_TOKEN});
  const ledger=await provisionCloudflare({execution,infra:infrastructure,repo,issue,
    accountId:env.CLOUDFLARE_ACCOUNT_ID,api:client});
  ledger.sourceSha=sha;
  const out=path.resolve(env.BUILDKIT_PROVISION_RESULT||'provision-result.json');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(ledger,null,2)+'\n');
  console.log('Approved Cloudflare resources provisioned/reconciled with no credentials in the output.');
}
function sync(){
  if(!env.GITHUB_TOKEN)throw Error('GitHub finalizer token missing.');
  const name='buildkit/issue-'+issue,auth=Buffer.from('x-access-token:'+env.GITHUB_TOKEN).toString('base64');
  git('-c','http.https://github.com/.extraheader=AUTHORIZATION: basic '+auth,'fetch',
    '--no-tags','origin','refs/heads/'+name+':refs/remotes/origin/'+name);
  const tip=git('rev-parse','refs/remotes/origin/'+name);
  if(tip!==sha){
    git('merge-base','--is-ancestor',sha,tip);
    const changed=git('diff','--name-only',sha,tip).split('\n').filter(Boolean);
    if(changed.some(p=>p!=='.buildkit/state.json'))
      throw Error('Product inputs changed after infrastructure approval; refuse stale callback.');
    git('switch','--detach',tip);
  }
  const state=JSON.parse(read('.buildkit/state.json'));
  if(state.issue!==issue||state.stage!=='provisioning'||!['awaiting_provision','blocked'].includes(state.status)||
     state.provisionRequest?.sha!==sha)
    throw Error('Provisioning callback is no longer current.');
  return state;
}
function save(state,ledger){
  fs.mkdirSync(path.join(root,'docs/infrastructure'),{recursive:true});
  if(ledger)fs.writeFileSync(path.join(root,'docs/infrastructure/PROVISIONED.json'),JSON.stringify(ledger,null,2)+'\n');
  fs.mkdirSync(path.join(root,'.buildkit'),{recursive:true});
  fs.writeFileSync(path.join(root,'.buildkit/state.json'),JSON.stringify(state,null,2)+'\n');
  const targets=['.buildkit/state.json',...(ledger?['docs/infrastructure/PROVISIONED.json']:[])];
  git('add',...targets);
  git('-c','user.name=buildkit[bot]','-c',
    'user.email=41898282+github-actions[bot]@users.noreply.github.com',
    'commit','-m','buildkit: '+(ledger?'provisioned approved resources':'provisioning blocked'));
  const auth=Buffer.from('x-access-token:'+env.GITHUB_TOKEN).toString('base64');
  git('-c','http.https://github.com/.extraheader=AUTHORIZATION: basic '+auth,
    'push','origin','HEAD:refs/heads/buildkit/issue-'+issue);
}
async function api(method,url,body){
  const response=await fetch('https://api.github.com/repos/'+repo+url,{
    method,headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,'Content-Type':'application/json',
      Accept:'application/vnd.github+json'},
    ...(body?{body:JSON.stringify(body)}:{})});
  if(!response.ok)throw Error('GitHub '+method+' '+url+' failed HTTP '+response.status);
}
async function complete(){
  const state=sync(),{infrastructure}=config();
  const reportPath=env.BUILDKIT_PROVISION_RESULT||'';
  let ledger=null,problem=null;
  try{
    if(env.BUILDKIT_PROVISION_JOB!=='success')throw Error('Approved Cloudflare resource operation failed.');
    ledger=JSON.parse(fs.readFileSync(reportPath,'utf8'));
    if(ledger.schema!==1||ledger.sourceSha!==sha||
       ledger.sourcePlanDigest!==executionDigest(infrastructure)||
       ledger.resources.length!==infrastructure.resources.length)
      throw Error('Provisioning response does not match the approved resource plan.');
    if(ledger.accountFingerprint!==
       createHash('sha256').update(env.CLOUDFLARE_ACCOUNT_ID||'').digest('hex'))
      throw Error('Provisioning returned a different Cloudflare account.');
  }catch(e){problem=String(e?.message||e);}
  state.dispatch=null;state.provisionRequest=null;state.gate=null;
  if(problem){
    state.status='blocked';state.lastError=problem;
    state.history.push({event:'provision_blocked',reason:problem,at:new Date().toISOString()});
    save(state,null);
    await api('POST','/issues/'+issue+'/comments',{body:'**Infrastructure provisioning blocked:** '+
      problem+'. Inspect the provisioning Actions run; verify Cloudflare permissions and approved resource names. '+
      'After correction use /resume. No production deployment occurred.'});
    process.exitCode=1;return;
  }
  state.stage='implementation';state.status='blocked';state.lastError=null;state.pendingContinuation=true;
  state.history.push({event:'infrastructure_provisioned',at:new Date().toISOString(),
    planDigest:ledger.sourcePlanDigest});
  save(state,ledger);
  await api('POST','/issues/'+issue+'/comments',{body:'Approved Cloudflare resources are provisioned with separate preview/production identifiers. '+
    '[Inspect results](https://github.com/'+repo+'/blob/buildkit/issue-'+issue+'/docs/infrastructure/PROVISIONED.json). '+
    'Continuing the implementation automatically. If no execution starts, use /resume.'});
  try{
    await api('POST','/actions/workflows/buildkit.yml/dispatches',
      {ref:state.baseBranch||'main',inputs:{issue_number:String(issue),command:'resume'}});
  }catch{
    await api('POST','/issues/'+issue+'/comments',{body:'Automatic continuation could not be dispatched. The resources are saved; use /resume on this Issue.'});
  }
}
if(process.argv[2]==='preflight'){preflight();console.log('Approved resource plan preflight PASS.');}
else if(process.argv[2]==='apply')await apply();
else if(process.argv[2]==='complete')await complete();
else throw Error('Expected preflight, apply or complete.');
