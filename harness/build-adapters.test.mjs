import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRecipe} from './build-adapters.mjs';
test('Node, Python, Rust verification choose their own container, never Cloudflare by default',()=>{
 assert.match(buildRecipe('node-npm').image,/node/);
 assert.match(buildRecipe('python-pytest',{hasPythonRequirements:true}).image,/python/);
 assert.match(buildRecipe('rust-cargo',{hasCargoLock:true}).image,/rust/);
});
test('build and tests cannot fetch network; dependencies install with network only',()=>{
 for(const [adapter,opts] of [
   ['node-npm',{}],['python-pytest',{hasPythonRequirements:true}],['rust-cargo',{hasCargoLock:true}]
 ]){
  const r=buildRecipe(adapter,opts);assert.equal(r.steps[0].network,true);
  assert.ok(r.steps.filter(x=>x.args.includes('test')||x.args.includes('pytest')).every(x=>x.network===false));
 }
 assert.throws(()=>buildRecipe('external'),/Unsupported/);
});
