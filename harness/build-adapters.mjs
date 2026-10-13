// Fixed-command verification adapters. Nothing from an Issue or generated script becomes a shell command.
export function buildRecipe(adapter,{hasNodeLock=false,hasPythonRequirements=false,hasCargoLock=false}={}){
  if(adapter==='node-npm')
    return {image:'node:22-bookworm-slim',steps:[
      {args:['npm',hasNodeLock?'ci':'install','--ignore-scripts','--no-audit','--no-fund'],network:true},
      {args:['npm','audit','--omit=dev','--audit-level=high'],network:true},
      {args:['npm','run','build'],network:false},
      {args:['npm','test'],network:false}
    ]};
  if(adapter==='python-pytest'){
    if(!hasPythonRequirements)throw Error('Python test adapter requires requirements.txt with pytest and required dependencies.');
    return {image:'python:3.12-slim',steps:[
      {args:['python','-m','pip','install','--no-input','--target','.bkdeps','-r','requirements.txt'],network:true},
      {args:['python','-m','compileall','-q','.'],network:false},
      {args:['python','-m','pytest','-q'],network:false}
    ]};
  }
  if(adapter==='rust-cargo'){
    if(!hasCargoLock)throw Error('Rust verification requires a committed Cargo.lock for repeatability.');
    return {image:'rust:1.90-slim',steps:[
      {args:['cargo','fetch','--locked'],network:true},
      {args:['cargo','build','--locked','--offline'],network:false},
      {args:['cargo','test','--locked','--offline'],network:false}
    ]};
  }
  throw Error('Unsupported build adapter '+adapter+'. Buildkit will not substitute Node/Cloudflare; add a verified adapter.');
}
