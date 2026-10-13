import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { permittedChange } from "./core.mjs";

export function inspectFile(root, name) {
  if (!name || path.isAbsolute(name) || name.split(/[\\/]/).includes("..")) throw new Error("Unsafe path: "+name);
  let current=root;
  for (const part of name.split("/")) {
    current=path.join(current,part);
    let stat;
    try { stat=fs.lstatSync(current); }
    catch(e) { if(e.code==="ENOENT") return {path:name,missing:true}; throw e; }
    if(stat.isSymbolicLink()) throw new Error("Symlink not allowed: "+name);
  }
  const stat=fs.lstatSync(current);
  if(!stat.isFile() || stat.size>5_000_000) throw new Error("Expected a regular file smaller than 5 MB: "+name);
  return {path:name,mode:stat.mode & 0o111 ? "executable":"regular",sha:createHash("sha256").update(fs.readFileSync(current)).digest("hex")};
}
export function redact(text, secrets=[]) {
  let value=String(text);
  for(const secret of secrets.filter(Boolean)) value=value.split(secret).join("[REDACTED]");
  return value;
}
export function assertChanges(root, files, secrets=[]) {
  for(const name of files) {
    if(!permittedChange(name)) throw new Error("Protected path modified: "+name);
    const entry=inspectFile(root,name);
    if(!entry.missing) {
      const content=fs.readFileSync(path.join(root,name));
      if(secrets.filter(s=>s&&s.length>=8).some(s=>content.includes(Buffer.from(s)))) throw new Error("Credential found in generated output: "+name);
    }
  }
}
// Copy only regular, versionable application files. Never mount .git, credentials,
// controller state, agent config, the runner home, or the Docker socket in tests.
export function makeTestSnapshot(root, files) {
  const target=fs.mkdtempSync(path.join(os.tmpdir(),"buildkit-test-"));
  try {
    for(const name of files) {
      if(!permittedChange(name)) continue;
      const entry=inspectFile(root,name);
      if(entry.missing) continue;
      const dst=path.join(target,name); fs.mkdirSync(path.dirname(dst),{recursive:true});
      fs.copyFileSync(path.join(root,name),dst);
    }
    return target;
  } catch(e) { fs.rmSync(target,{recursive:true,force:true}); throw e; }
}
export function containerArgs(directory, args, network=false, image='node:22-bookworm-slim') {
  if(!path.isAbsolute(directory) || directory.includes(",")) throw new Error("Invalid snapshot directory.");
  return ["run","--rm","--cap-drop=ALL","--security-opt=no-new-privileges",
    "--pids-limit=256","--memory=2g","--cpus=2","--read-only",
    "--network="+(network?"bridge":"none"),"--tmpfs","/tmp:rw,nosuid,nodev,size=512m",
    "--user",`${process.getuid?.()??1000}:${process.getgid?.()??1000}`,
    "--mount",`type=bind,source=${directory},target=/workspace`,"--workdir","/workspace",
    "--env","HOME=/tmp","--env","CI=true",
    "--env","PYTHONPATH=/workspace/.bkdeps","--env","CARGO_HOME=/workspace/.cargo",
    "--env","CARGO_TARGET_DIR=/workspace/.target",image,...args];
}
