import fs from "node:fs";
import path from "node:path";

export function validWorkerName(v){return typeof v==="string"&&/^[a-z][a-z0-9-]{2,54}$/.test(v);}
export function loadWorkerConfig(root) {
  const file=path.join(root,"wrangler.json");
  if(!fs.existsSync(file))throw Error("Cloudflare web preview requires a checked-in wrangler.json (strict JSON), including a previews block.");
  const json=JSON.parse(fs.readFileSync(file,"utf8"));
  if(typeof json!=="object"||!json||Array.isArray(json))throw Error("Invalid Wrangler config");
  return json;
}
export function checkPreviewIsolation(config,approvedWorker) {
  if(!validWorkerName(approvedWorker)||config.name!==approvedWorker)
    throw Error("Worker name mismatch. Set BUILDKIT_WORKER_NAME to exactly the approved wrangler.json name.");
  if(!config.previews || typeof config.previews!=="object")
    throw Error("Missing previews configuration. Never reuse production bindings in a preview.");
  if(!config.main && !config.assets?.directory)
    throw Error("Worker needs main or assets.directory");
  for(const key of ["routes","route","triggers","send_email","unsafe","build","service_bindings","tail_consumers","workflows" ,"queues"]){
    if(config[key]!==undefined || config.previews[key]!==undefined)
      throw Error("Unsupported or production-coupled Worker setting: "+key);
  }
  // Cloudflare currently routes Preview service bindings to production Workers,
  // even when both apps have Previews. Refuse them rather than claim isolation.
  if ((config.services||[]).length || (config.previews.services||[]).length)
    throw Error("Service bindings are not Preview-isolated; use a separate staging endpoint.");
  for(const key of ["d1_databases","kv_namespaces","r2_buckets","hyperdrive","vectorize"]){
    const production=config[key]||[], preview=config.previews[key]||[];
    if(production.length && (!preview.length || production.length!==preview.length))
      throw Error("Resource "+key+" needs explicit corresponding preview bindings.");
    const label=key==="r2_buckets"?"bucket_name":key==="d1_databases"?"database_id":
      key==="kv_namespaces"?"id":key==="vectorize"?"index_name":key==="hyperdrive"?"id":"service";
    const prod=new Set(production.map(x=>x[label]).filter(Boolean));
    if(preview.some(x=>!x[label] || prod.has(x[label])))
      throw Error("Preview binding "+key+" must reference an isolated resource, never production.");
  }
  if((config.previews.vars||{}).ENVIRONMENT==="production")
    throw Error("Preview vars must not claim production.");
  if(config.previews.vars?.ENVIRONMENT!=="preview")
    throw Error("Set previews.vars.ENVIRONMENT to preview.");
  return {worker:config.name,hasDataBindings:["d1_databases","kv_namespaces","r2_buckets","hyperdrive","vectorize","services"].some(k=>(config[k]||[]).length>0)};
}
export function checkPreviewUrl(url){
  const value=new URL(url);
  if(value.protocol!=="https:" || !value.hostname.endsWith(".workers.dev") ||
    !/^[a-z0-9.-]+$/.test(value.hostname) || value.username || value.password ||
    value.port || value.pathname!=="/" || value.search || value.hash)
    throw Error("Preview URL is not a valid Cloudflare workers.dev root.");
  return value.origin;
}
export function parsePreviewOutput(data){
  const info=typeof data==="string"?JSON.parse(data):data;
  const urls=info?.preview?.urls;
  if(!Array.isArray(urls)||!urls.length)throw Error("Wrangler did not provide a preview URL.");
  return checkPreviewUrl(urls[0]);
}
export function verifyBrowserResults(result,expectedUrl){
  if(result?.schema!==1||result.previewUrl!==checkPreviewUrl(expectedUrl)||
    result.httpStatus<200||result.httpStatus>=400 || result.screenshot!==true ||
    result.pageErrors!==0 || result.behaviouralTestsPassed!==true)
    throw Error("Preview cannot be approved without successful HTTP, screenshot, browser and behavioural evidence.");
  return true;
}
