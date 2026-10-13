import {createHash} from "node:crypto";

const STOP = new Set("a an the to for and or with from that this is i we they product app software using build want need helps help into on it my an ai of by users user small simple please create at as in".split(" "));
const cut = (x,n=480)=>String(x||"").replace(/[\x00-\x1f]+/g," ").slice(0,n);
export function researchQuery(brief) {
  const words=String(brief||"").toLowerCase().match(/[a-z][a-z0-9-]{2,}/g)||[];
  return [...new Set(words.filter(w=>!STOP.has(w)))].slice(0,6).join(" ") || "web application";
}
export function safeSourceUrl(raw) {
  try {
    const u=new URL(raw);
    if(u.protocol!=="https:" || u.username || u.password || u.port || u.hostname.length>180) return null;
    if(/^(localhost|.*\.(local|internal|localhost|test)|\d+\.\d+\.\d+\.\d+|\[.*\])$/i.test(u.hostname))return null;
    return u.href;
  }catch{return null;}
}
// User-supplied URLs are untrusted. Fetch from well-known public hosts only;
 // arbitrary URLs may point to private networks through controlled DNS.
export function acceptableExternalSource(url) {
  const u=safeSourceUrl(url);
  if(!u)return false;
  const host=new URL(u).hostname.toLowerCase();
  return ["github.com","raw.githubusercontent.com","huggingface.co","developers.cloudflare.com",
    "docs.github.com","docs.python.org","developer.mozilla.org","npmjs.com",
    "news.ycombinator.com","arxiv.org","openreview.net","cloudflare.com"].includes(host);
}
export function normalizeEvidence(records, timestamp=new Date().toISOString()) {
  const seen=new Set(), out=[];
  for(const record of records) {
    const url=safeSourceUrl(record.url);
    if(!url||seen.has(url))continue;
    seen.add(url);
    const excerpt=cut(record.excerpt,420);
    if(excerpt.length<8)continue;
    out.push({
      id:"E-"+String(out.length+1).padStart(3,"0"),category:record.category,
      title:cut(record.title,150),url,excerpt,retrievedAt:timestamp,
      facts:record.facts||{},sha256:createHash("sha256").update(url+"\n"+excerpt).digest("hex")
    });
  }
  return out.slice(0,30);
}
async function getJson(url,{request,headers={},timeout=8000}) {
  const res=await request(url,{headers:{Accept:"application/json",...headers},redirect:"error",
    signal:AbortSignal.timeout(timeout)});
  if(!res.ok)throw Error("HTTP "+res.status);
  const raw=await res.text();
  if(raw.length>500000)throw Error("Response too large");
  return JSON.parse(raw);
}
export async function collectResearch(brief,{request=fetch,githubToken="",searchEndpoint="",searchKey="",userLinks=[],now=new Date().toISOString()}={}) {
  const q=researchQuery(brief), records=[], failures=[];
  const jobs=[
    async()=>{
      const data=await getJson("https://api.github.com/search/repositories?q="+encodeURIComponent(q)+"&sort=stars&per_page=5",
        {request,headers:githubToken?{Authorization:"Bearer "+githubToken}:{}});
      for(const r of data.items||[])records.push({category:"oss",title:r.full_name,url:r.html_url,
        excerpt:cut(r.description||"Public repository")+"; licence: "+(r.license?.spdx_id||"UNVERIFIED")+
          "; last pushed: "+(r.pushed_at||"UNVERIFIED"),
        facts:{licence:r.license?.spdx_id||null,stars:r.stargazers_count||0,updatedAt:r.pushed_at||null,archived:Boolean(r.archived)}});
    },
    async()=>{
      const data=await getJson("https://huggingface.co/api/models?search="+encodeURIComponent(q)+"&limit=5",
        {request});
      for(const m of Array.isArray(data)?data:[])records.push({category:"model",
        title:m.id,url:"https://huggingface.co/"+m.id,
        excerpt:"Hugging Face model "+m.id+"; tags: "+cut((m.tags||[]).slice(0,10).join(", "),250)+
          "; last modified: "+(m.lastModified||"UNVERIFIED"),
        facts:{license:(m.tags||[]).find(t=>t.startsWith("license:"))||null,updatedAt:m.lastModified||null,downloads:m.downloads||0}});
    },
    async()=>{
      // Public search index. HN comments are qualitative examples, NOT validation of demand.
      const data=await getJson("https://hn.algolia.com/api/v1/search?query="+encodeURIComponent(q)+
        "&tags=comment&hitsPerPage=5",{request});
      for(const h of data.hits||[]){
        if(!h.objectID)continue;
        const excerpt=cut(String(h.comment_text||"").replace(/<[^>]*>/g," "),420);
        if(excerpt.length<8)continue;
        records.push({category:"market",title:cut(h.story_title||"HN discussion",150),
          url:"https://news.ycombinator.com/item?id="+encodeURIComponent(h.objectID),
          excerpt,facts:{kind:"anecdotal discussion",createdAt:h.created_at||null}});
      }
    }
  ];
  if(searchEndpoint)jobs.push(async()=>{
    const endpoint=safeSourceUrl(searchEndpoint);
    if(!endpoint)throw Error("Invalid search endpoint (HTTPS public URL required)");
    const u=new URL(endpoint);
    u.searchParams.set("q",q+" alternatives customer complaints");
    u.searchParams.set("format","json");
    const data=await getJson(u.href,{request,headers:searchKey?{Authorization:"Bearer "+searchKey}:{}});
    for(const s of (data.results||[]).slice(0,8))records.push({category:"market",
      title:s.title,url:s.url,excerpt:cut(s.content||s.snippet)});
  });
  for(const value of userLinks.slice(0,5))jobs.push(async()=>{
    const u=safeSourceUrl(value);
    if(!u||!acceptableExternalSource(u))throw Error("User source host not on evidence allowlist.");
    const data=await request(u,{redirect:"error",signal:AbortSignal.timeout(8000),
      headers:{Accept:"text/html,text/plain"}});
    if(!data.ok)throw Error("HTTP "+data.status);
    const raw=(await data.text()).slice(0,35000);
    const summary=cut(raw.replace(/<script[^>]*>[\s\S]*?<\/script>/gi," ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," "),420);
    records.push({category:"user-supplied",title:u,url:u,excerpt:summary});
  });
  const settled=await Promise.allSettled(jobs.map(f=>f()));
  settled.forEach((x,i)=>{if(x.status==="rejected")failures.push({source:i,error:cut(x.reason,180)});});
  const sources=normalizeEvidence(records,now);
  const categories=Object.fromEntries(["oss","model","market","user-supplied"].map(k=>[k,sources.filter(x=>x.category===k).length]));
  return {schema:1,query:q,retrievedAt:now,sources,categories,failures,
    gaps:[...(categories.market===0?["No retrieved customer/competitor discussion. Market demand is UNVERIFIED."]:[]),
      ...(categories.oss===0?["No verified OSS candidates found."]:[]),
      ...(categories.model===0?["No model metadata found; no model selection is justified."]:[])]};
}
export function verifyResearch(evidence, direction) {
  if(evidence?.schema!==1||!Array.isArray(evidence.sources)||!evidence.sources.length)
    throw Error("No retrieved sources. Research is blocked; connect a search service or supply sources.");
  const ids=new Set(evidence.sources.map(x=>x.id));
  const citations=[...String(direction||"").matchAll(/\[(E-\d{3})\]/g)].map(x=>x[1]);
  if(!citations.length)throw Error("Direction must reference retrieved evidence IDs like [E-001].");
  if(citations.some(id=>!ids.has(id)))throw Error("Direction contains a fabricated evidence ID.");
  if(evidence.categories?.market===0 && !/\bUNVERIFIED\b/i.test(direction))
    throw Error("Market evidence gap must be explicitly marked UNVERIFIED.");
  return {citations:[...new Set(citations)],gaps:evidence.gaps||[]};
}
