#!/usr/bin/env node
// Build in a credential-free snapshot; publish only a self-contained, hashed payload.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {cleanEnv} from './core.mjs';
import {makeTestSnapshot,containerArgs} from './security.mjs';
import {assertClean,trackedFiles} from './security-gate.mjs';
import {checkPreviewIsolation,checkPreviewUrl} from './cloudflare.mjs';
const hash=data=>createHash('sha256').update(data).digest('hex');
const shaPattern=/^[0-9a-f]{40}$/;
const digestPattern=/^[0-9a-f]{64}$/;
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
export function safeRelative(value) {
  if(typeof value!=='string'||!value||value.includes('\\')||value.includes('\0')||
     path.posix.isAbsolute(value)||value.split('/').some(p=>!p||p==='..'||p==='.')||/[\r\n]/.test(value))
    throw Error('Unsafe artifact path.');
  return value;
}
export function fileInventory(root) {
  const files=[];let bytes=0;
  function walk(dir,prefix='') {
    for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const name=prefix+entry.name, full=path.join(dir,entry.name),stat=fs.lstatSync(full);
      safeRelative(name);
      if(stat.isSymbolicLink())throw Error('Artifact symlink rejected: '+name);
      if(stat.isDirectory()){walk(full,name+'/');continue;}
      if(!stat.isFile())throw Error('Non-file artifact entry: '+name);
      if(/(^|\/)(\.git|node_modules|\.env[^/]*|\.dev\.vars[^/]*|\.npmrc|package(?:-lock)?\.json)(\/|$)/i.test(name))
        throw Error('Artifact must contain deployable output, not dependencies or credentials: '+name);
      bytes+=stat.size;
      if(files.length>=10000||bytes>150_000_000)throw Error('Artifact size/file-count limit exceeded.');
      files.push({path:name,size:stat.size,sha256:hash(fs.readFileSync(full))});
    }
  }
  if(!fs.existsSync(root)||!fs.lstatSync(root).isDirectory())throw Error('Deployment directory missing.');
  walk(root);return files.sort((a,b)=>a.path.localeCompare(b.path));
}
function configPolicy(config) {
  const copy=structuredClone(config);
  delete copy.main;delete copy.no_bundle;delete copy.$schema;
  if(copy.assets)delete copy.assets.directory;
  return JSON.stringify(sortObject(copy));
}
function sortObject(v) {
  if(Array.isArray(v))return v.map(sortObject);
  if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,sortObject(v[k])]));
  return v;
}
export function validatePayload(root,approvedConfig) {
  const config=readJson(path.join(root,'wrangler.json'));
  checkPreviewIsolation(config,approvedConfig.name);
  if(configPolicy(config)!==configPolicy(approvedConfig))throw Error('Built configuration changed approved runtime settings or bindings.');
  if(config.no_bundle!==true)throw Error('Built deployment config must set no_bundle:true.');
  const denied=['build','env','legacy_env','site','migrations','containers','assetsConfig','alias','define','tsconfig'];
  for(const k of denied)if(config[k]!==undefined||config.previews?.[k]!==undefined)throw Error('Build-time or unsupported deployment configuration: '+k);
  for(const k of ['main','assets','no_bundle','rules','base_dir','find_additional_modules'])
    if(config.previews?.[k]!==undefined)throw Error('Preview cannot substitute application output: '+k);
  const files=fileInventory(root),names=new Set(files.map(f=>f.path));
  if(config.main){
    const main=safeRelative(config.main);
    if(!names.has(main)||!/\.(m?js)$/.test(main))throw Error('Built Worker entry must be a local prebundled JavaScript file.');
  }
  if(config.base_dir)safeRelative(config.base_dir);
  if(config.assets){
    const assets=safeRelative(config.assets.directory);
    if(!files.some(f=>f.path.startsWith(assets+'/')))throw Error('Built static assets are missing.');
  }
  assertClean(root,files.map(f=>f.path));
  return {config,files};
}
export function verifyArtifact(directory,{sourceSha,worker,expectedDigest,approvedConfig}={}) {
  const manifest=readJson(path.join(directory,'manifest.json'));
  if(manifest.schema!==1||!shaPattern.test(manifest.sourceSha||'')||!digestPattern.test(manifest.payloadDigest||''))throw Error('Invalid artifact manifest.');
  if(sourceSha&&manifest.sourceSha!==sourceSha)throw Error('Artifact is from another source commit.');
  if(worker&&manifest.worker!==worker)throw Error('Artifact targets another Worker.');
  const files=fileInventory(path.join(directory,'payload'));
  const actual=hash(JSON.stringify(files));
  if(actual!==manifest.payloadDigest||JSON.stringify(files)!==JSON.stringify(manifest.files))throw Error('Artifact bytes changed.');
  if(expectedDigest&&actual!==expectedDigest)throw Error('Artifact differs from browser-reviewed bytes.');
  const cfg=readJson(path.join(directory,'payload/wrangler.json'));
  validatePayload(path.join(directory,'payload'),approvedConfig||manifest.approvedConfig);
  if(cfg.name!==manifest.worker||hash(JSON.stringify(sortObject(manifest.approvedConfig)))!==manifest.configDigest)
    throw Error('Artifact configuration identity mismatch.');
  if(approvedConfig&&hash(JSON.stringify(sortObject(approvedConfig)))!==manifest.configDigest)throw Error('Approved config changed since artifact build.');
  return manifest;
}
function output(name,value){
  if(/[\r\n]/.test(String(value)))throw Error('Invalid workflow output.');
  fs.appendFileSync(process.env.GITHUB_OUTPUT,name+'='+value+'\n');
}
function build() {
  const env=process.env,root=path.resolve(env.BUILDKIT_APP_PATH||'app');
  const destination=path.resolve(env.BUILDKIT_ARTIFACT_PATH||'deploy-artifact');
  const sourceSha=env.BUILDKIT_CANDIDATE_SHA,worker=env.BUILDKIT_WORKER_NAME;
  if(!shaPattern.test(sourceSha||''))throw Error('Exact candidate SHA required.');
  const safe=cleanEnv(env);
  const git=(...args)=>execFileSync('git',args,{cwd:root,env:safe,encoding:'utf8'}).trim();
  if(git('rev-parse','HEAD')!==sourceSha)throw Error('Wrong source checkout.');
  const approvedConfig=readJson(path.join(root,'wrangler.json'));
  checkPreviewIsolation(approvedConfig,worker);
  const packageInfo=readJson(path.join(root,'package.json'));
  const outputPath=safeRelative(packageInfo.buildkit?.deploymentDirectory||'dist/buildkit');
  if(!outputPath.startsWith('dist/'))throw Error('Build output must be within dist/.');
  if(!packageInfo.scripts?.build||!packageInfo.scripts?.test||!fs.existsSync(path.join(root,'package-lock.json')))
    throw Error('Locked npm install, build and test scripts required.');
  if(fs.existsSync(destination))throw Error('Refusing to overwrite existing artifact directory.');
  const snapshot=makeTestSnapshot(root,trackedFiles(root)),logs=[];
  try {
    execFileSync('docker',['pull','node:22-bookworm-slim'],{env:safe,timeout:180000,stdio:'pipe'});
    for(const [args,network] of [
      [['npm','ci','--ignore-scripts','--no-audit','--no-fund'],true],
      [['npm','audit','--omit=dev','--audit-level=high'],true],
      [['npm','run','build'],false],[['npm','test'],false]]) {
      const result=execFileSync('docker',containerArgs(snapshot,args,network),{env:safe,encoding:'utf8',timeout:240000,maxBuffer:8e6});
      logs.push('$ '+args.join(' ')+'\n'+result+'\nExit: 0');
    }
    const built=path.join(snapshot,outputPath);
    const {files}=validatePayload(built,approvedConfig);
    fs.mkdirSync(path.join(destination,'payload'),{recursive:true});
    for(const file of files){
      const target=path.join(destination,'payload',file.path);
      fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(built,file.path),target);fs.chmodSync(target,0o644);
    }
    const manifest={schema:1,sourceSha,worker,files,payloadDigest:hash(JSON.stringify(files)),
      configDigest:hash(JSON.stringify(sortObject(approvedConfig))),approvedConfig,
      lockDigest:hash(fs.readFileSync(path.join(root,'package-lock.json'))),builtAt:new Date().toISOString()};
    fs.writeFileSync(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    // Raw build output stays in the secret-free job log, not in a public source commit.
    fs.writeFileSync(path.join(destination,'build.log'),logs.join('\n\n'));
    verifyArtifact(destination,{sourceSha,worker,approvedConfig});
    output('payload_digest',manifest.payloadDigest);
  } finally {fs.rmSync(snapshot,{recursive:true,force:true});}
}
async function publish(kind) {
  const env=process.env,dir=path.resolve(env.BUILDKIT_ARTIFACT_PATH||'deploy-artifact');
  const manifest=verifyArtifact(dir,{sourceSha:env.BUILDKIT_CANDIDATE_SHA,worker:env.BUILDKIT_WORKER_NAME,expectedDigest:env.BUILDKIT_ARTIFACT_DIGEST});
  if(!env.CLOUDFLARE_API_TOKEN||!env.CLOUDFLARE_ACCOUNT_ID)throw Error('Cloudflare authorization missing.');
  const args=kind==='preview'?['preview','--name','bk-issue-'+env.BUILDKIT_ISSUE_NUMBER,'--json','--ignore-base-config']:
    ['deploy','--no-bundle'];
  if(kind==='preview'&&!/^[1-9][0-9]*$/.test(env.BUILDKIT_ISSUE_NUMBER||''))throw Error('Invalid preview issue.');
  const result=execFileSync('wrangler',[...args,'--config',path.join(dir,'payload/wrangler.json')],{
    cwd:path.join(dir,'payload'),env:{...cleanEnv(env),CLOUDFLARE_API_TOKEN:env.CLOUDFLARE_API_TOKEN,
      CLOUDFLARE_ACCOUNT_ID:env.CLOUDFLARE_ACCOUNT_ID,WRANGLER_SEND_METRICS:'false'},encoding:'utf8',timeout:240000,maxBuffer:4e6});
  let url;
  if(kind==='preview')url=JSON.parse(result)?.preview?.urls?.[0];
  else url=(result.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\b/g)||[]).find(u=>new URL(u).hostname.startsWith(manifest.worker+'.'));
  url=checkPreviewUrl(url||'');
  if(kind==='production'){
    const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('Production HTTP verification failed: '+response.status);
  }
  output(kind==='preview'?'preview_url':'production_url',url);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const action=process.argv[2];
  if(action==='build')build();
  else if(action==='verify')verifyArtifact(path.resolve(process.env.BUILDKIT_ARTIFACT_PATH||'deploy-artifact'),{
    sourceSha:process.env.BUILDKIT_CANDIDATE_SHA,worker:process.env.BUILDKIT_WORKER_NAME,expectedDigest:process.env.BUILDKIT_ARTIFACT_DIGEST});
  else if(action==='preview'||action==='production')await publish(action);
  else throw Error('Expected build, verify, preview or production.');
}
