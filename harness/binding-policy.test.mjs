import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyProvisionedBindings} from './binding-policy.mjs';
import {executionDigest} from './execution-plan.mjs';
const execution={deploy:{adapter:'cloudflare-workers',workerName:'bk-app'}};
const infra={resources:[{id:'R-01',kind:'kv',binding:'CACHE'}]};
const ledger={provider:'cloudflare',sourcePlanDigest:executionDigest(infra),resources:[
 {id:'R-01',kind:'kv',binding:'CACHE',preview:{id:'preview',name:'bk-p'},production:{id:'prod',name:'bk-r'}}]};
test('approved preview and production KV bindings must exactly match resolved receipt',()=>{
 const cfg={name:'bk-app',kv_namespaces:[{binding:'CACHE',id:'prod'}],
   previews:{kv_namespaces:[{binding:'CACHE',id:'preview'}]}};
 assert.equal(verifyProvisionedBindings({execution,infrastructure:infra,ledger,wrangler:cfg}),true);
 assert.throws(()=>verifyProvisionedBindings({execution,infrastructure:infra,ledger,
   wrangler:{...cfg,previews:{kv_namespaces:[{binding:'CACHE',id:'prod'}]}}}),/differ/);
});
