import {createHash} from 'node:crypto';
import {isIP} from 'node:net';

// Provider URLs are not supplied by Issues or model-generated files. Configuration is
// read only from administrator-controlled Actions variables and secrets.
export const OPENCODE_VERSION='1.19.0';
export const PRESETS=Object.freeze({
  openai:{runtime:'codex',secret:'OPENAI_API_KEY',protocol:'responses',url:'https://api.openai.com/v1'},
  anthropic:{runtime:'claude',secret:'ANTHROPIC_API_KEY',protocol:'anthropic',url:'https://api.anthropic.com/v1'},
  openrouter:{runtime:'opencode',secret:'OPENROUTER_API_KEY',protocol:'chat-completions',url:'https://openrouter.ai/api/v1'},
  qwen:{runtime:'opencode',secret:'QWEN_API_KEY',protocol:'chat-completions',url:'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'},
  'qwen-cn':{runtime:'opencode',secret:'QWEN_API_KEY',protocol:'chat-completions',url:'https://dashscope.aliyuncs.com/compatible-mode/v1'},
  'qwen-us':{runtime:'opencode',secret:'QWEN_API_KEY',protocol:'chat-completions',url:'https://dashscope-us.aliyuncs.com/compatible-mode/v1'},
  zai:{runtime:'opencode',secret:'ZAI_API_KEY',protocol:'chat-completions',url:'https://api.z.ai/api/paas/v4'},
  'zai-coding':{runtime:'opencode',secret:'ZAI_API_KEY',protocol:'chat-completions',url:'https://api.z.ai/api/coding/paas/v4'},
  custom:{runtime:'opencode',secret:'BUILDKIT_API_KEY'}
});
export const MODEL_SECRETS=Object.freeze(['OPENAI_API_KEY','ANTHROPIC_API_KEY','OPENROUTER_API_KEY','ZAI_API_KEY','QWEN_API_KEY','BUILDKIT_API_KEY','BUILDKIT_REVIEW_API_KEY']);
export const allSecretValues=env=>[...MODEL_SECRETS,'GITHUB_TOKEN','BUILDKIT_SEARCH_KEY'].map(k=>env[k]).filter(v=>typeof v==='string'&&v.length>0);
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const validModel=/^[a-zA-Z0-9][a-zA-Z0-9_.:/+-]{0,159}$/;
export function publicAddress(value){
  if(isIP(value)===4){
    const [a,b]=value.split('.').map(Number);
    return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19));
  }
  // Reject mapped IPv4, link-local and private IPv6; allow global unicast only.
  return isIP(value)===6 && /^[23][0-9a-f]{0,3}:/i.test(value) && !value.toLowerCase().startsWith('2001:db8:');
}
export function validateBaseURL(raw){
  let u;try{u=new URL(raw);}catch{throw Error('API base URL must be a complete public HTTPS URL.');}
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||u.pathname.includes('%')||
     !u.hostname.includes('.')||/(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname)||isIP(u.hostname.replace(/[\[\]]/g,'')))
    throw Error('API base URL must use public HTTPS without embedded credentials, IP literals, query parameters or custom ports.');
  if(/\/(chat\/completions|responses|messages)\/?$/.test(u.pathname))
    throw Error('Set the API base URL, not the full chat/completions, responses or messages URL.');
  return u.href.replace(/\/$/,'');
}
function integer(env,key,fallback,min,max){
  if(!env[key])return fallback;
  const value=Number(env[key]);
  if(!Number.isSafeInteger(value)||value<min||value>max)throw Error(key+' must be an integer between '+min+' and '+max+'.');
  return value;
}
export function modelFamily(model,provider,override=''){
  if(override){if(!/^[a-z0-9][a-z0-9-]{1,39}$/.test(override))throw Error('MODEL_FAMILY must be a short canonical lowercase family, not a provider/CLI label.');return override;}
  const m=model.toLowerCase();
  for(const family of ['qwen','glm','claude','deepseek','gemini','llama','mistral','gpt'])if(m.includes(family))return family;
  if(/^(o[134])(?:[-.]|$)/.test(m))return 'gpt';
  if(model==='default'&&provider==='openai')return 'gpt';
  if(model==='default'&&provider==='anthropic')return 'claude';
  return null; // Unknown aliases cannot claim independent model review.
}
export function resolveModel(env,role='build'){
  if(!['build','review'].includes(role))throw Error('Invalid model role.');
  const prefix=role==='review'?'BUILDKIT_REVIEW_':'BUILDKIT_';
  const explicit=env[prefix+'MODEL_PROVIDER']||env[prefix+'PROVIDER'];
  if(role==='review'&&!explicit&&!env[prefix+'AGENT']&&!env[prefix+'MODEL'])return null;
  let provider=(explicit||'').trim().toLowerCase();
  if(provider==='codex')provider='openai';
  if(provider==='claude')provider='anthropic';
  if(!provider){
    if(role==='review')throw Error('Choose BUILDKIT_REVIEW_MODEL_PROVIDER explicitly.');
    // Preserve existing one/two-key OpenAI/Anthropic onboarding.
    if(env.OPENAI_API_KEY)provider='openai';
    else if(env.ANTHROPIC_API_KEY)provider='anthropic';
    else {
      const available=['openrouter','qwen','zai','custom'].filter(p=>env[PRESETS[p].secret]);
      if(available.length>1)throw Error('Multiple providers configured: choose BUILDKIT_MODEL_PROVIDER.');
      provider=available[0]||'openai';
    }
  }
  const preset=PRESETS[provider];if(!preset)throw Error('Unknown model provider. Choose openai, anthropic, openrouter, qwen, qwen-cn, qwen-us, zai, zai-coding or custom.');
  const runtime=(env[prefix+'AGENT']||preset.runtime).trim().toLowerCase();
  if(!['codex','claude','opencode'].includes(runtime)||runtime==='codex'&&provider!=='openai'||runtime==='claude'&&provider!=='anthropic')
    throw Error('Use OpenCode for third-party APIs; Codex/Claude adapters retain their native provider.');
  const model=String(env[prefix+'MODEL']||'default').trim();
  if(!validModel.test(model)||runtime==='opencode'&&model==='default'||/^(auto|openrouter\/auto)$/i.test(model))
    throw Error(prefix+'MODEL must specify one exact accessible coding model; no automatic model fallback.');
  const overrideURL=env[prefix+'API_BASE_URL'];
  if(runtime!=='opencode'&&overrideURL)throw Error('Custom API endpoints require BUILDKIT_AGENT=opencode.');
  const protocol=env[prefix+'API_PROTOCOL']||preset.protocol;
  if(!['chat-completions','responses','anthropic'].includes(protocol))throw Error('Set API_PROTOCOL to chat-completions, responses or anthropic for a custom API.');
  const baseURL=validateBaseURL(overrideURL||preset.url);
  const secret=role==='review'&&env.BUILDKIT_REVIEW_API_KEY?'BUILDKIT_REVIEW_API_KEY':preset.secret;
  if(!env[secret])throw Error('Set '+secret+' in GitHub Actions repository secrets.');
  const limits={steps:integer(env,'BUILDKIT_MAX_AGENT_STEPS',20,3,40),
    outputTokens:integer(env,'BUILDKIT_MAX_OUTPUT_TOKENS',8192,512,32768),
    contextTokens:integer(env,prefix+'CONTEXT_TOKENS',32768,8192,2000000),
    calls:integer(env,'BUILDKIT_MAX_AGENT_CALLS',32,1,100),
    timeoutMs:integer(env,'BUILDKIT_AGENT_TIMEOUT_SECONDS',600,30,900)*1000};
  if(limits.outputTokens>=limits.contextTokens)throw Error('Output-token bound must be smaller than model context capacity.');
  const result={schema:1,role,runtime,provider,model,protocol,baseURL,secret,limits,
    family:modelFamily(model,provider,env[prefix+'MODEL_FAMILY']||'')};
  result.identity=hash({runtime,provider,model,protocol,baseURL});
  return Object.freeze(result);
}
export function modelRecord(profile){
  return {schema:1,identity:profile.identity,runtime:profile.runtime,provider:profile.provider,
    model:profile.model,family:profile.family};
}
export function independentModels(reviewer,builders){
  return Boolean(reviewer?.family && builders?.length && builders.every(b=>b?.family&&
    b.family!==reviewer.family&&b.identity!==reviewer.identity));
}
