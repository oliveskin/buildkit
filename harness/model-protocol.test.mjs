import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {resolveModel} from './model-config.mjs';
import {opencodeEnvironment,parseOpenCode} from './opencode-agent.mjs';

// This integration test starts an in-process, synthetic API only. The production
// resolver still forbids localhost endpoints. No provider credentials or calls.
const enabled=process.env.BUILDKIT_TEST_OPENCODE==='1';
test('real OpenCode reads and edits files via Chat Completions tool calls using stdin and JSON events', {skip:!enabled,timeout:120000},async()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'bk-protocol-'));
  const work=path.join(base,'workspace'),home=path.join(base,'home');
  fs.mkdirSync(work);fs.mkdirSync(home,{mode:0o700});
  const nonce=randomBytes(12).toString('hex'),before=JSON.stringify({value:'before',nonce:''});
  fs.writeFileSync(path.join(work,'input.txt'),nonce);
  fs.writeFileSync(path.join(work,'result.json'),before);
  let stage=0,sawNonce=false;const errors=[],paths=[];
  function reply(res,body,text,tool){
    const model=body.model,id='chatcmpl-fixture-'+Date.now();
    if(!body.stream){
      res.writeHead(200,{'Content-Type':'application/json'});
      res.end(JSON.stringify({id,object:'chat.completion',created:1,model,
        choices:[{index:0,message:{role:'assistant',content:tool?null:text,...(tool?{tool_calls:[tool]}:{})},finish_reason:tool?'tool_calls':'stop'}],
        usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}}));return;
    }
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});
    const send=(delta,finish_reason=null)=>res.write('data: '+JSON.stringify({id,object:'chat.completion.chunk',created:1,model,
      choices:[{index:0,delta,finish_reason}]})+'\n\n');
    send({role:'assistant',...(tool?{tool_calls:[{index:0,...tool}]}:{content:text})});
    send({},tool?'tool_calls':'stop');
    res.write('data: [DONE]\n\n');res.end();
  }
  const server=http.createServer(async(req,res)=>{
    try{
      paths.push(req.url);
      if(req.method!=='POST'||req.url!=='/v1/chat/completions')throw Error('Unexpected fixture API path '+req.method+' '+req.url);
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2e6)throw Error('Fixture request too large');}
      const body=JSON.parse(raw),tools=body.tools||[];
      if(!tools.length){reply(res,body,'Fixture',null);return;}
      const tool=(name,args)=>({id:'call_fixture_'+stage,type:'function',function:{name,arguments:JSON.stringify(args)}});
      if(stage===0){
        assert.ok(tools.some(t=>t.function?.name==='read'),'Runtime must expose a file read tool');
        stage=1;reply(res,body,'',tool('read',{filePath:path.join(work,'input.txt')}));return;
      }
      if(stage===1){
        sawNonce=body.messages.some(m=>m.role==='tool'&&JSON.stringify(m.content).includes(nonce));
        assert.ok(sawNonce,'The runtime must return the actual read-tool output to the model');
        const after=JSON.stringify({value:'verified',nonce});
        const canEdit=tools.some(t=>t.function?.name==='edit'),canWrite=tools.some(t=>t.function?.name==='write');
        assert.ok(canEdit||canWrite,'Runtime must expose a controlled file-edit tool');
        stage=2;
        reply(res,body,'',canEdit?tool('edit',{filePath:path.join(work,'result.json'),oldString:before,newString:after}):
          tool('write',{filePath:path.join(work,'result.json'),content:after}));return;
      }
      reply(res,body,'PROBE_COMPLETE',null);
    }catch(e){errors.push(String(e?.message||e));res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'Synthetic test assertion failed'}}));}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let child;
  try{
    const env={PATH:process.env.PATH,HOME:home,BUILDKIT_MODEL_PROVIDER:'custom',BUILDKIT_MODEL:'fixture-coder',
      BUILDKIT_API_KEY:'synthetic-not-a-provider-key',BUILDKIT_API_PROTOCOL:'chat-completions',BUILDKIT_API_BASE_URL:'https://models.example.com/v1'};
    const profile={...resolveModel(env),baseURL:'http://127.0.0.1:'+server.address().port+'/v1'};
    const safe=opencodeEnvironment(profile,env,home,false);
    let stdout='',stderr='';
    child=spawn('opencode',['--pure','run','--format','json','--agent','buildkit','--model','buildkit/'+profile.model],{
      cwd:work,env:safe,stdio:['pipe','pipe','pipe']});
    child.stdout.on('data',b=>{stdout+=b;if(stdout.length>8e6)child.kill('SIGTERM');});
    child.stderr.on('data',b=>{stderr+=b;});
    const timeout=setTimeout(()=>child.kill('SIGTERM'),90000);
    const completed=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(status,signal)=>resolve({status,signal}));});
    child.stdin.end('Read input.txt. Update result.json to contain value verified and the exact nonce from input.txt. Use file tools; no commands. Reply PROBE_COMPLETE.');
    const result=await completed;clearTimeout(timeout);
    assert.equal(result.status,0,'Actual CLI failed: '+stderr.slice(-2000));
    assert.deepEqual(errors,[]);
    const parsed=parseOpenCode(stdout,result);
    assert.equal(parsed.text.trim(),'PROBE_COMPLETE');
    assert.equal(sawNonce,true);assert.equal(stage,2);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(work,'result.json'),'utf8')),{value:'verified',nonce});
    assert.ok(paths.length>=3);assert.ok(parsed.usage.steps>=3);
  }finally{
    if(child&&!child.killed)child.kill('SIGTERM');
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    fs.rmSync(base,{recursive:true,force:true});
  }
});
