import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBlocks,readyBlocks,remainingBlocks} from './blocks.mjs';
const blocks=Array.from({length:18},(_,i)=>({
  id:'B'+String(i+1).padStart(2,'0'),goal:'Implement verifiable user outcome '+i,
  acceptance:['A real observable behavior is demonstrated'],
  requirements:['FR-01'],dependsOn:i?['B'+String(i).padStart(2,'0')]:[]
}));
test('18 blocks are accepted, do not compress approved MMFS into three',()=>{
  assert.equal(validateBlocks({blocks},['FR-01']).length,18);
  assert.equal(readyBlocks(blocks).length,2);
  assert.deepEqual(readyBlocks(blocks,[{id:'B01'},{id:'B02'}]).map(b=>b.id),['B03','B04']);
  assert.equal(remainingBlocks(blocks,[{id:'B01'},{id:'B02'}]).length,16);
});
test('unknown/cyclic dependencies and requirement omissions are rejected',()=>{
  assert.throws(()=>validateBlocks({blocks:[{...blocks[0],dependsOn:['B99']}]},['FR-01']),/Unknown/);
  assert.throws(()=>validateBlocks({blocks:[{...blocks[0],dependsOn:['B02']},{...blocks[1]}]},['FR-01']),/Cyclic/);
  assert.throws(()=>validateBlocks({blocks:[{...blocks[0],requirements:[]}]},['FR-01']),/coverage/);
});
