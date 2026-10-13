#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {checkPreviewUrl} from './cloudflare.mjs';
import {assessBrowserReport} from './browser-evidence.mjs';
const url=checkPreviewUrl(process.env.BUILDKIT_PREVIEW_URL||'');
const root=path.resolve(process.env.BUILDKIT_APP_PATH||'app');
const out=path.resolve(process.env.BUILDKIT_BROWSER_OUTPUT||'preview-artifacts');
fs.mkdirSync(out,{recursive:true});
let screenshot=false,httpStatus=0,pageErrors=0,bodyLength=0;
let assessment={passed:false,testCount:0,reasons:[]};
let browser;
try {
  const modulePath=path.join(root,'node_modules/playwright/index.mjs');
  if(!fs.existsSync(modulePath))throw Error('Missing Playwright browser dependency.');
  const {chromium}=await import(pathToFileURL(modulePath).href);
  browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',()=>pageErrors++);
  httpStatus=(await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000}))?.status()||0;
  bodyLength=(await page.locator('body').innerText().catch(()=>'')).length;
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
  screenshot=true;
  await browser.close();browser=null;
  if(!fs.existsSync(path.join(root,'tests/e2e.spec.mjs')))
    throw Error('Browser evidence requires tests/e2e.spec.mjs with actual user assertions.');
  const r=spawnSync(path.join(root,'node_modules/.bin/playwright'),
    ['test','tests/e2e.spec.mjs','--reporter=json','--workers=1'],
    {cwd:root,encoding:'utf8',timeout:180000,maxBuffer:3e6,env:{
      PATH:process.env.PATH,HOME:process.env.HOME,CI:'true',BASE_URL:url,PLAYWRIGHT_BASE_URL:url}});
  fs.writeFileSync(path.join(out,'playwright.json'),r.stdout||'');
  fs.writeFileSync(path.join(out,'playwright.stderr.txt'),r.stderr||'');
  let report;
  try{report=JSON.parse(r.stdout||'');}catch{throw Error('Invalid Playwright JSON; inspect playwright.json and playwright.stderr.txt.');}
  assessment=assessBrowserReport(report,r);
} catch(e) {
  assessment.reasons.push(String(e.message||e));
} finally {
  if(browser)await browser.close().catch(()=>{});
}
const behaviouralTestsPassed=assessment.passed;
const result={schema:1,sourceSha:process.env.BUILDKIT_CANDIDATE_SHA,previewUrl:url,
  httpStatus,screenshot,pageErrors,bodyLength,behaviouralTestsPassed,
  testCount:assessment.testCount,errors:assessment.reasons,at:new Date().toISOString()};
fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
if(httpStatus<200||httpStatus>=400||pageErrors||bodyLength<30||!screenshot||!behaviouralTestsPassed)
  throw Error('Browser smoke/E2E failed: '+assessment.reasons.join('; ')+'. Inspect retained browser evidence.');
console.log('Verified '+assessment.testCount+' browser journeys and two viewport screenshots.');
