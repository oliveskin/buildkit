import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {permittedChange,cleanEnv} from './core.mjs';
import {inspectFile,redact} from './security.mjs';
import {OPENCODE_VERSION,publicAddress,modelRecord} from './model-config.mjs';

export function opencodeSettings(profile,readOnly=false){
  const npm=profile.protocol==='responses'?'@ai-sdk/openai':profile.protocol==='anthropic'?'@ai-sdk/anthropic':'@ai-sdk/openai-compatible';
  const edits={'*':readOnly?'deny':'allow','AGENTS.md':'deny','*/AGENTS.md':'deny','.agents/*':'deny','.git/*':'deny','.opencode/*':'deny','opencode.json':'deny','opencode.jsonc':'deny','*/.env*':'deny','.env*':'deny'};
  const permission={'*':'deny',read:'allow',glob:'allow',grep:'allow',edit:edits,
    bash:'deny',task:'deny',webfetch:'deny',websearch:'deny',question:'deny',skill:'deny',external_directory:'deny',doom_loop:'deny'};
  const model='buildkit/'+profile.model;
  return {$schema:'https://opencode.ai/config.json',autoupdate:false,share:'disabled',snapshot:false,
    model,small_model:model,enabled_providers:['buildkit'],plugin:[],mcp:{},lsp:false,formatter:false,
    compaction:{auto:false,prune:false},permission,
    provider:{buildkit:{name:'Buildkit configured API',npm,
      options:{baseURL:profile.baseURL,apiKey:'{env:BUILDKIT_ACTIVE_API_KEY}',timeout:Math.min(profile.limits.timeoutMs,120000)},
      models:{[profile.model]:{id:profile.model,name:profile.model,tool_call:true,
        limit:{context:profile.limits.contextTokens,output:profile.limits.outputTokens}}}}},
    default_agent:'buildkit',agent:{buildkit:{mode:'primary',description:'Buildkit controlled file-only coding agent',
      model,steps:profile.limits.steps,permission,
      prompt:'Follow the supplied task. Read project instructions. Use file tools only. Never run shell commands, change credentials, deploy, or claim tests ran; the controller executes verification.'}}
  };
}
export function opencodeEnvironment(profile,env,home,readOnly){
  return {...cleanEnv(env),HOME:home,XDG_CONFIG_HOME:path.join(home,'config'),
    XDG_DATA_HOME:path.join(home,'data'),XDG_CACHE_HOME:path.join(home,'cache'),XDG_STATE_HOME:path.join(home,'state'),
    BUILDKIT_ACTIVE_API_KEY:env[profile.secret],OPENCODE_CONFIG_CONTENT:JSON.stringify(opencodeSettings(profile,readOnly)),
    OPENCODE_DISABLE_AUTOUPDATE:'true',OPENCODE_DISABLE_DEFAULT_PLUGINS:'true',OPENCODE_DISABLE_CLAUDE_CODE:'true',
    OPENCODE_DISABLE_LSP_DOWNLOAD:'true',OPENCODE_DISABLE_MODELS_FETCH:'true',OPENCODE_DISABLE_AUTOCOMPACT:'true',
    OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX:String(profile.limits.outputTokens)};
}
export function parseOpenCode(text,result={status:0}){
  if(result.error||result.signal||result.status!==0)throw Error('OpenCode failed, timed out or was interrupted. Check model access, protocol, quotas and tool support.');
  const events=[];
  for(const line of String(text).split('\n').filter(x=>x.trim())){
    let event;try{event=JSON.parse(line);}catch{throw Error('OpenCode did not produce valid JSON events.');}
    if(event.type==='error'||event.type==='session.error')throw Error('OpenCode reported a provider/model error. No model fallback was attempted.');
    events.push(event);
  }
  const finishes=events.filter(e=>e.type==='step_finish').map(e=>e.part||{});
  if(!finishes.length||!['stop','end_turn'].includes(finishes.at(-1).reason))
    throw Error('OpenCode did not finish normally; truncated or step-limited output is not completion.');
  const parts=events.filter(e=>e.type==='text'&&typeof e.part?.text==='string').map(e=>e.part.text);
  if(!parts.length)throw Error('OpenCode returned no final text.');
  let input=0,output=0,cost=0,hasTokens=false,hasPositiveCost=false;
  for(const finish of finishes){
    if(Number.isFinite(finish.tokens?.input)&&Number.isFinite(finish.tokens?.output)){
      hasTokens=true;input+=finish.tokens.input;output+=finish.tokens.output;
    }
    if(Number.isFinite(finish.cost)&&finish.cost>0){hasPositiveCost=true;cost+=finish.cost;}
  }
  // Custom-provider model metadata may default to zero cost. Never equate it with free usage.
  return {text:parts.at(-1),events,usage:{inputTokens:hasTokens?input:null,outputTokens:hasTokens?output:null,
    reportedCostUSD:hasPositiveCost?cost:null,steps:finishes.length}};
}
const configPath=p=>/(^|\/)(\.opencode|opencode\.jsonc?)(\/|$)/.test(p);
const contextPath=p=>p==='AGENTS.md'||/^\.agents\/skills\/[^/]+\/SKILL\.md$/.test(p);
function inventory(root){
  const map=new Map();let total=0;
  function walk(directory,relative=''){
    for(const name of fs.readdirSync(directory)){
      const p=relative?relative+'/'+name:name,abs=path.join(directory,name),stat=fs.lstatSync(abs);
      if(stat.isSymbolicLink())throw Error('Model workspace contains a symlink: '+p);
      if(stat.isDirectory()){walk(abs,p);continue;}
      if(!stat.isFile()||stat.size>8e6||(total+=stat.size)>100e6||map.size>=20000)
        throw Error('Model workspace exceeds safe snapshot limits or contains a special file.');
      map.set(p,createHash('sha256').update(fs.readFileSync(abs)).digest('hex'));
    }
  }
  walk(root);return map;
}
export function makeModelWorkspace(root,files){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'buildkit-model-'));
  const work=path.join(base,'workspace'),home=path.join(base,'home');
  fs.mkdirSync(work,{recursive:true});fs.mkdirSync(home,{recursive:true,mode:0o700});
  try{
    for(const file of files){
      if(configPath(file))throw Error('Project-supplied OpenCode configuration is not allowed. Use GitHub model variables.');
      if(!permittedChange(file)&&!contextPath(file))continue;
      const info=inspectFile(root,file);if(info.missing)continue;
      const target=path.join(work,file);fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.copyFileSync(path.join(root,file),target);
    }
    return {base,work,home,before:inventory(work)};
  }catch(e){fs.rmSync(base,{recursive:true,force:true});throw e;}
}
export function applyModelWorkspace(workspace,root,secrets=[],readOnly=false){
  const after=inventory(workspace.work),changed=[];
  for(const file of new Set([...workspace.before.keys(),...after.keys()])){
    if(workspace.before.get(file)===after.get(file))continue;
    if(readOnly||contextPath(file)||configPath(file)||!permittedChange(file))throw Error('Agent attempted a forbidden file change: '+file);
    const abs=path.join(workspace.work,file);
    if(after.has(file)){
      const bytes=fs.readFileSync(abs);
      if(secrets.filter(s=>s.length>=8).some(s=>bytes.includes(Buffer.from(s))))throw Error('Credential detected in model output: '+file);
    }
    inspectFile(root,file); // Reject traversal through pre-existing symlinks in the destination.
    changed.push(file);
  }
  // Validate every path before applying any output to the real product branch.
  for(const file of changed){
    const target=path.join(root,file);
    if(!after.has(file)){fs.rmSync(target,{force:true});continue;}
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(workspace.work,file),target);
  }
  return changed;
}
export function createOpenCodeAdapter({env,execute,secrets=[],onUsage=()=>{},lookupHost}={}){
  const verified=new Set();let installed=false;
  const safe=cleanEnv(env);
  function ensureCLI(){
    if(installed)return;
    const check=execute('opencode',['--version'],{encoding:'utf8',env:safe,timeout:10000});
    if(check.status!==0||!String(check.stdout).includes(OPENCODE_VERSION)){
      const install=execute('npm',['install','-g','opencode-ai@'+OPENCODE_VERSION],{
        cwd:env.RUNNER_TEMP||os.tmpdir(),env:safe,encoding:'utf8',timeout:180000,maxBuffer:3e6});
      if(install.error||install.status!==0)throw Error('Unable to install pinned OpenCode '+OPENCODE_VERSION+' on the runner.');
    }
    installed=true;
  }
  function checkHost(profile){
    const host=new URL(profile.baseURL).hostname;
    let addresses;
    if(lookupHost)addresses=lookupHost(host);
    else{
      const js='require("node:dns").promises.lookup(process.argv[1],{all:true}).then(x=>console.log(JSON.stringify(x.map(r=>r.address)))).catch(()=>process.exit(1))';
      const out=execute(process.execPath,['-e',js,host],{env:safe,encoding:'utf8',timeout:10000});
      if(out.status!==0)throw Error('Cannot resolve the configured model API host.');
      try{addresses=JSON.parse(out.stdout);}catch{throw Error('Invalid API host resolution result.');}
    }
    if(!addresses?.length||addresses.some(a=>!publicAddress(a)))throw Error('Model endpoint resolves to a non-public network address.');
  }
  function invoke(profile,work,home,prompt,readOnly,purpose){
    if(Buffer.byteLength(prompt)>500000)throw Error('Agent input exceeds the bounded prompt size.');
    const result=execute('opencode',['--pure','run','--format','json','--agent','buildkit','--model','buildkit/'+profile.model],{
      cwd:work,env:opencodeEnvironment(profile,env,home,readOnly),input:prompt,encoding:'utf8',
      timeout:profile.limits.timeoutMs,maxBuffer:8e6});
    let parsed;
    try{parsed=parseOpenCode(result.stdout,result);}catch(e){
      onUsage({...modelRecord(profile),purpose,outcome:'failed',inputTokens:null,outputTokens:null,reportedCostUSD:null});
      throw Error(redact(e.message,secrets));
    }
    onUsage({...modelRecord(profile),purpose,outcome:'completed',...parsed.usage});
    if(parsed.usage.steps>profile.limits.steps)throw Error('OpenCode exceeded configured step limit.');
    return parsed;
  }
  function preflight(profile){
    const id=profile.identity+':'+profile.role;
    if(verified.has(id))return;
    ensureCLI();checkHost(profile);
    const base=fs.mkdtempSync(path.join(os.tmpdir(),'buildkit-probe-'));
    const work=path.join(base,'workspace'),home=path.join(base,'home'),nonce=randomBytes(12).toString('hex');
    fs.mkdirSync(work);fs.mkdirSync(home,{mode:0o700});fs.writeFileSync(path.join(work,'input.txt'),nonce);
    fs.writeFileSync(path.join(work,'result.json'),JSON.stringify({value:'before',nonce:''}));
    const readOnly=profile.role==='review';
    try{
      const prompt=readOnly?
        'Read input.txt using the file tool. Reply ONLY with JSON {"nonce":"the exact file contents"}. Do not modify any files.':
        'Read input.txt using the file tool. Edit result.json: set value to "verified" and nonce to the exact contents of input.txt. Do not run commands. Reply PROBE_COMPLETE.';
      const result=invoke(profile,work,home,prompt,readOnly,'capability-preflight');
      const file=JSON.parse(fs.readFileSync(path.join(work,'result.json'),'utf8'));
      if(readOnly){
        let response;try{response=JSON.parse(result.text.trim());}catch{throw Error('Read-only model preflight did not return the requested JSON.');}
        if(response.nonce!==nonce||file.value!=='before'||file.nonce!=='')throw Error('Read-only preflight failed.');
      }else if(file.value!=='verified'||file.nonce!==nonce)throw Error('Model did not perform the required read/edit tool calls.');
      if(fs.readFileSync(path.join(work,'input.txt'),'utf8')!==nonce)throw Error('Model modified preflight input.');
      verified.add(id);
    }catch(e){throw Error('Model capability preflight failed: '+redact(e.message,secrets)+' Check API plan/region, exact model, protocol and tool-calling support.');}
    finally{fs.rmSync(base,{recursive:true,force:true});}
  }
  return {preflight,run(profile,task,{root,files,readOnly=false}){
    preflight(profile);
    const workspace=makeModelWorkspace(root,files);
    try{
      const result=invoke(profile,workspace.work,workspace.home,task,readOnly,'task');
      applyModelWorkspace(workspace,root,secrets,readOnly);
      return redact(result.text,secrets);
    }finally{fs.rmSync(workspace.base,{recursive:true,force:true});}
  }};
}
