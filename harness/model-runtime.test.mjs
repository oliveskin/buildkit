import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createModelRuntime} from './model-runtime.mjs';
import {resolveModel,OPENCODE_VERSION} from './model-config.mjs';
import {makeModelWorkspace,applyModelWorkspace} from './opencode-agent.mjs';
const env={PATH:process.env.PATH,HOME:os.tmpdir(),GITHUB_RUN_ID:'123',
  BUILDKIT_MODEL_PROVIDER:'openrouter',BUILDKIT_MODEL:'qwen/example',OPENROUTER_API_KEY:'not-a-real-credential-value'};
const report=text=>[{type:'text',part:{text}},{type:'step_finish',part:{reason:'stop',tokens:{input:11,output:7},cost:0}}].map(x=>JSON.stringify(x)).join('\n');
function fixture({badProbe=false,error=false,privateDNS=false,leak=false,maxCalls}={}){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bk-runtime-test-'));
  fs.writeFileSync(path.join(root,'AGENTS.md'),'Follow the task without shell access.');
  fs.writeFileSync(path.join(root,'sample.txt'),'before');
  const calls=[];
  const execute=(cmd,args,options)=>{
    calls.push({cmd,args,cwd:options.cwd});
    if(cmd==='opencode'&&args[0]==='--version')return {status:0,stdout:OPENCODE_VERSION};
    if(cmd==='opencode'&&args.includes('run')){
      assert.equal(options.env.GITHUB_TOKEN,undefined);
      assert.equal(options.env.CLOUDFLARE_PROD_TOKEN,undefined);
      assert.equal(options.env.OPENROUTER_API_KEY,undefined);
      assert.equal(options.env.BUILDKIT_ACTIVE_API_KEY,env.OPENROUTER_API_KEY);
      assert.ok(options.env.OPENCODE_CONFIG_CONTENT.includes('"share":"disabled"'));
      assert.ok(!options.args?.includes('--auto'));
      if(error)return {status:0,stdout:JSON.stringify({type:'error',error:'upstream failure'})};
      if(fs.existsSync(path.join(options.cwd,'input.txt'))){
        const nonce=fs.readFileSync(path.join(options.cwd,'input.txt'),'utf8');
        if(!badProbe)fs.writeFileSync(path.join(options.cwd,'result.json'),JSON.stringify({nonce,value:'verified'}));
        return {status:0,stdout:report('PROBE_COMPLETE')};
      }
      assert.equal(fs.existsSync(path.join(options.cwd,'.git')),false);
      fs.writeFileSync(path.join(options.cwd,'sample.txt'),leak?env.OPENROUTER_API_KEY:'after');
      return {status:0,stdout:report('Completed file changes; controller must run tests.')};
    }
    throw Error('Unexpected test command '+cmd);
  };
  const config={...env,...(maxCalls?{BUILDKIT_MAX_AGENT_CALLS:String(maxCalls)}:{})};
  const runtime=createModelRuntime({env:config,execute,root,files:()=>['AGENTS.md','sample.txt'],
    lookupHost:()=>privateDNS?['127.0.0.1']:['93.184.216.34']});
  return {runtime,root,calls,profile:runtime.profile('build'),cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}
test('compatible model edits disposable workspace; only verified output is copied back',()=>{
  const f=fixture();try{
    f.runtime.prepare(f.profile);f.runtime.run(f.profile,'Update sample.txt');
    assert.equal(fs.readFileSync(path.join(f.root,'sample.txt'),'utf8'),'after');
    assert.equal(f.runtime.usage().calls,2,'capability probe plus task');
    assert.equal(f.runtime.usage().records[0].purpose,'capability-preflight');
    assert.equal(f.runtime.usage().reportedCostUSD,null);
    f.runtime.prepare(f.profile);assert.equal(f.runtime.usage().calls,2,'same profile preflight cached only within this run');
    assert.ok(!JSON.stringify(f.runtime.usage()).includes(env.OPENROUTER_API_KEY));
    assert.ok(f.calls.filter(x=>x.args.includes('run')).every(x=>!fs.existsSync(x.cwd)),'temporary transcripts/workspaces removed');
  }finally{f.cleanup();}
});
test('failed tool probe, provider errors and private DNS stop before product source transfer',()=>{
  for(const opts of [{badProbe:true},{error:true},{privateDNS:true}]){
    const f=fixture(opts);try{
      assert.throws(()=>f.runtime.run(f.profile,'Change sample.txt'),/preflight|network/);
      assert.equal(fs.readFileSync(path.join(f.root,'sample.txt'),'utf8'),'before');
    }finally{f.cleanup();}
  }
});
test('call budget and secret detection cannot be bypassed by successful final text',()=>{
  const limited=fixture({maxCalls:1});try{
    assert.throws(()=>limited.runtime.run(limited.profile,'Change sample.txt'),/budget/);
    assert.equal(fs.readFileSync(path.join(limited.root,'sample.txt'),'utf8'),'before');
  }finally{limited.cleanup();}
  const leak=fixture({leak:true});try{
    assert.throws(()=>leak.runtime.run(leak.profile,'Change sample.txt'),/Credential/);
    assert.equal(fs.readFileSync(path.join(leak.root,'sample.txt'),'utf8'),'before');
  }finally{leak.cleanup();}
});
test('read-only snapshots and protected files cannot be copied back even if model claims success',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bk-file-test-'));
  fs.writeFileSync(path.join(root,'sample.txt'),'original');
  const w=makeModelWorkspace(root,['sample.txt']);try{
    fs.writeFileSync(path.join(w.work,'sample.txt'),'changed');
    assert.throws(()=>applyModelWorkspace(w,root,[],true),/forbidden/);
    fs.writeFileSync(path.join(w.work,'opencode.json'),'{}');
    assert.throws(()=>applyModelWorkspace(w,root,[],false),/forbidden/);
    assert.equal(fs.readFileSync(path.join(root,'sample.txt'),'utf8'),'original','all changes checked before copy');
  }finally{fs.rmSync(w.base,{recursive:true,force:true});fs.rmSync(root,{recursive:true,force:true});}
});
test('native adapters receive only their selected credential and optional model flag',()=>{
  const calls=[],root=fs.mkdtempSync(path.join(os.tmpdir(),'bk-native-test-'));
  const e={PATH:process.env.PATH,HOME:os.tmpdir(),OPENAI_API_KEY:'openai-test',ANTHROPIC_API_KEY:'claude-test',GITHUB_TOKEN:'github-test',BUILDKIT_MODEL:'gpt-example'};
  const runtime=createModelRuntime({env:e,root,files:()=>[],execute:(cmd,args,o)=>{
    calls.push({cmd,args,env:o.env});return {status:0,stdout:cmd==='which'?'/fake/codex':'PASS'};
  }});
  try{
    runtime.run(runtime.profile('build'),'Example task');
    const call=calls.find(c=>c.cmd==='codex');assert.ok(call.args.includes('gpt-example'));
    assert.equal(call.env.CODEX_API_KEY,'openai-test');assert.equal(call.env.GITHUB_TOKEN,undefined);assert.equal(call.env.ANTHROPIC_API_KEY,undefined);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
