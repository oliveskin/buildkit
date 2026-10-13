import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {inspectFile} from "./security.mjs";

const patterns=[
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,"private-key"],
  [/\b(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{30,}\b/,"github-token"],
  [/\bgithub_pat_[A-Za-z0-9_]{30,}\b/,"github-token"],
  [/\bsk-(?:proj-|svcacct-|ant-)?[A-Za-z0-9_-]{20,}\b/,"model-token"],
  [/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,"aws-access-key"],
  [/\bhf_[A-Za-z0-9]{30,}\b/,"huggingface-token"],
  [/["'](?:api_key|secret_key|access_token|private_key)["']\s*:\s*["'][A-Za-z0-9_\-./+]{24,}["']/i,"embedded-credential"]
];
const KEY_PATTERN=/(?:^|\/)(?:\.env(?:\..+)?|\.dev\.vars(?:\..+)?|\.npmrc|\.pypirc|id_(?:rsa|ed25519)|credentials\.json|.*\.(?:pem|p12|pfx|key))$/i;
export function detectSecret(text) {
  const value=String(text);
  return [...new Set(patterns.filter(([re])=>re.test(value)).map(([,id])=>id))];
}
export function scanTree(root,files) {
  const findings=[];
  for(const name of files){
    if(KEY_PATTERN.test(name) && !/\.env\.example$/.test(name)){
      findings.push({path:name,reason:"sensitive-filename"});continue;
    }
    const entry=inspectFile(root,name);
    if(entry.missing)continue;
    if(entry.mode==="executable" && name.endsWith(".json"))findings.push({path:name,reason:"executable-data"});
    if(fs.statSync(path.join(root,name)).size>1200000)continue;
    const content=fs.readFileSync(path.join(root,name),"utf8");
    for(const reason of detectSecret(content))findings.push({path:name,reason});
  }
  return findings;
}
export function assertClean(root,files) {
  const errors=scanTree(root,files);
  if(errors.length)throw Error("Secret/security gate blocked: "+
    errors.map(x=>x.path+" ("+x.reason+")").slice(0,8).join(", "));
  return true;
}
export function trackedFiles(root){
  return execFileSync("git",["ls-files","-z"],{cwd:root}).toString().split("\0").filter(Boolean);
}
