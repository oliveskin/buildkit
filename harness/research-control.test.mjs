import test from 'node:test';
import assert from 'node:assert/strict';
import {makeState} from './core.mjs';
import {researchCacheKey,shouldRefreshResearch,invalidateFrom} from './research-control.mjs';
test('missing sources and changed search settings require collection',()=>{
  const s={...makeState(1),brief:'A product'},env={};
  assert.equal(shouldRefreshResearch(s,env,null),true);
  s.researchCacheFingerprint=researchCacheKey(s,env);
  assert.equal(shouldRefreshResearch(s,env,{sources:[1],gaps:[],failures:[]}),false);
  assert.equal(shouldRefreshResearch(s,{BUILDKIT_SEARCH_ENDPOINT:'https://search.example.com'},{}),true);
  assert.equal(shouldRefreshResearch(s,env,{gaps:['missing market evidence']},{retry:true}),true);
});
test('research invalidation resets dependent approval and preview state but retains history',()=>{
  const s={...makeState(1),status:'awaiting_approval',stage:'release',brief:'idea',preview:{url:'old'},
    approvedDocs:{'docs/DIRECTION.md':'a','docs/PRD.md':'b'},completedBlocks:[{id:'B01'}],
    codeReview:{passed:true},releaseRequest:{sha:'old'}};
  const files=invalidateFrom(s,'direction',{actor:'owner',reason:'new sources'});
  assert.equal(s.stage,'direction');assert.deepEqual(s.approvedDocs,{});
  assert.equal(s.preview,undefined);assert.equal(s.codeReview,undefined);
  assert.equal(s.releaseRequest,undefined);assert.equal(s.completedBlocks.length,0);
  assert.ok(files.includes('spikes/results.json'));assert.equal(s.history.at(-1).event,'outputs_invalidated');
});
test('active deployment inputs cannot be invalidated',()=>{
  assert.throws(()=>invalidateFrom({...makeState(1),status:'deploy_pending',stage:'deploying'},'direction'));
});
