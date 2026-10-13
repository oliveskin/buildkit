import test from 'node:test';
import assert from 'node:assert/strict';
import {applyApprovedDomain} from './cloudflare-domain.mjs';
const account='a'.repeat(32),zoneId='b'.repeat(32);
const execution={schema:1,productKind:'web-based task management',
  rationale:'A small Cloudflare Workers application with separate data resources.',
  requirements:['FR-01'],build:{adapter:'node-npm',language:'TypeScript'},
  preview:{adapter:'cloudflare-workers'},
  deploy:{adapter:'cloudflare-workers',provider:'Cloudflare',workerName:'bk-tasks'},risks:[],tradeoffs:[]};
const infra={schema:1,provider:'cloudflare',summary:'Attach an owned Cloudflare custom hostname only after approved production release.',
  resources:[],domain:{hostname:'app.example.com',zoneId,apply:'after-release-approval'},
  cost:{estimatedMonthlyUsd:null,pricingSource:'https://developers.cloudflare.com/workers/',
    assumptions:['DNS and usage cost depend on account and requests'],canExceedEstimate:true},
  permissions:['Workers Scripts Edit','DNS read','Zone read'],operations:['Attach approved domain after deployed Worker']};
test('custom hostname requires owned active zone, checks conflicts, no overwrites',async()=>{
 const calls=[];
 const request=async (url,o)=>{
   const p=new URL(url).pathname;calls.push([o.method,p]);
   const result=p==='/zones/'+zoneId?{name:'example.com',status:'active',account:{id:account}}:
     p.endsWith('/dns_records')?[]:p.endsWith('/workers/domains')&&o.method==='GET'?[]:
     p.endsWith('/workers/domains')?{hostname:'app.example.com'}:[];
   return {ok:true,status:200,json:async()=>({success:true,result})};
 };
 const out=await applyApprovedDomain({execution,infra,accountId:account,request,token:'test-value'});
 assert.equal(out.changed,true);assert.equal(calls.at(-1)[0],'PUT');
});
