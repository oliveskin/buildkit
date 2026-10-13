import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewTarget,makeReviewRequest,codeReviewPassed,acceptHumanReview} from './review-policy.mjs';
import {assessRelease} from './compliance.mjs';
const preview={sourceSha:'a'.repeat(40),artifact:{payloadDigest:'b'.repeat(64)},outcome:'GO',behaviouralTestsPassed:true};
test('preview approval and a bare passed flag are not code/security review',()=>{
  const target=reviewTarget(preview);
  assert.equal(codeReviewPassed({passed:true,previewReviewedBy:'owner'},target),false);
  assert.equal(assessRelease({profile:{schema:1},secretScan:{passed:true},dependencyAudit:{passed:true},preview,
    independentReview:{passed:true}}).decision,'BLOCK');
});
test('explicit human sign-off is bound to source, artifact and actual comment',()=>{
  const target=reviewTarget(preview),request=makeReviewRequest(target);
  const review=acceptHumanReview(request,request.code,target,'owner',123);
  assert.equal(codeReviewPassed(review,target),true);
  assert.equal(codeReviewPassed(review,{...target,payloadDigest:'c'.repeat(64)}),false);
  assert.throws(()=>acceptHumanReview(request,'deadbeef',target,'owner',123));
});
test('model review requires another provider and retained report digest',()=>{
  const target=reviewTarget(preview),review={...target,kind:'model',provider:'claude',builder:'codex',passed:true,reportDigest:'d'.repeat(64)};
  assert.equal(codeReviewPassed(review,target),true);
  assert.equal(codeReviewPassed({...review,provider:'codex'},target),false);
});
