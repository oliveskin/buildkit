import {executionDigest} from './execution-plan.mjs';
import {resolvedBindings} from './cloudflare-provision.mjs';
const groups=['d1_databases','kv_namespaces','r2_buckets'];
const simplify=v=>JSON.stringify([...v].map(x=>Object.fromEntries(Object.entries(x).sort())).sort((a,b)=>a.binding.localeCompare(b.binding)));
export function verifyProvisionedBindings({execution,infrastructure,ledger,wrangler}){
  if(execution.deploy.adapter!=='cloudflare-workers')
    throw Error('Cannot apply Cloudflare bindings to a non-Cloudflare architecture.');
  if(!wrangler||wrangler.name!==execution.deploy.workerName)
    throw Error('Wrangler Worker name does not match the approved HLD execution plan.');
  if(infrastructure.resources.length){
    if(!ledger||ledger.provider!=='cloudflare' ||
      ledger.sourcePlanDigest!==executionDigest(infrastructure) ||
      ledger.resources?.length!==infrastructure.resources.length)
      throw Error('No matching, executed provisioning receipt for approved bindings.');
  }
  const expected=resolvedBindings(ledger||{resources:[]});
  for(const key of groups){
    const prod=wrangler[key]||[],preview=wrangler.previews?.[key]||[];
    if(simplify(prod)!==simplify(expected.production[key]||[])||
       simplify(preview)!==simplify(expected.previews[key]||[]))
      throw Error('Worker '+key+' bindings differ from approved resource-provisioning receipt.');
  }
  return true;
}
