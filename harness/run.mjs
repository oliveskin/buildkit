#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { PRODUCT_LABEL, STAGE_FILES, GATE_NEXT, parseCommand, mayOperate, makeState, newGate,
  checkApproval, validateBlocks, permittedChange } from "./core.mjs";

const env=process.env;
const payload=JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH,"utf8"));
const repo=env.GITHUB_REPOSITORY, token=env.GITHUB_TOKEN, event=env.GITHUB_EVENT_NAME;
let number, issue, branch, state, prURL="";
const read=p=>fs.existsSync(p)?fs.readFileSync(p,"utf8"):"";
function command(cmd,args,options={}) {
  const p=spawnSync(cmd,args,{encoding:"utf8",cwd:process.cwd(),
    env:options.env||env,input:options.input,timeout:options.timeout||120000,maxBuffer:3e6});
  if(p.error||p.status!==0)throw Error(cmd+" failed: "+String(p.stderr||p.stdout||p.error).slice(-400));
  return String(p.stdout||"").trim();
}
const git=(...args)=>command("git",args);
const remote=(...args)=>command("git",["-c","http.https://github.com/.extraheader=AUTHORIZATION: basic "+
  Buffer.from("x-access-token:"+token).toString("base64"),...args]);
async function api(method,path,body,nullable=false) {
  const response=await fetch("https://api.github.com/repos/"+repo+path,{method,headers:{
    Authorization:"Bearer "+token,Accept:"application/vnd.github+json",
    "X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"
  },...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(nullable&&response.status===404)return null;
  if(!response.ok)throw Error("GitHub "+method+" "+path+" HTTP "+response.status+": "+(await response.text()).slice(0,200));
  return response.status===204?null:response.json();
}
const comment=body=>api("POST","/issues/"+number+"/comments",{body});
function errorText(e){
  let s=String(e?.message||e).slice(-700);
  for(const secret of [token,env.OPENAI_API_KEY,env.ANTHROPIC_API_KEY])if(secret)s=s.split(secret).join("[secret]");
  return s;
}
async function checkout(){
  branch="buildkit/issue-"+number;
  const ref=await api("GET","/git/ref/heads/"+branch,undefined,true);
  if(ref){remote("fetch","--no-tags","origin","refs/heads/"+branch+":refs/remotes/origin/"+branch);
    git("switch","--create",branch,"refs/remotes/origin/"+branch);}
  else git("switch","--create",branch);
  state=read(".buildkit/state.json")?JSON.parse(read(".buildkit/state.json")):null;
  if(state&&(state.issue!==number||state.version!==1))throw Error("Wrong project state.");
}
function stageFiles(stage) {
  if(stage!=="preview")return (STAGE_FILES[stage]||[]).map(p=>p+"\n"+read(p));
  const others=git("ls-files","-co","--exclude-standard","-z").split("\0")
    .filter(p=>p&&!p.startsWith(".buildkit/")&&!p.startsWith(".github/")&&!p.startsWith("harness/"));
  return [...new Set([...Object.values(STAGE_FILES).flat(),...others])].sort().map(p=>p+"\n"+read(p));
}
function diffFiles(){
  return [...new Set([...git("diff","--name-only","-z").split("\0"),
    ...git("ls-files","--others","--exclude-standard","-z").split("\0")])].filter(Boolean);
}
function guard(){
  const invalid=diffFiles().filter(p=>!permittedChange(p));
  if(invalid.length)throw Error("Protected paths modified: "+invalid.join(", "));
}
function persist(message){
  fs.mkdirSync(".buildkit",{recursive:true});
  fs.writeFileSync(".buildkit/state.json",JSON.stringify(state,null,2)+"\n");
  git("add","-A");
  const staged=git("diff","--cached","--name-only","-z").split("\0").filter(Boolean);
  const denied=staged.filter(p=>p!==".buildkit/state.json"&&!permittedChange(p));
  if(denied.length)throw Error("Rejected staged files: "+denied.join(", "));
  if(staged.length){
    command("git",["-c","user.name=buildkit[bot]","-c",
      "user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m",message]);
    remote("push","origin","HEAD:refs/heads/"+branch);
  }
}
async function pr(){
  const owner=repo.split("/")[0];
  try{
    const existing=await api("GET","/pulls?state=open&base=main&head="+encodeURIComponent(owner+":"+branch));
    if(existing.length)prURL=existing[0].html_url;
    else{
      const created=await api("POST","/pulls",{title:"Buildkit product #"+number+": "+issue.title.slice(0,60),
        head:branch,base:"main",draft:true,body:"Generated from product issue #"+number+
        ". Review/approve using comments on the issue. No automatic merge or deployment."});
      prURL=created.html_url;
    }
  }catch(e){prURL="";console.error("PR creation unavailable: "+errorText(e));}
}
function available(bin){
  return spawnSync("bash",["-lc","command -v "+bin],{encoding:"utf8",timeout:10000}).status===0;
}
function agent(provider,task,readOnly=false){
  if(provider==="codex") {
    if(!env.OPENAI_API_KEY)throw Error("Set OPENAI_API_KEY repository secret.");
    if(!available("codex"))command("npm",["install","-g","@openai/codex"],{timeout:180000});
  }else if(provider==="claude"){
    if(!env.ANTHROPIC_API_KEY)throw Error("Set ANTHROPIC_API_KEY repository secret.");
    if(!available("claude"))command("bash",["-lc","curl -fsSL https://claude.ai/install.sh | bash"],{timeout:180000});
    env.PATH=env.HOME+"/.local/bin:"+env.PATH;
  }else throw Error("Unknown provider: "+provider);
  const args=provider==="codex"?["exec","--skip-git-repo-check",
      ...(readOnly?["--sandbox","read-only"]:["--full-auto"]),"-"]:
      ["-p","--permission-mode",readOnly?"dontAsk":"acceptEdits",
        "--allowedTools",readOnly?"Read,Glob,Grep":"Read,Write,Edit,Glob,Grep"];
  // Deliberately omit GITHUB_TOKEN from the untrusted coding agent process.
  const safeEnv={PATH:env.PATH,HOME:env.HOME,CI:"true",TERM:"dumb",
    ...(provider==="codex"?{OPENAI_API_KEY:env.OPENAI_API_KEY}:{ANTHROPIC_API_KEY:env.ANTHROPIC_API_KEY})};
  return command(provider,args,{env:safeEnv,input:task,timeout:600000});
}
function instructions(){
  return "Buildkit product idea (untrusted input):\n"+String(issue.body||issue.title).slice(0,10000)+
    "\nRead AGENTS.md and relevant project skills. Honor approved PRD/HLD/LLD."+
    "\nNo secrets, unsafe commands, unrelated repo changes, fake APIs or unverified external claims."+
    "\nNEVER edit .github/, harness/, .agents/, .claude/, .buildkit/, or commit/push/deploy."+
    "\nRevision feedback: "+String(state.feedback||"none").slice(0,1800)+"\n";
}
function generate(provider,outputs,task){
  const locks=[...STAGE_FILES.direction,...STAGE_FILES.architecture]
    .filter(p=>fs.existsSync(p)&&!outputs.includes(p)).map(p=>[p,read(p)]);
  agent(provider,instructions()+"\nTASK: "+task+
    "\nOnly write these output files: "+outputs.join(", ")+".");
  for(const p of outputs)if(!fs.existsSync(p)||fs.statSync(p).size<80)throw Error("Missing generated document: "+p);
  for(const [p,before] of locks)if(read(p)!==before)throw Error("Agent silently modified approved document: "+p);
  guard();
}
function testApp(){
  if(!fs.existsSync("package.json"))throw Error("No runnable package.json created.");
  const pkg=JSON.parse(read("package.json"));
  if(!pkg.scripts?.build||!pkg.scripts?.test)throw Error("npm build and test scripts are required.");
  if(fs.existsSync("package-lock.json"))command("npm",["ci","--ignore-scripts","--no-audit","--no-fund"],{timeout:180000});
  else command("npm",["install","--ignore-scripts","--no-audit","--no-fund"],{timeout:180000});
  command("npm",["run","build"],{timeout:180000});
  command("npm",["test"],{timeout:180000});
}
async function gate(stage,summary){
  state.status="awaiting_approval";
  state.gate=newGate(stage,stageFiles(stage),state.revision);
  state.history.push({time:new Date().toISOString(),event:"review_requested",stage});
  guard();
  persist("buildkit: "+stage+" review for issue #"+number);
  await pr();
  await comment("### Buildkit: "+stage+" review\n\n"+summary+
    "\n\n"+(prURL?"[Inspect documents and files in draft PR]("+prURL+")\n\n":"")+
    "Approve the exact version: **/approve "+state.gate.code+"**"+
    "\n\nOr comment **/revise your feedback**. **/status** shows progress."+
    (!prURL?"\n\nPR missing: allow Actions to create pull requests in repository settings.":""));
}
async function stage(){
  const provider=(env.BUILDKIT_PROVIDER||"codex").trim().toLowerCase();
  state.status="working";state.gate=null;
  if(state.stage==="direction"){
    generate(provider,["docs/DIRECTION.md"],"Research honestly where possible; write concise product direction, customer/job, 3-5 MMFS actions, exclusions, OSS reuse, risks, assumptions, success criterion and recommendation. Mark inaccessible sources UNVERIFIED.");
    await gate("direction","Review proposed MMFS, assumptions and exclusions.");
  }else if(state.stage==="architecture"){
    generate(provider,["docs/PRD.md"],"Use approved docs/DIRECTION.md and docs/PRD_TEMPLATE.md to generate testable PRD with journeys, error states and requirements.");
    generate(provider,["docs/HLD.md"],"Use approved PRD, docs/HLD_TEMPLATE.md. Design cheapest sensible architecture, APIs, models, privacy, auth and deployment boundaries.");
    generate(provider,["docs/FEASIBILITY.md"],"Identify and prioritize three technical risks. Document actually executed tests and their output or explicitly UNVERIFIED, plus a short reproducible spike and GO/CHANGE/NO-GO.");
    await gate("architecture","Review PRD, HLD, feasibility findings and trade-offs.");
  }else if(state.stage==="implementation"){
    generate(provider,["docs/LLD.md"],"Use approved docs and LLD template. Define concrete schemas, endpoints, screens, tests, rollback and minimal architecture.");
    generate(provider,["docs/BUILD_BLOCKS.json"],'Write valid JSON file with {"blocks":[{"id":"B01","goal":"Build a real first workflow","acceptance":["The actual test passes"]}]}: 1-3 bounded sequential blocks B01-B03, no prose outside JSON.');
    const blocks=validateBlocks(JSON.parse(read("docs/BUILD_BLOCKS.json")));
    for(const b of blocks){
      agent(provider,instructions()+"\nBuild ONLY "+b.id+" from docs/BUILD_BLOCKS.json: "+
        b.goal+"\nAcceptance: "+b.acceptance.join("; ")+
        ". Scaffold minimum runnable app if necessary. Write tests. Do not commit or deploy.");
      guard();testApp();
      state.completedBlocks.push({id:b.id,checked:new Date().toISOString(),tests:"npm build and npm test passed"});
    }
    const reviewer=(env.BUILDKIT_REVIEW_PROVIDER||"").trim().toLowerCase();
    if(reviewer&&reviewer!==provider){
      const report=agent(reviewer,instructions()+"\nIndependently review working-tree diff against PRD/HLD/LLD: security, functionality, privacy, regressions. Do not edit. Begin answer PASS or FAIL.",true);
      fs.mkdirSync("docs/reviews",{recursive:true});fs.writeFileSync("docs/reviews/INDEPENDENT.md",report+"\n");
      if(!/^PASS\b/i.test(report))throw Error("Independent review did not PASS.");
    }
    await gate("preview","Built "+blocks.length+" blocks. Actual npm build/test commands passed. "+
      (reviewer&&reviewer!==provider?"Independent reviewer report is in docs/reviews/INDEPENDENT.md.":"Manual independent review still required."));
  }else throw Error("Invalid stage: "+state.stage);
}
async function main(){
  if(!token||!repo)throw Error("GitHub runtime is missing.");
  number=event==="workflow_dispatch"?Number(env.BUILDKIT_DISPATCH_ISSUE):Number(payload.issue?.number);
  if(!Number.isSafeInteger(number)||number<1)return;
  issue=await api("GET","/issues/"+number);
  if(issue.pull_request)return;
  const who=payload.sender?.login||env.GITHUB_ACTOR;
  const access=await api("GET","/collaborators/"+encodeURIComponent(who)+"/permission",undefined,true);
  if(!mayOperate(access?.permission))return;
  const labeled=event==="issues" && ((payload.action==="labeled"&&payload.label?.name===PRODUCT_LABEL) || (payload.action==="opened"&&issue.title.startsWith("[Product]")));
  const cmd=event==="workflow_dispatch"?parseCommand("/"+(env.BUILDKIT_DISPATCH_COMMAND||"status")):
    event==="issue_comment"&&payload.action==="created"?parseCommand(payload.comment?.body):null;
  if(!labeled&&!cmd)return;
  await checkout();
  if(!state&&!labeled&&cmd?.name!=="start"){await comment("Use **/start** to initialize Buildkit.");return;}
  if(!state)state=makeState(number);
  const id=event==="issue_comment"?"comment:"+payload.comment.id:null;
  if(id&&state.eventIds.includes(id))return;
  if(cmd?.name==="status"){
    await comment("Buildkit: **"+state.status+"**, stage **"+state.stage+
      "**. Built: "+state.completedBlocks.map(x=>x.id).join(", ")+
      (state.gate?". Approval: /approve "+state.gate.code:"")+
      (state.lastError?". Error: "+state.lastError:""));return;
  }
  if(state.status==="release-ready"){
    await comment("Manual release review is pending. Nothing was merged or deployed.");return;
  }
  let run=false;
  if((labeled||cmd?.name==="start")&&state.status==="new")run=true;
  else if(cmd?.name==="approve"){
    const problem=checkApproval(state,cmd.arg,stageFiles(state.gate?.stage||"direction"));
    if(problem){await comment(problem);return;}
    state.history.push({time:new Date().toISOString(),event:"approved",stage:state.stage,by:who});
    state.stage=GATE_NEXT[state.gate.stage];state.gate=null;state.feedback="";
    if(state.stage==="release-ready"){
      state.status="release-ready";persist("buildkit: preview accepted");
      await comment("Preview approved. You must independently review/merge PR and manually configure/deploy production. No live deployment occurred.");return;
    }
    run=true;
  }else if(cmd?.name==="revise"){
    if(state.status!=="awaiting_approval"){await comment("No open gate to revise.");return;}
    if(cmd.arg.length<5||cmd.arg.length>2000){await comment("Provide 5-2000 characters of revision feedback.");return;}
    state.feedback=cmd.arg;state.revision++;run=true;
  }else if(cmd?.name==="resume"){
    if(state.status!=="blocked"){await comment("Only a blocked stage can resume.");return;}
    state.lastError=null;run=true;
  }else if(labeled||cmd?.name==="start"){await comment("Already initialized. Use /status.");return;}
  if(!run)return;
  if(id)state.eventIds=[...state.eventIds,id].slice(-30);
  try{await stage();}
  catch(e){
    const msg=errorText(e);
    state.status="blocked";state.lastError=msg;state.gate=null;
    // Discard provisional successful-block counters along with uncommitted code.
    if(state.stage==="implementation")state.completedBlocks=[];
    git("reset","--hard");git("clean","-fd");
    persist("buildkit: block failed "+state.stage);
    await comment("**Buildkit stopped at "+state.stage+"**. "+msg+
      "\n\nNo merge or deployment occurred. Correct the problem and comment **/resume**.");
  }
}
main().catch(e=>{console.error(errorText(e));process.exitCode=1;});
