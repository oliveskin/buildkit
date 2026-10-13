import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS,resolveModel,modelRecord,independentModels,allSecretValues,validateBaseURL,publicAddress} from './model-config.mjs';
import {opencodeSettings,opencodeEnvironment,parseOpenCode} from './opencode-agent.mjs';
import {codeReviewPassed} from './review-policy.mjs';
import {permittedChange} from './core.mjs';

const router={OPENROUTER_API_KEY:'example-router-credential',BUILDKIT_MODEL_PROVIDER:'openrouter',BUILDKIT_MODEL:'qwen/example-coder'};
test('legacy OpenAI and Anthropic setup remains valid without new variables',()=>{
  assert.equal(resolveModel({OPENAI_API_KEY:'x'}).runtime,'codex');
  assert.equal(resolveModel({ANTHROPIC_API_KEY:'x'}).runtime,'claude');
  assert.equal(resolveModel({OPENAI_API_KEY:'x',ANTHROPIC_API_KEY:'y'}).provider,'openai');
  assert.equal(resolveModel({ANTHROPIC_API_KEY:'x',BUILDKIT_PROVIDER:'claude'}).runtime,'claude');
  assert.equal(resolveModel(router,'review'),null);
});
test('each new preset resolves the correct runtime, secret and explicit model',()=>{
  for(const name of ['openrouter','qwen','qwen-cn','qwen-us','zai','zai-coding']){
    const p=PRESETS[name],env={[p.secret]:'example-credential',BUILDKIT_MODEL_PROVIDER:name,BUILDKIT_MODEL:'example-model'};
    const config=resolveModel(env);
    assert.equal(config.runtime,'opencode');assert.equal(config.baseURL,p.url);assert.equal(config.secret,p.secret);
    assert.ok(!JSON.stringify(modelRecord(config)).includes('example-credential'));
  }
  assert.notEqual(PRESETS.zai.url,PRESETS['zai-coding'].url,'A subscription plan is not silently billed to the general API');
  assert.throws(()=>resolveModel({OPENROUTER_API_KEY:'x'}),/MODEL/);
  assert.throws(()=>resolveModel({...router,BUILDKIT_MODEL:'openrouter/auto'}),/exact/);
});
test('custom chat, Responses and Anthropic protocols select explicit SDK adapters',()=>{
  for(const [protocol,sdk] of [['chat-completions','@ai-sdk/openai-compatible'],['responses','@ai-sdk/openai'],['anthropic','@ai-sdk/anthropic']]){
    const p=resolveModel({BUILDKIT_MODEL_PROVIDER:'custom',BUILDKIT_API_KEY:'fake-value',BUILDKIT_MODEL:'my-model',
      BUILDKIT_API_BASE_URL:'https://models.example.com/v1',BUILDKIT_API_PROTOCOL:protocol});
    const config=opencodeSettings(p);
    assert.equal(config.provider.buildkit.npm,sdk);
    assert.equal(config.model,config.small_model);
    assert.deepEqual(config.enabled_providers,['buildkit']);
    assert.equal(config.share,'disabled');assert.equal(config.autoupdate,false);
  }
  assert.throws(()=>resolveModel({...router,BUILDKIT_AGENT:'codex'}),/OpenCode/);
  assert.throws(()=>resolveModel({BUILDKIT_MODEL_PROVIDER:'custom',BUILDKIT_API_KEY:'x',BUILDKIT_MODEL:'m',BUILDKIT_API_BASE_URL:'https://model.example.com/v1'}),/API_PROTOCOL/);
});
test('unsafe URLs and executable model identifiers are rejected before credentials leave runner',()=>{
  for(const u of ['http://model.example.com/v1','https://localhost/v1','https://127.0.0.1/v1','https://user:pass@model.example.com/v1','https://m.example.com/v1?key=x','https://m.example.com:8443/v1','https://m.internal/v1','https://m.example.com/v1/chat/completions'])assert.throws(()=>validateBaseURL(u),u);
  for(const ip of ['127.0.0.1','10.0.0.1','172.20.0.1','192.168.0.1','169.254.169.254','100.64.1.1','::1','::ffff:127.0.0.1','fc00::1'])assert.equal(publicAddress(ip),false,ip);
  assert.equal(publicAddress('93.184.216.34'),true);
  assert.throws(()=>resolveModel({...router,BUILDKIT_MODEL:'m; touch /tmp/evil'}));
});
test('only the active model credential reaches OpenCode and sharing, shell, network tools are disabled',()=>{
  const env={...router,GITHUB_TOKEN:'gh-example',ANTHROPIC_API_KEY:'anthropic-example',CLOUDFLARE_PROD_TOKEN:'cf-example',NODE_OPTIONS:'--require bad.js'};
  const p=resolveModel(env),safe=opencodeEnvironment(p,env,'/tmp/fake-private-home',false);
  for(const key of ['GITHUB_TOKEN','ANTHROPIC_API_KEY','OPENROUTER_API_KEY','CLOUDFLARE_PROD_TOKEN','NODE_OPTIONS'])assert.equal(safe[key],undefined);
  assert.equal(safe.BUILDKIT_ACTIVE_API_KEY,router.OPENROUTER_API_KEY);
  assert.ok(!safe.OPENCODE_CONFIG_CONTENT.includes(router.OPENROUTER_API_KEY));
  const config=JSON.parse(safe.OPENCODE_CONFIG_CONTENT);
  for(const tool of ['bash','task','webfetch','websearch','external_directory','question'])assert.equal(config.permission[tool],'deny');
  assert.equal(opencodeSettings(p,true).permission.edit['*'],'deny');
  for(const file of ['opencode.json','.opencode/plugins/foo.ts','nested/opencode.jsonc'])assert.equal(permittedChange(file),false);
  assert.ok(allSecretValues(env).includes(router.OPENROUTER_API_KEY));
});
test('model review uses model family and all builders, not CLI or gateway labels',()=>{
  const b=modelRecord(resolveModel(router));
  const r=modelRecord(resolveModel({...router,BUILDKIT_MODEL:'z-ai/glm-example'}));
  assert.equal(b.runtime,r.runtime);assert.equal(independentModels(r,[b]),true);
  const same=modelRecord(resolveModel({...router,BUILDKIT_MODEL_PROVIDER:'qwen',QWEN_API_KEY:'x',BUILDKIT_MODEL:'example-qwen'}));
  assert.equal(independentModels(same,[b]),false);
  assert.equal(independentModels(r,[b,r]),false);
  assert.equal(independentModels({...r,family:null},[b]),false);
  const target={sourceSha:'a'.repeat(40),payloadDigest:'b'.repeat(64)};
  const record={...target,kind:'model',passed:true,provider:'opencode',builder:'opencode',reviewerModel:r,builderModels:[b],reportDigest:'c'.repeat(64)};
  assert.equal(codeReviewPassed(record,target),true);
  assert.equal(codeReviewPassed({...record,reviewerModel:same},target),false);
});
test('OpenCode output must finish, cannot contain errors or invent zero-cost billing',()=>{
  const lines=[{type:'text',part:{text:'PASS\nReviewed.'}},{type:'step_finish',part:{reason:'stop',tokens:{input:10,output:5},cost:0}}];
  const parsed=parseOpenCode(lines.map(x=>JSON.stringify(x)).join('\n'));
  assert.match(parsed.text,/PASS/);assert.equal(parsed.usage.inputTokens,10);assert.equal(parsed.usage.reportedCostUSD,null);
  assert.throws(()=>parseOpenCode(JSON.stringify({type:'error',error:'example failure'})),/error/);
  assert.throws(()=>parseOpenCode(JSON.stringify({type:'text',part:{text:'done'}})),/finish/);
  assert.throws(()=>parseOpenCode('not JSON'),/JSON/);
  assert.throws(()=>parseOpenCode('',{status:0,signal:'SIGTERM'}),/interrupted/);
});
test('explicit reviewer may use its own secret without exposing builder secret',()=>{
  const env={...router,BUILDKIT_REVIEW_MODEL_PROVIDER:'zai',BUILDKIT_REVIEW_MODEL:'glm-example',BUILDKIT_REVIEW_API_KEY:'dedicated-review-value'};
  const r=resolveModel(env,'review');assert.equal(r.secret,'BUILDKIT_REVIEW_API_KEY');
  const safe=opencodeEnvironment(r,env,'/tmp/private-review-home',true);
  assert.equal(safe.BUILDKIT_ACTIVE_API_KEY,'dedicated-review-value');assert.equal(safe.OPENROUTER_API_KEY,undefined);
});
