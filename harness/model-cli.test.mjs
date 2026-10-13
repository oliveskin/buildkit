import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {OPENCODE_VERSION,resolveModel} from './model-config.mjs';
import {opencodeEnvironment} from './opencode-agent.mjs';

const enabled=process.env.BUILDKIT_TEST_OPENCODE==='1';
test('pinned OpenCode accepts noninteractive flags and the resolved least-privilege configuration', {skip:!enabled,timeout:120000},()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'bk-real-cli-'));
  const home=path.join(base,'home'),work=path.join(base,'workspace');
  fs.mkdirSync(home,{mode:0o700});fs.mkdirSync(work);
  const env={PATH:process.env.PATH,HOME:home,BUILDKIT_MODEL_PROVIDER:'openrouter',
    BUILDKIT_MODEL:'qwen/test-model-no-inference',OPENROUTER_API_KEY:'not-a-real-api-key'};
  const profile=resolveModel(env);
  const safe=opencodeEnvironment(profile,env,home,false);
  const run=args=>{
    const result=spawnSync('opencode',args,{cwd:work,env:safe,encoding:'utf8',input:'',timeout:60000,maxBuffer:8e6});
    assert.equal(result.status,0,'Pinned CLI command failed: '+args.join(' ')+'\n'+String(result.stderr||result.error||result.stdout).slice(-2000));
    return String(result.stdout||'');
  };
  try{
    assert.ok(run(['--version']).includes(OPENCODE_VERSION));
    const help=run(['--pure','run','--help']);
    assert.match(help,/format/);assert.match(help,/model/);assert.match(help,/agent/);
    const config=JSON.parse(run(['--pure','debug','config']));
    assert.equal(config.model,'buildkit/'+profile.model);
    assert.equal(config.small_model,config.model);
    assert.equal(config.share,'disabled');
    assert.equal(config.permission.bash,'deny');
    assert.equal(config.permission.external_directory,'deny');
    assert.equal(config.agent.buildkit.steps,profile.limits.steps);
    assert.deepEqual(config.enabled_providers,['buildkit']);
    assert.equal(Object.keys(config.mcp||{}).length,0);
    const models=run(['--pure','models','buildkit']);
    assert.match(models,/buildkit\/qwen\/test-model-no-inference/);
    // No opencode run invocation or inference request occurs in this compatibility test.
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});
