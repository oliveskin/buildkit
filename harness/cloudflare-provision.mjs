import {createHash} from 'node:crypto';
import {validateInfrastructurePlan,executionDigest} from './execution-plan.mjs';

// Bounded, explicit Cloudflare resource creation. No shell, SQL execution, DNS, deletion or payment changes.
export function resourceNamespace(repo,issue){
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo||'') ||
     !Number.isSafeInteger(issue)||issue<1)throw Error('Invalid product identity for provisioning.');
  return 'bk-'+createHash('sha256').update(repo+'#'+issue).digest('hex').slice(0,10)+'-';
}
export function assertScopedResources(infra,repo,issue){
  const namespace=resourceNamespace(repo,issue);
  for(const r of infra.resources){
    if(r.mode==='create' && (![r.productionName,r.previewName].every(x=>x.startsWith(namespace))))
      throw Error('Provisioning names must be scoped to '+namespace+' to prevent collisions with unrelated products.');
  }
  return namespace;
}
const paths={
  d1:'/d1/database',
  kv:'/storage/kv/namespaces',
  r2:'/r2/buckets'
};
function existingItems(kind,response){
  if(kind==='r2')return response?.buckets||[];
  return Array.isArray(response)?response:[];
}
function title(kind,row){return kind==='kv'?row.title:row.name;}
function itemId(kind,row){return kind==='d1'?row.uuid:kind==='kv'?row.id:row.name;}
export function cfAPI({accountId,token,request=fetch}={}){
  if(!/^[a-f0-9]{32}$/i.test(accountId||'')||!token)
    throw Error('A Cloudflare account ID and narrowly scoped provisioning token are required.');
  return async(method,path,body)=>{
    if(!['GET','POST','PUT'].includes(method)||!path.startsWith('/'))throw Error('Cloudflare API operation not allowed.');
    const response=await request('https://api.cloudflare.com/client/v4/accounts/'+accountId+path,{
      method,headers:{Authorization:'Bearer '+token,Accept:'application/json',
        ...(body===undefined?{}:{'Content-Type':'application/json'})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(20000)
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok||!data?.success)throw Error('Cloudflare '+method+' '+path+' failed HTTP '+response.status+
      '. Check permissions and resource quotas (never paste tokens in the issue).');
    return data.result;
  };
}
async function lookup(api,kind,name){
  const endpoint=paths[kind];if(!endpoint)throw Error('Unsupported Cloudflare resource.');
  for(let page=1;page<=10;page++){
    const result=await api('GET',endpoint+'?page='+page+'&per_page=100');
    const rows=existingItems(kind,result);
    const found=rows.find(x=>title(kind,x)===name);
    if(found)return found;
    if(rows.length<100)break;
  }
  return null;
}
async function ensureResource(api,r,environment,namespace){
  const name=environment==='preview'?r.previewName:r.productionName;
  const expectedId=environment==='preview'?r.previewId:r.productionId;
  let found=await lookup(api,r.kind,name);
  if(found){
    const id=itemId(r.kind,found);
    if(r.mode==='reuse' && String(id)!==String(expectedId))
      throw Error('Requested reuse '+r.id+' is not the approved resource identifier.');
    // On a retry a resource may already exist because Cloudflare accepted an earlier create.
    // Adopt only a deterministic Buildkit namespace and the exact user-approved name.
    if(r.mode==='create'&&!name.startsWith(namespace))
      throw Error('An existing resource outside Buildkit namespace cannot be adopted.');
    return {id,name,environment,kind:r.kind,binding:r.binding,reconciled:true};
  }
  if(r.mode==='reuse')throw Error('Approved existing '+r.kind+' resource is missing: '+name);
  const payload=r.kind==='kv'?{title:name}:{name};
  let created;
  try {created=await api('POST',paths[r.kind],payload);}
  catch(err){
    // Resolve ambiguous API timeouts without creating a duplicate.
    found=await lookup(api,r.kind,name);
    if(!found)throw err;
    created=found;
  }
  const id=itemId(r.kind,created)||itemId(r.kind,await lookup(api,r.kind,name));
  if(!id)throw Error('Cloudflare did not return the new '+r.kind+' resource identifier.');
  return {id,name,environment,kind:r.kind,binding:r.binding,reconciled:false};
}
export async function provisionCloudflare({execution,infra,repo,issue,accountId,api}){
  validateInfrastructurePlan(infra,execution);
  if(infra.provider!=='cloudflare')throw Error('No Cloudflare provisioning was approved.');
  const namespace=assertScopedResources(infra,repo,issue);
  if(typeof api!=='function')throw Error('Cloudflare API client required.');
  const resources=[];
  for(const r of infra.resources){
    // Create preview FIRST. If production creation fails, no production code was deployed.
    const preview=await ensureResource(api,r,'preview',namespace);
    const production=await ensureResource(api,r,'production',namespace);
    resources.push({id:r.id,kind:r.kind,binding:r.binding,
      preview:{id:preview.id,name:preview.name},production:{id:production.id,name:production.name},
      reconciliation:{preview:preview.reconciled,production:production.reconciled}});
  }
  return {schema:1,provider:'cloudflare',sourcePlanDigest:executionDigest(infra),
    accountFingerprint:createHash('sha256').update(accountId).digest('hex'),
    resources,domain:infra.domain?{status:'deferred-to-approved-release',
      hostname:infra.domain.hostname,zoneId:infra.domain.zoneId}:null,
    provisionedAt:new Date().toISOString()};
}
// Only deterministic bindings can be fed to Wrangler. No token values are ever returned.
export function resolvedBindings(ledger){
  const cfg={production:{},previews:{}};
  for(const r of ledger.resources||[]){
    const key=r.kind==='d1'?'d1_databases':r.kind==='kv'?'kv_namespaces':'r2_buckets';
    const val=(x)=>r.kind==='d1'?{binding:r.binding,database_name:x.name,database_id:x.id}:
      r.kind==='kv'?{binding:r.binding,id:x.id}:
      {binding:r.binding,bucket_name:x.name};
    (cfg.production[key]||=[]).push(val(r.production));
    (cfg.previews[key]||=[]).push(val(r.preview));
  }
  return cfg;
}
