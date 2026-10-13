import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {safeRelative,fileInventory,validatePayload} from './artifact.mjs';
test('artifact paths reject traversal and host paths',()=>{
  for(const p of ['../secret','/tmp/secret','worker/../secret','a\\b','a\nb','./index.js'])assert.throws(()=>safeRelative(p));
  assert.equal(safeRelative('worker/index.mjs'),'worker/index.mjs');
});
test('payload must be prebuilt and preserve approved operational settings',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'artifact-contract-'));
  const config={name:'bk-example',main:'src/index.js',compatibility_date:'2026-09-01',previews:{vars:{ENVIRONMENT:'preview'}}};
  try{
    fs.writeFileSync(path.join(root,'index.mjs'),'export default {fetch(){return new Response("ok")}};');
    fs.writeFileSync(path.join(root,'wrangler.json'),JSON.stringify({...config,main:'index.mjs',no_bundle:true}));
    assert.equal(validatePayload(root,config).files.length,2);
    fs.writeFileSync(path.join(root,'wrangler.json'),JSON.stringify({...config,main:'index.mjs',no_bundle:true,vars:{KEY:'different'}}));
    assert.throws(()=>validatePayload(root,config),/changed approved/);
    fs.writeFileSync(path.join(root,'package.json'),'{}');
    assert.throws(()=>fileInventory(root),/dependencies or credentials/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
