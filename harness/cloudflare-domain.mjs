import {validateInfrastructurePlan} from './execution-plan.mjs';
// Domain creation is a separate post-release side effect; never touched by preview/provision.
export async function applyApprovedDomain({execution,infra,accountId,request=fetch,token}){
  validateInfrastructurePlan(infra,execution);
  const domain=infra.domain;
  if(!domain)return {changed:false,reason:'No custom domain approved'};
  if(!token||!/^[a-f0-9]{32}$/i.test(accountId||''))
    throw Error('Separate production authorization is needed to attach a custom domain.');
  if(execution.deploy.adapter!=='cloudflare-workers')
    throw Error('Custom domains require an approved Cloudflare Worker target.');
  const headers={Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'};
  async function api(method,path,body){
    const response=await request('https://api.cloudflare.com/client/v4'+path,{
      method,headers,redirect:'error',signal:AbortSignal.timeout(20000),
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    const data=await response.json().catch(()=>null);
    if(!response.ok||!data?.success)
      throw Error('Cloudflare domain preflight/update rejected (HTTP '+response.status+'). Check zone ownership, hostname conflicts and scoped permissions.');
    return data.result;
  }
  const zone=await api('GET','/zones/'+domain.zoneId);
  if(zone?.account?.id!==accountId||zone.status!=='active'||
     !(domain.hostname===zone.name||domain.hostname.endsWith('.'+zone.name)))
    throw Error('The approved domain is not within an active zone owned by the selected account.');
  const existing=await api('GET','/accounts/'+accountId+'/workers/domains?hostname='+encodeURIComponent(domain.hostname));
  const found=(Array.isArray(existing)?existing:[]).find(x=>x.hostname===domain.hostname);
  if(found){
    if(found.service!==execution.deploy.workerName||found.zone_id!==domain.zoneId)
      throw Error('Custom domain is assigned to a different Worker; no takeover permitted.');
    return {changed:false,hostname:domain.hostname,service:found.service};
  }
  const dns=await api('GET','/zones/'+domain.zoneId+'/dns_records?name='+encodeURIComponent(domain.hostname));
  if(Array.isArray(dns)&&dns.length)
    throw Error('Existing DNS record conflicts with requested Worker domain; do not overwrite it.');
  const created=await api('PUT','/accounts/'+accountId+'/workers/domains',{
    hostname:domain.hostname,service:execution.deploy.workerName,zone_id:domain.zoneId,
    enabled:true,previews_enabled:false
  });
  return {changed:true,hostname:created?.hostname||domain.hostname,service:execution.deploy.workerName};
}
