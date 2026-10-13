// Total blocks are defined by the approved product, not a hard-coded 1-3 limit.
// Limit only how much a single Actions run executes, then checkpoint and continue.
const blockId=/^B[0-9]{2,}$/;
export const BLOCKS_PER_RUN=2;
export function validateBlocks(payload,requirements=[]){
  if(!Array.isArray(payload?.blocks)||payload.blocks.length===0)
    throw Error('Build plan needs at least one testable block.');
  const ids=new Set(),seen=new Map();
  for(const [index,b] of payload.blocks.entries()){
    if(!b||!blockId.test(b.id||'')||ids.has(b.id)||typeof b.goal!=='string'||b.goal.trim().length<12||
       !Array.isArray(b.acceptance)||!b.acceptance.length||
       b.acceptance.some(x=>typeof x!=='string'||!x.trim())||
       (b.dependsOn!==undefined&&!Array.isArray(b.dependsOn))||
       (b.requirements!==undefined&&!Array.isArray(b.requirements)))
      throw Error('Invalid or duplicate build-block definition at index '+index);
    const dependencies=b.dependsOn||[],covered=b.requirements||[];
    if(dependencies.some(x=>!blockId.test(x)||x===b.id)||new Set(dependencies).size!==dependencies.length||
       covered.some(x=>!/^FR-[0-9]{2,}$/.test(x))||new Set(covered).size!==covered.length)
      throw Error('Invalid block dependency or requirement traceability: '+b.id);
    ids.add(b.id);seen.set(b.id,b);
  }
  const marks=new Map();
  function walk(id){
    const mark=marks.get(id);
    if(mark===1)throw Error('Cyclic block dependency around '+id);
    if(mark===2)return;
    marks.set(id,1);
    for(const dep of seen.get(id).dependsOn||[]){
      if(!seen.has(dep))throw Error('Unknown block dependency '+dep);
      walk(dep);
    }
    marks.set(id,2);
  }
  for(const id of ids)walk(id);
  const required=new Set(requirements);
  if(required.size){
    const mapped=new Set(payload.blocks.flatMap(x=>x.requirements||[]));
    const missing=[...required].filter(x=>!mapped.has(x));
    const unknown=[...mapped].filter(x=>!required.has(x));
    if(missing.length||unknown.length)throw Error('Requirement coverage mismatch. Missing: '+
      missing.join(',')+'; unknown: '+unknown.join(','));
  }
  return payload.blocks;
}
export function readyBlocks(blocks,completed=[],limit=BLOCKS_PER_RUN){
  if(!Number.isInteger(limit)||limit<1||limit>3)throw Error('One run must have a small bounded workload.');
  const done=new Set(completed.map(x=>typeof x==='string'?x:x.id));
  const ready=[];
  const next=new Set(done);
  for(const b of blocks){
    if(next.has(b.id))continue;
    if((b.dependsOn||[]).every(x=>next.has(x))){
      ready.push(b);next.add(b.id);if(ready.length===limit)break;
    }
  }
  return ready;
}
export function remainingBlocks(blocks,completed=[]){
  const done=new Set(completed.map(x=>typeof x==='string'?x:x.id));
  return blocks.filter(b=>!done.has(b.id));
}
