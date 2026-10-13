import {createHash} from "node:crypto";
import {safeSourceUrl} from "./research.mjs";

const allowedKinds=new Set(["https_read","github_repository","hf_model","node_test"]);
const inputId=id=>/^[A-Z][A-Z0-9-]{1,28}$/.test(id||"");
export function verifySpikePlan(plan) {
  if(plan?.schema!==1||!Array.isArray(plan.probes)||plan.probes.length<1||plan.probes.length>5)
    throw Error("spikes/plan.json needs 1-5 executable probes.");
  const ids=new Set();
  for(const p of plan.probes) {
    if(!inputId(p.id)||ids.has(p.id)||!allowedKinds.has(p.kind)||typeof p.risk!=="string"||p.risk.trim().length<12)
      throw Error("Invalid feasibility probe metadata");
    ids.add(p.id);
    if(p.critical!==true && p.critical!==false)throw Error("Probe critical must be boolean.");
    if(["https_read","github_repository","hf_model"].includes(p.kind) && !safeSourceUrl(p.url))
      throw Error("Probe URL must be a public HTTPS URL");
    if(p.kind==="github_repository"&&!/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(p.url))
      throw Error("GitHub probe needs a repository URL");
    if(p.kind==="hf_model"&&!/^https:\/\/huggingface\.co\/[^/]+\/[^/]+\/?$/.test(p.url))
      throw Error("HF probe needs a model URL");
    if(p.kind==="node_test"&&!/^spikes\/[a-zA-Z0-9_-]+\.test\.mjs$/.test(p.file||""))
      throw Error("Node spike must be in spikes/name.test.mjs");
    if(p.expectedText && (typeof p.expectedText!=="string"||p.expectedText.length>120))
      throw Error("Invalid expectedText");
  }
  if(!plan.probes.some(x=>x.critical))throw Error("Mark at least one critical technical hypothesis.");
  return plan.probes;
}
export function allowedProbeHost(url, custom="") {
  const u=new URL(url), host=u.hostname.toLowerCase();
  const permitted=["api.github.com","huggingface.co","developers.cloudflare.com",
    ...String(custom).split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)];
  return u.protocol==="https:"&&permitted.includes(host) && !u.username&&!u.password && !u.port;
}
const brief=s=>String(s||"").replace(/[\r\n\t]+/g," ").slice(0,250);
export async function executeSpikes(plan,{request=fetch,runNodeTest=async()=>{throw Error("Test runner not configured");},
  customHosts="",now=new Date().toISOString()}={}) {
  const probes=verifySpikePlan(plan),results=[];
  for(const p of probes) {
    const started=Date.now();
    let outcome="FAIL",evidence="";
    try{
      if(p.kind==="node_test"){
        const output=await runNodeTest(p.file);
        if(!output?.passed)throw Error(brief(output?.error||"Node tests did not pass"));
        evidence=brief(output.output||"Node --test exited 0");
      } else {
        let url=p.url;
        if(p.kind==="github_repository")
          url="https://api.github.com/repos/"+p.url.replace("https://github.com/","").replace(/\/$/,"");
        if(p.kind==="hf_model")url="https://huggingface.co/api/models/"+p.url.replace("https://huggingface.co/","");
        if(!allowedProbeHost(url,customHosts))throw Error("Host not explicitly approved for probe");
        const response=await request(url,{redirect:"error",headers:{Accept:"application/json,text/plain,text/html"},
          signal:AbortSignal.timeout(7000)});
        const body=(await response.text()).slice(0,12000);
        if(response.status!==(p.expectedStatus||200))throw Error("HTTP "+response.status);
        if(p.expectedText && !body.includes(p.expectedText))throw Error("Expected response text absent");
        evidence="HTTP "+response.status+"; content sha256="+createHash("sha256").update(body).digest("hex");
      }
      outcome="PASS";
    }catch(e){evidence=brief(e?.message||e);}
    results.push({id:p.id,kind:p.kind,risk:p.risk,critical:p.critical,outcome,
      evidence,at:now,elapsedMs:Math.max(0,Date.now()-started)});
  }
  const criticalFailures=results.filter(x=>x.critical&&x.outcome!=="PASS");
  return {schema:1,at:now,results,decision:criticalFailures.length?"BLOCK":"GO",
    blockers:criticalFailures.map(x=>x.id+": "+x.evidence)};
}
