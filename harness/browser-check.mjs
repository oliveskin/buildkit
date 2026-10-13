#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {pathToFileURL} from "node:url";
import {checkPreviewUrl} from "./cloudflare.mjs";
const url=checkPreviewUrl(process.env.BUILDKIT_PREVIEW_URL||"");
const root=path.resolve(process.env.BUILDKIT_APP_PATH||"app");
const out=path.resolve(process.env.BUILDKIT_BROWSER_OUTPUT||"preview-artifacts");
fs.mkdirSync(out,{recursive:true});
const modulePath=path.join(root,"node_modules/playwright/index.mjs");
if(!fs.existsSync(modulePath))throw Error("Missing Playwright browser dependency.");
const {chromium}=await import(pathToFileURL(modulePath).href);
const browser=await chromium.launch();
let screenshot=false,httpStatus=0,pageErrors=0,bodyLength=0;
try {
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on("pageerror",()=>pageErrors++);
  httpStatus=(await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000}))?.status()||0;
  bodyLength=(await page.locator("body").innerText().catch(()=>"")).length;
  await page.screenshot({path:path.join(out,"desktop.png"),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(out,"mobile.png"),fullPage:true});
  screenshot=true;
} finally {await browser.close();}
if(!fs.existsSync(path.join(root,"tests/e2e.spec.mjs")))
  throw Error("Browser evidence requires tests/e2e.spec.mjs with actual user assertions.");
const script=path.join(root,"node_modules/.bin/playwright");
const r=spawnSync(script,["test","tests/e2e.spec.mjs","--reporter=json","--workers=1"],
  {cwd:root,encoding:"utf8",timeout:180000,maxBuffer:3e6,env:{
    PATH:process.env.PATH,HOME:process.env.HOME,CI:"true",BASE_URL:url,PLAYWRIGHT_BASE_URL:url}});
let stats={expected:0,unexpected:1};
try{stats=JSON.parse(r.stdout).stats||stats;}catch{}
const behaviouralTestsPassed=r.status===0&&stats.expected>=2&&stats.unexpected===0&&
  stats.flaky===0&&stats.interrupted===0;
const report={schema:1,sourceSha:process.env.BUILDKIT_CANDIDATE_SHA,previewUrl:url,
  httpStatus,screenshot,pageErrors,bodyLength,behaviouralTestsPassed,
  testCount:stats.expected,testFailures:stats.unexpected,at:new Date().toISOString()};
fs.writeFileSync(path.join(out,"result.json"),JSON.stringify(report,null,2)+"\n");
if(httpStatus<200||httpStatus>=400||pageErrors||bodyLength<30||!behaviouralTestsPassed)
  throw Error("Browser smoke/E2E failed; inspect screenshots and action logs.");
console.log("Verified "+stats.expected+" Playwright assertions and two viewport screenshots.");
