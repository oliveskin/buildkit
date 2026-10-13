import {digest,STAGE_FILES} from './core.mjs';
// Cache metadata never contains the search credential or a credential-derived hash.
export function researchCacheKey(state,env) {
  return digest({brief:state.brief,notes:state.researchNotes||'',
    endpoint:env.BUILDKIT_SEARCH_ENDPOINT||'',hasSearchKey:!!env.BUILDKIT_SEARCH_KEY,
    revision:env.BUILDKIT_RESEARCH_REVISION||''});
}
export function shouldRefreshResearch(state,env,evidence,{retry=false}={}) {
  return !evidence || !state.researchCacheFingerprint ||
    state.researchCacheFingerprint!==researchCacheKey(state,env) ||
    (retry&&state.stage==='direction'&&((evidence.failures||[]).length>0||(evidence.gaps||[]).length>0));
}
export function invalidateFrom(state,stage,{actor,reason,at=new Date().toISOString()}={}) {
  if(!['direction','architecture','implementation'].includes(stage))throw Error('Invalid revision boundary.');
  if(['deploy_pending','awaiting_preview'].includes(state.status)||state.stage==='deploying')
    throw Error('Wait for the active preview/release workflow before invalidating its inputs.');
  const levels=['direction','architecture','implementation'],index=levels.indexOf(stage);
  const files=levels.slice(index).flatMap(s=>STAGE_FILES[s]);
  files.push(...STAGE_FILES.release,'docs/reviews/INDEPENDENT.md','docs/security/CODE_REVIEW.json');
  if(stage==='direction')files.push('docs/research/SOURCES.md');
  const invalidated=Object.keys(state.approvedDocs||{}).filter(p=>files.includes(p));
  for(const p of invalidated)delete state.approvedDocs[p];
  for(const key of ['planDigest','preview','previewSourceSha','previewReviewedBy','codeReview','codeReviewRequest',
    'complianceReview','complianceProfileDigest','security','modelReview','releaseRequest','releaseApprovedBy',
    'releaseApprovedDigest','releaseResult','dispatch','finalEvidence'])delete state[key];
  state.completedBlocks=[];state.gate=null;state.lastError=null;state.stage=stage;state.status='new';
  state.revision=(state.revision||0)+1;
  if(stage==='direction')delete state.researchCacheFingerprint;
  state.history.push({event:'outputs_invalidated',stage,by:actor,reason,at,invalidated});
  return [...new Set(files)];
}
