import test from 'node:test';
import assert from 'node:assert/strict';
import {workflowRequest,sendWorkflow} from './dispatch.mjs';
test('dispatch failure is durably blocked with the same request for retry',async()=>{
  const request=workflowRequest('release','a'.repeat(40),1,'main'),state={};const saved=[];
  await assert.rejects(sendWorkflow({state,request,api:async()=>{throw Error('timeout');},
    persist:()=>saved.push(structuredClone(state)),comment:async()=>{}}),/uncertain/);
  assert.equal(state.status,'blocked');assert.equal(state.releaseRequest.sha,request.sha);
  assert.equal(saved[0].dispatch.status,'sending');assert.equal(saved.at(-1).dispatch.status,'uncertain');
});
test('active or successfully completed dispatches are never duplicated',async()=>{
  for(const status of ['in_progress','completed']){
    const request=workflowRequest('preview','b'.repeat(40),2,'main');let posts=0;
    const api=async method=>{if(method==='POST')posts++;return {workflow_runs:[{id:2,display_title:request.title,status,conclusion:status==='completed'?'success':null,updated_at:new Date().toISOString()}]};};
    await sendWorkflow({state:{},request,api,persist:()=>{},comment:async()=>{},retry:true});
    assert.equal(posts,0);
  }
});
