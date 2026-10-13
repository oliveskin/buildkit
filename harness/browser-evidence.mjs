// Playwright 1.64 JSONReporter has no aggregate stats.interrupted field.
// Inspect real report errors, expected statuses and each execution attempt instead.
export function assessBrowserReport(report, processResult) {
  const reasons=[];
  if(processResult?.status!==0 || processResult?.signal || processResult?.error)
    reasons.push('Browser test process failed, timed out or was interrupted.');
  const stats=report?.stats;
  if(!stats || !Number.isInteger(stats.expected) || stats.expected<2)
    reasons.push('At least two passing user-journey tests are required.');
  for(const key of ['unexpected','flaky','skipped'])
    if(stats?.[key]!==0)reasons.push('Browser report has missing or nonzero '+key+' count.');
  if(!Array.isArray(report?.errors) || report.errors.length)
    reasons.push('Browser report is missing its error list or reports global errors.');
  const tests=[];
  function visit(suites) {
    for(const suite of Array.isArray(suites)?suites:[]) {
      for(const spec of suite.specs||[])for(const test of spec.tests||[])tests.push(test);
      visit(suite.suites);
    }
  }
  visit(report?.suites);
  const passing=tests.filter(t=>t.expectedStatus==='passed' && t.status==='expected' &&
    Array.isArray(t.results) && t.results.length>0 &&
    t.results.every(r=>r.status==='passed' && !r.error && !(r.errors||[]).length));
  if(tests.length<2 || passing.length!==tests.length || passing.length!==stats?.expected)
    reasons.push('Each required journey must actually pass; expected failures and interrupted attempts do not count.');
  return {passed:reasons.length===0,testCount:passing.length,reasons};
}
