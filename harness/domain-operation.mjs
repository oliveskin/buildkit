#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {applyApprovedDomain} from './cloudflare-domain.mjs';
import {validateInfrastructurePlan} from './execution-plan.mjs';
const env=process.env,app=path.resolve(env.BUILDKIT_APP_PATH||'app');
const file=p=>JSON.parse(fs.readFileSync(path.join(app,p),'utf8'));
const main=async()=>{
  const state=file('.buildkit/state.json');
  const execution=file('docs/EXECUTION_PLAN.json'),infra=file('docs/INFRA_PLAN.json');
  validateInfrastructurePlan(infra,execution);
  if(!state.releaseApprovedBy||state.stage!=='deploying'||state.status!=='deploy_pending'||
     state.releaseRequest?.sha!==env.BUILDKIT_APPROVED_SHA)
    throw Error('A custom domain may only be applied after this exact product release approval.');
  if(!infra.domain){
    console.log('No custom domain requested; production Worker URL remains available.');return;
  }
  const applied=await applyApprovedDomain({execution,infra,accountId:env.CLOUDFLARE_ACCOUNT_ID,
    token:env.CLOUDFLARE_API_TOKEN});
  console.log(applied.changed?'Approved hostname configured.':'Approved hostname already configured; no duplicate changes.');
};
await main();
