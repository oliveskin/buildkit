import test from 'node:test';
import assert from 'node:assert/strict';
import {resourceNamespace,assertScopedResources,provisionCloudflare,resolvedBindings} from './cloudflare-provision.mjs';
const repository='my-org/my-app',namespace=resourceNamespace(repository,12);
const execution={schema:1,productKind:'example SaaS application',
  rationale:'Cloudflare hosts the small web backend while preserving explicit resource isolation.',
  requirements:['FR-01'],
  build:{adapter:'node-npm',language:'TypeScript'},
  preview:{adapter:'cloudflare-workers'},
  deploy:{adapter:'cloudflare-workers',provider:'Cloudflare',workerName:'bk-workflow'},
  risks:[],tradeoffs:[]};
const infra={schema:1,provider:'cloudflare',summary:'Create named preview and production databases after explicit approval.',
  resources:[{id:'R-01',kind:'d1',mode:'create',binding:'DB',
    productionName:namespace+'prod-db',previewName:namespace+'preview-db'}],
  cost:{estimatedMonthlyUsd:null,pricingSource:'https://developers.cloudflare.com/d1/platform/pricing/',
    assumptions:['Actual queries and storage unknown; usage costs may apply'],canExceedEstimate:true},
  permissions:['D1 Edit'],operations:['Create one D1 database per environment']};
test('pre-approved scope restricts resource names to this product and issue',()=>{
  assert.ok(assertScopedResources(infra,repository,12));
  assert.throws(()=>assertScopedResources(infra,'another-org/my-app',12),/scoped/);
});
test('provisioner creates distinct environments and safely reconciles an ambiguous success',async()=>{
  const records=new Map(),calls=[];
  const api=async(method,path,body)=>{
    calls.push([method,path,body]);
    if(method==='GET')return [...records.entries()].map(([name,uuid])=>({name,uuid}));
    const name=body.name,uuid='id-'+records.size+1;records.set(name,uuid);return {name,uuid};
  };
  const params={execution,infra,repo:repository,issue:12,accountId:'a'.repeat(32),api};
  const first=await provisionCloudflare(params);
  assert.equal(first.resources[0].preview.name,namespace+'preview-db');
  assert.notEqual(first.resources[0].preview.id,first.resources[0].production.id);
  assert.equal(calls.filter(x=>x[0]==='POST').length,2);
  const second=await provisionCloudflare(params);
  assert.equal(calls.filter(x=>x[0]==='POST').length,2,'no duplicate resource creation on retry');
  assert.equal(second.resources[0].reconciliation.production,true);
  assert.notEqual(resolvedBindings(first).production.d1_databases[0].database_id,
    resolvedBindings(first).previews.d1_databases[0].database_id);
});
