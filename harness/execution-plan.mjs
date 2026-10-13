import {createHash} from 'node:crypto';

// The architecture chooses the runtime. Buildkit never silently rewrites it to Cloudflare.
const builds=new Set(['node-npm','python-pytest','rust-cargo','external']);
const previewAdapters=new Set(['cloudflare-workers','external-url','native-artifact','unsupported']);
const deployAdapters=new Set(['cloudflare-workers','external-manual','unsupported']);
const resourceKinds=new Set(['d1','kv','r2']);
const namePattern=/^[a-z][a-z0-9-]{2,54}$/;
const bindingPattern=/^[A-Z][A-Z0-9_]{1,49}$/;
const hostPattern=/^(?=.{4,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const has=(x,k)=>Object.hasOwn(x||{},k);
const words=(x,n)=>typeof x==='string'&&x.trim().length>=n;
export const executionDigest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

export function validateExecutionPlan(plan){
  if(plan?.schema!==1||!words(plan.productKind,3)||!words(plan.rationale,25))
    throw Error('Architecture must select a product kind and explain its runtime choice.');
  if(!builds.has(plan.build?.adapter)||!previewAdapters.has(plan.preview?.adapter)||
     !deployAdapters.has(plan.deploy?.adapter))
    throw Error('Select explicit supported build, preview and deployment adapter types.');
  if(!words(plan.build?.language,2)||!words(plan.deploy?.provider,2))
    throw Error('State the build language and deployment provider.');
  if(plan.preview.adapter==='cloudflare-workers' && plan.deploy.adapter!=='cloudflare-workers')
    throw Error('Cloudflare Preview requires a Cloudflare Worker deployment target.');
  if(plan.deploy.adapter==='cloudflare-workers'){
    if(!namePattern.test(plan.deploy.workerName||''))
      throw Error('Cloudflare Worker name must be chosen in the architecture, not invented later.');
    if(plan.build.adapter!=='node-npm')
      throw Error('Current Cloudflare artifact adapter requires a Node/npm build; choose another adapter if needed.');
  }else if(plan.deploy.workerName)
    throw Error('Do not put Cloudflare Worker settings into non-Cloudflare architectures.');
  if(!Array.isArray(plan.requirements)||!plan.requirements.length ||
     plan.requirements.some(r=>!/^FR-[0-9]{2,}$/.test(r))||
     new Set(plan.requirements).size!==plan.requirements.length)
    throw Error('List every approved MMFS requirement as FR-XX; no requirement may disappear.');
  if(!Array.isArray(plan.risks)||!Array.isArray(plan.tradeoffs))
    throw Error('Include deployment risks and rejected/accepted architecture tradeoffs.');
  const capability=adapterSupport(plan);
  // Unsupported adapters remain explicit. They do not force unrelated Cloudflare designs.
  return {plan,capability};
}

export function adapterSupport(plan){
  const missing=[];
  if(!['node-npm'].includes(plan.build?.adapter))missing.push('build:'+plan.build?.adapter);
  if(plan.preview?.adapter!=='cloudflare-workers')missing.push('preview:'+plan.preview?.adapter);
  if(plan.deploy?.adapter!=='cloudflare-workers')missing.push('deploy:'+plan.deploy?.adapter);
  return {automated:missing.length===0,missing};
}

export function validateInfrastructurePlan(infra,execution){
  validateExecutionPlan(execution);
  if(infra?.schema!==1||!['cloudflare','external','none'].includes(infra.provider)||
     !Array.isArray(infra.resources)||!words(infra.cost?.pricingSource,10)||
     !Array.isArray(infra.cost?.assumptions)||!infra.cost.assumptions.length||
     !Array.isArray(infra.permissions)||!Array.isArray(infra.operations)||
     !words(infra.summary,20))
    throw Error('Provisioning requires a reviewable resource, permission, cost and operations plan.');
  const amount=infra.cost.estimatedMonthlyUsd;
  if(amount!==null && (typeof amount!=='number'||!Number.isFinite(amount)||amount<0))
    throw Error('Monthly estimate must be a finite nonnegative USD amount or null (unknown).');
  if(![true,false].includes(infra.cost.canExceedEstimate))
    throw Error('Explicitly warn whether variable charges can exceed the estimate.');
  if(infra.provider==='none'&& (infra.resources.length||infra.domain))
    throw Error('No-resource plan cannot contain provisioning operations.');
  if(infra.provider==='cloudflare'&&execution.deploy.adapter!=='cloudflare-workers')
    throw Error('Cloudflare provisioning must be linked to an approved Cloudflare deployment component.');
  if(infra.provider!=='cloudflare'&&infra.resources.length)
    throw Error('External infrastructure needs its own adapter, not a Cloudflare API call.');
  const ids=new Set(),names=new Set(),bindings=new Set();
  for(const r of infra.resources){
    if(!resourceKinds.has(r.kind)||!/^R-[0-9]{2,}$/.test(r.id||'')||ids.has(r.id)||
       !bindingPattern.test(r.binding||'')||bindings.has(r.binding)||
       !namePattern.test(r.productionName||'')||!namePattern.test(r.previewName||'')||
       r.productionName===r.previewName || names.has(r.productionName) || names.has(r.previewName))
      throw Error('Resource names/bindings must be unique, valid and separated for preview and production.');
    if(r.mode!=='create'&&r.mode!=='reuse')throw Error('Resource operation must explicitly say create or reuse.');
    if(r.mode==='reuse' && (!words(r.productionId,8)||!words(r.previewId,8)))
      throw Error('Reusing resources requires both exact pre-approved existing resource IDs.');
    if(r.mode==='create' && (r.productionId||r.previewId))
      throw Error('Creation must not include invented Cloudflare resource identifiers.');
    ids.add(r.id);bindings.add(r.binding);names.add(r.productionName);names.add(r.previewName);
  }
  if(infra.domain){
    if(infra.provider!=='cloudflare'||!hostPattern.test(infra.domain.hostname||'')||
       !/^[a-f0-9]{32}$/.test(infra.domain.zoneId||'')||
       infra.domain.apply!=='after-release-approval')
      throw Error('Custom domain requires an owned zone and separate production release approval.');
  }
  return infra;
}
export function provisionNeeded(plan){
  return plan?.provider==='cloudflare' && (plan.resources.length>0||Boolean(plan.domain));
}
export function requireAdapter(plan,kind){
  const {missing}=adapterSupport(plan);
  const target=missing.filter(x=>x.startsWith(kind+':'));
  if(target.length)throw Error('The approved '+kind+' adapter is unavailable: '+target.join(', ')+
    '. Buildkit will not silently substitute Cloudflare. Add a compatible adapter or revise the architecture.');
  return true;
}
