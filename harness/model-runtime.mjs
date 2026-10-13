import os from 'node:os';
import {agentConfig,cleanEnv} from './core.mjs';
import {redact} from './security.mjs';
import {resolveModel,modelRecord,allSecretValues} from './model-config.mjs';
import {createOpenCodeAdapter} from './opencode-agent.mjs';

// This adapter owns only model execution. Product state, Git, tests, approvals and
// deployment remain under the existing Buildkit controller.
export function createModelRuntime({env,execute,root,files,lookupHost}={}){
  const secrets=allSecretValues(env),records=[];let calls=0,current=null;
  const safe=cleanEnv(env),installed=new Set();
  const ceiling=env.BUILDKIT_MAX_RUN_COST_USD?Number(env.BUILDKIT_MAX_RUN_COST_USD):null;
  if(ceiling!==null&&(!Number.isFinite(ceiling)||ceiling<=0))throw Error('BUILDKIT_MAX_RUN_COST_USD must be a positive finite amount.');
  function beforeCall(profile){
    if(calls>=profile.limits.calls)throw Error('Configured agent-call budget reached. Completed checkpoints remain; review usage before /resume.');
    if(ceiling!==null&&records.length){
      if(records.some(r=>r.reportedCostUSD===null))throw Error('Dollar budget cannot be checked because the provider did not report cost. Set provider-side limits or remove the optional observed-cost ceiling.');
      if(records.reduce((n,r)=>n+r.reportedCostUSD,0)>=ceiling)throw Error('Observed model-cost ceiling reached; no further model call was started.');
    }
    calls++;
  }
  function record(value){records.push({...value,at:new Date().toISOString()});}
  const openCode=createOpenCodeAdapter({env,secrets,lookupHost,
    execute:(cmd,args,options)=>{
      if(cmd==='opencode'&&args.includes('run'))beforeCall(current);
      return execute(cmd,args,options);
    },onUsage:record});
  function native(profile,task,readOnly){
    const runtime=profile.runtime,nativeEnv={...env};
    nativeEnv[runtime==='codex'?'OPENAI_API_KEY':'ANTHROPIC_API_KEY']=env[profile.secret];
    if(!installed.has(runtime)){
      const exists=execute('which',[runtime],{env:safe,encoding:'utf8',timeout:10000});
      if(exists.status!==0){
        const install=runtime==='codex'?['npm',['install','-g','@openai/codex']]:
          ['bash',['-c','curl -fsSL https://claude.ai/install.sh | bash']];
        const result=execute(install[0],install[1],{cwd:env.RUNNER_TEMP||os.tmpdir(),env:safe,encoding:'utf8',timeout:180000,maxBuffer:3e6});
        if(result.error||result.status!==0)throw Error('Unable to install '+runtime+' on the runner.');
        if(runtime==='claude'){env.PATH=env.HOME+'/.local/bin:'+env.PATH;safe.PATH=env.PATH;nativeEnv.PATH=env.PATH;}
      }
      installed.add(runtime);
    }
    const config=agentConfig(runtime,nativeEnv,readOnly);
    if(profile.model!=='default')config.args.splice(runtime==='codex'?1:0,0,'--model',profile.model);
    beforeCall(profile);
    const result=execute(runtime,config.args,{cwd:root,env:config.env,input:task,encoding:'utf8',
      timeout:profile.limits.timeoutMs,maxBuffer:3e6});
    record({...modelRecord(profile),purpose:'task',outcome:result.error||result.status!==0?'failed':'completed',
      inputTokens:null,outputTokens:null,reportedCostUSD:null});
    if(result.error||result.status!==0)throw Error(runtime+' failed: '+redact(String(result.stderr||result.stdout||result.error).slice(-1200),secrets));
    return redact(String(result.stdout||'').trim(),secrets);
  }
  return {
    profile:role=>resolveModel(env,role),
    prepare(profile){
      if(!profile)return;
      if(profile.runtime==='opencode'){current=profile;openCode.preflight(profile);}
      else agentConfig(profile.runtime,{...env,[profile.runtime==='codex'?'OPENAI_API_KEY':'ANTHROPIC_API_KEY']:env[profile.secret]},profile.role==='review');
    },
    run(profile,task,readOnly=false){
      if(!profile)throw Error('No configured model profile.');
      if(profile.role==='review'&&!readOnly)throw Error('Reviewer profile cannot run in write mode.');
      current=profile;
      return profile.runtime==='opencode'?openCode.run(profile,task,{root,files:files(),readOnly}):native(profile,task,readOnly);
    },
    usage(){
      return {schema:1,runId:String(env.GITHUB_RUN_ID||'local'),calls,records:[...records],
        reportedCostUSD:records.length&&records.every(r=>r.reportedCostUSD!==null)?records.reduce((a,r)=>a+r.reportedCostUSD,0):null,
        note:'Costs are provider-reported observations, not a hard billing cap. Unknown is not zero; apply provider-side spend limits.'};
    }
  };
}
