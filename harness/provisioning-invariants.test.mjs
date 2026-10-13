import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from './core.mjs';
import {invalidateFrom} from './research-control.mjs';
import {assertScopedResources,resourceNamespace} from './cloudflare-provision.mjs';

// These tests call only pure policy functions. No provider, network, or cloud writes.
const receipt='docs/infrastructure/PROVISIONED.json';
function reviewedProduct(){
  return {...makeState(9),stage:'implementation',status:'awaiting_approval',
    approvedDocs:{
      'docs/DIRECTION.md':'direction-proof',
      'docs/PRD.md':'requirements-proof',
      'docs/HLD.md':'architecture-proof',
      'docs/EXECUTION_PLAN.json':'execution-proof',
      'docs/INFRA_PLAN.json':'resource-plan-proof'
    },
    infrastructureApprovedBy:'owner',
    provisionRequest:{kind:'provision',issue:9,reference:'previous-approved-request'},
    completedBlocks:[{id:'B01'}],
    planDigest:'old-build-plan',preview:{url:'https://preview.example.invalid'},
    modelReview:{provider:'reviewer'},codeReview:{kind:'human'},
    releaseRequest:{kind:'release'},releaseApprovedBy:'owner',
    history:[{event:'infrastructure_provisioned'}]};
}

test('implementation revision retains approved infrastructure and receipt but revokes code and release evidence',()=>{
  const state=reviewedProduct();
  const approvals=structuredClone(state.approvedDocs);
  const provision=structuredClone(state.provisionRequest);
  const removed=invalidateFrom(state,'implementation',{actor:'owner',reason:'Change dashboard layout'});
  assert.equal(removed.includes(receipt),false,'Do not remove already-provisioned resource IDs');
  assert.deepEqual(state.approvedDocs,approvals,'Architecture and resource consent remain current');
  assert.equal(state.infrastructureApprovedBy,'owner');
  assert.deepEqual(state.provisionRequest,provision);
  for(const key of ['preview','modelReview','codeReview','releaseRequest','releaseApprovedBy','planDigest'])
    assert.equal(Object.hasOwn(state,key),false,key+' must be reviewed again after implementation changes');
  assert.ok(removed.includes('docs/evidence/PREVIEW.json'));
  assert.deepEqual(state.completedBlocks,[]);
  assert.equal(state.status,'new');
  assert.equal(state.stage,'implementation');
  assert.equal(state.history[0].event,'infrastructure_provisioned');
});

for(const boundary of ['direction','architecture']){
  test(boundary+' revision invalidates resource references and consent for a new architecture review',()=>{
    const state=reviewedProduct();
    const removed=invalidateFrom(state,boundary,{actor:'owner',reason:'Change product data requirements'});
    assert.ok(removed.includes(receipt),'A new architecture must not rely on an old provisioning receipt');
    assert.equal(Object.hasOwn(state,'infrastructureApprovedBy'),false);
    assert.equal(Object.hasOwn(state,'provisionRequest'),false);
    assert.equal(Object.hasOwn(state.approvedDocs,'docs/INFRA_PLAN.json'),false);
    assert.equal(Object.hasOwn(state.approvedDocs,'docs/EXECUTION_PLAN.json'),false);
    assert.equal(Object.hasOwn(state.approvedDocs,'docs/DIRECTION.md'),boundary==='architecture');
    assert.equal(state.history[0].event,'infrastructure_provisioned','Keep an audit record; do not destroy cloud resources');
  });
}

test('active provisioning, preview and deployment cannot be invalidated by a UI revision',()=>{
  for(const [stage,status] of [['provisioning','awaiting_provision'],['implementation','awaiting_preview'],['deploying','deploy_pending']]){
    const state={...reviewedProduct(),stage,status};
    const before=structuredClone(state);
    assert.throws(()=>invalidateFrom(state,'implementation',{actor:'owner',reason:'Change layout'}),/Wait/);
    assert.deepEqual(state,before,'Reject before mutating active-operation state');
  }
});

test('new resource names must match both the selected product repository and issue',()=>{
  const repo='example-owner/example-product',issue=9;
  const prefix=resourceNamespace(repo,issue);
  const plan={resources:[{mode:'create',productionName:prefix+'prod-db',previewName:prefix+'preview-db'}]};
  assert.equal(assertScopedResources(plan,repo,issue),prefix);
  assert.throws(()=>assertScopedResources(plan,'example-owner/other-product',issue),/scoped/);
  assert.throws(()=>assertScopedResources(plan,repo,issue+1),/scoped/);
  const wrongPreview={resources:[{...plan.resources[0],previewName:'unrelated-preview-db'}]};
  assert.throws(()=>assertScopedResources(wrongPreview,repo,issue),/scoped/);
});

test('creation scoping does not rename explicitly approved existing-resource reuse',()=>{
  const plan={resources:[{mode:'reuse',productionName:'existing-production',previewName:'existing-staging'}]};
  assert.doesNotThrow(()=>assertScopedResources(plan,'example-owner/example-product',9));
});
