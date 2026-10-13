import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBrowserReport} from './browser-evidence.mjs';
const result=()=>({errors:[],stats:{expected:2,unexpected:0,flaky:0,skipped:0},suites:[{specs:[{tests:[1,2].map(()=>({expectedStatus:'passed',status:'expected',results:[{status:'passed',errors:[]}]}))}]}]});
test('normal Playwright JSON passes without an aggregate interrupted field',()=>{
  assert.equal(assessBrowserReport(result(),{status:0}).passed,true);
});
test('global errors, process interruption, skipped and unexpected failures are rejected',()=>{
  for(const mutate of [r=>r.errors.push({message:'worker failure'}),r=>r.stats.skipped++,r=>r.stats.unexpected++,r=>r.stats.flaky++]){
    const report=result();mutate(report);assert.equal(assessBrowserReport(report,{status:0}).passed,false);
  }
  assert.equal(assessBrowserReport(result(),{status:null,signal:'SIGTERM'}).passed,false);
});
test('expected failures and interrupted attempts are not successful user journeys',()=>{
  for(const status of ['failed','interrupted','timedOut','skipped']){
    const report=result();report.suites[0].specs[0].tests[0].results[0].status=status;
    assert.equal(assessBrowserReport(report,{status:0}).passed,false);
  }
  const report=result();report.suites[0].specs[0].tests[0].expectedStatus='failed';
  assert.equal(assessBrowserReport(report,{status:0}).passed,false);
});
