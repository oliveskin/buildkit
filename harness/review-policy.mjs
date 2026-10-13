import {randomBytes} from 'node:crypto';
import {independentModels} from './model-config.mjs';
export function reviewTarget(preview){
  const sourceSha=preview?.sourceSha,payloadDigest=preview?.artifact?.payloadDigest;
  if(!/^[0-9a-f]{40}$/.test(sourceSha||'')||!/^[0-9a-f]{64}$/.test(payloadDigest||''))
    throw Error('A source-bound, browser-reviewed artifact is required before code review.');
  return {sourceSha,payloadDigest};
}
export function sameReviewTarget(a,b){return !!a&&!!b&&a.sourceSha===b.sourceSha&&a.payloadDigest===b.payloadDigest;}
export function makeReviewRequest(target){return {...target,code:randomBytes(4).toString('hex'),createdAt:new Date().toISOString()};}
export function codeReviewPassed(record,target){
  if(record?.passed!==true||!sameReviewTarget(record,target))return false;
  if(record.kind==='human')return typeof record.by==='string'&&record.by.length>0&&Number.isSafeInteger(record.commentId)&&record.commentId>0;
  if(record.kind==='model'){
    if(!/^[0-9a-f]{64}$/.test(record.reportDigest||''))return false;
    if(record.reviewerModel)return independentModels(record.reviewerModel,record.builderModels);
    // Previously recorded native Claude/Codex reviews retain their original meaning.
    return ['claude','codex'].includes(record.provider)&&['claude','codex'].includes(record.builder)&&record.provider!==record.builder;
  }
  return false;
}
export function acceptHumanReview(request,code,target,actor,commentId){
  if(!request||!sameReviewTarget(request,target)||! /^[0-9a-f]{8}$/i.test(code||'')||code.toLowerCase()!==request.code)
    throw Error('Incorrect or stale code/security review code.');
  if(!actor||!Number.isSafeInteger(commentId)||commentId<1)throw Error('A real authorized issue comment is required.');
  return {...target,kind:'human',passed:true,by:actor,commentId,at:new Date().toISOString(),
    assertion:'The actor explicitly acknowledges code/security review; this is not a security certification.'};
}
