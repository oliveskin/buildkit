import test from 'node:test';
import assert from 'node:assert/strict';
import {validateExecutionPlan,validateInfrastructurePlan,adapterSupport,provisionNeeded,requireAdapter} from './execution-plan.mjs';
const execPlan={
  schema:1,productKind:'full-stack SaaS',rationale:'Cloudflare is preferred for this example based on cost and runtime compatibility.',
  requirements:['FR-01','FR-02','FR-03','FR-04'],
  build:{adapter:'node-npm',language:'TypeScript'},
  preview:{adapter:'cloudflare-workers'},
  deploy:{adapter:'cloudflare-workers',provider:'Cloudflare',workerName:'bk-example-app'},
  risks:[],tradeoffs:[]
};
const infra={
  schema:1,provider:'cloudflare',summary:'Create separate preview and production data resources after explicit human cost and scope approval.',
  resources:[{id:'R-01',kind:'d1',mode:'create',binding:'DB',productionName:'bk-example-prod-db',previewName:'bk-example-prev-db'}],
  domain:{hostname:'app.example.com',zoneId:'a'.repeat(32),apply:'after-release-approval'},
  cost:{estimatedMonthlyUsd:null,pricingSource:'https://developers.cloudflare.com/d1/platform/pricing/',assumptions:['Usage is unknown; variable charges may apply'],canExceedEstimate:true},
  permissions:['D1 Edit','Workers Scripts Edit'],operations:['Create distinct staging/production D1','Attach domain after final release']
};
test('architecture chooses provider and preserves a non-Cloudflare target',()=>{
  assert.equal(adapterSupport(execPlan).automated,true);
  const mobile={...execPlan,productKind:'native mobile app',
    build:{adapter:'external',language:'Swift'},
    preview:{adapter:'native-artifact'},deploy:{adapter:'external-manual',provider:'Apple/TestFlight'}};
  assert.equal(validateExecutionPlan(mobile).capability.automated,false);
  assert.throws(()=>requireAdapter(mobile,'preview'),/will not silently substitute Cloudflare/);
});
test('infrastructure has separate environments and explicit price uncertainty',()=>{
  assert.ok(validateInfrastructurePlan(infra,execPlan));
  assert.equal(provisionNeeded(infra),true);
  assert.throws(()=>validateInfrastructurePlan({...infra,resources:[{...infra.resources[0],previewName:'bk-example-prod-db'}]},execPlan),/separated/);
  assert.throws(()=>validateInfrastructurePlan({...infra,domain:{...infra.domain,apply:'immediately'}},execPlan),/separate production/);
  assert.throws(()=>validateInfrastructurePlan({...infra,cost:{...infra.cost,estimatedMonthlyUsd:NaN}},execPlan));
});
test('unapproved reuse is rejected and unknown resources stop',()=>{
  assert.throws(()=>validateInfrastructurePlan({...infra,resources:[{...infra.resources[0],mode:'reuse'}]},execPlan),/pre-approved/);
  assert.throws(()=>validateInfrastructurePlan({...infra,resources:[{...infra.resources[0],kind:'compute'}]},execPlan));
});
