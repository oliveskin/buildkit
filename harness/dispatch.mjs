// Durable, retryable workflow requests. The source/approval SHA never changes on retry.
export function workflowRequest(kind,sha,issue,ref){
  if(!['preview','release'].includes(kind)||!/^[0-9a-f]{40}$/.test(sha||'')||!Number.isSafeInteger(issue)||issue<1||!ref)
    throw Error('Invalid workflow request.');
  return {kind,sha,issue,ref,workflow:'buildkit-'+kind+'.yml',
    title:'Buildkit '+kind+' #'+issue+' @'+sha,createdAt:new Date().toISOString()};
}
export async function dispatchStatus(request,api){
  const response=await api('GET','/actions/workflows/'+request.workflow+'/runs?event=workflow_dispatch&per_page=100');
  const matches=(response.workflow_runs||[]).filter(r=>r.display_title===request.title);
  return matches.sort((a,b)=>Number(b.id)-Number(a.id))[0]||null;
}
export async function sendWorkflow({state,request,api,persist,comment,retry=false}){
  if(retry){
    const previous=await dispatchStatus(request,api);
    if(previous&&previous.status!=='completed'){
      await comment('The existing '+request.kind+' run is still active: '+previous.html_url+'. No duplicate was dispatched.');
      return false;
    }
    if(previous?.conclusion==='success'){
      await comment('The existing workflow completed successfully: '+previous.html_url+'. Check its finalization record; a successful run will not be dispatched twice.');
      return false;
    }
    if(!previous&&state.dispatch?.attemptAt&&Date.now()-Date.parse(state.dispatch.attemptAt)<60000){
      await comment('The last dispatch may still be appearing in Actions. No duplicate was sent. Use /resume after the dispatch visibility window.');
      return false;
    }
  }
  state.status=request.kind==='release'?'deploy_pending':'awaiting_preview';
  state.lastError=null;
  state.dispatch={...request,status:'sending',attemptAt:new Date().toISOString(),attempts:(state.dispatch?.attempts||0)+1};
  if(request.kind==='release')state.releaseRequest=request;
  else state.previewRequest=request;
  // Persist the outbox before the network call. Crashes cannot lose the request.
  persist('buildkit: dispatch '+request.kind+' request');
  const inputs={issue_number:String(request.issue),[request.kind==='release'?'approved_sha':'candidate_sha']:request.sha};
  try{
    await api('POST','/actions/workflows/'+request.workflow+'/dispatches',{ref:request.ref,inputs});
    await comment('Dispatched '+request.kind+' for the original approved version `'+request.sha+'`. Use /status to inspect it.');
    return true;
  }catch(e){
    // A timeout can occur after GitHub accepted the request; retries first reconcile runs.
    state.status='blocked';state.dispatch.status='uncertain';
    state.lastError=request.kind+' dispatch failed or is uncertain. Check Actions, then /resume; the same request will be reconciled before retry.';
    persist('buildkit: recoverable '+request.kind+' dispatch failure');
    await comment('**Buildkit blocked:** '+state.lastError).catch(()=>{});
    throw Error(state.lastError);
  }
}
