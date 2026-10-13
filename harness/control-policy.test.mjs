import test from "node:test";
import assert from "node:assert/strict";
import {checkPreviewIsolation,checkPreviewUrl,parsePreviewOutput,verifyBrowserResults} from "./cloudflare.mjs";
import {classifyProduct,assessRelease} from "./compliance.mjs";
const base={name:"bk-sample",main:"src/index.js",previews:{vars:{ENVIRONMENT:"preview"}}};
test("Cloudflare preview requires explicit worker and separate preview bindings",()=>{
 assert.equal(checkPreviewIsolation(base,"bk-sample").worker,"bk-sample");
 assert.throws(()=>checkPreviewIsolation(base,"another-app"),/mismatch/);
 assert.throws(()=>checkPreviewIsolation({...base,previews:{} },"bk-sample"),/ENVIRONMENT/);
 assert.throws(()=>checkPreviewIsolation({...base,d1_databases:[{binding:"DB",database_id:"prod"}]},"bk-sample"),/preview bindings/);
 assert.throws(()=>checkPreviewIsolation({...base,d1_databases:[{binding:"DB",database_id:"prod"}],
   previews:{vars:{ENVIRONMENT:"preview"},d1_databases:[{binding:"DB",database_id:"prod"}]}},"bk-sample"),/isolated/);
 assert.throws(()=>checkPreviewIsolation({...base,services:[{service:"prod",binding:"BACKEND"}]},"bk-sample"),/Service bindings/);
 assert.throws(()=>checkPreviewIsolation({...base,previews:{vars:{ENVIRONMENT:"preview"},services:[{service:"staging",binding:"BACKEND"}]}},"bk-sample"),/Service bindings/);
});
test("Cloudflare URL is validated, no impersonated output",()=>{
 assert.equal(parsePreviewOutput({preview:{urls:["https://pr-1-bk-sample.user.workers.dev"]}}),
   "https://pr-1-bk-sample.user.workers.dev");
 assert.throws(()=>checkPreviewUrl("https://evil.example.com"));
 assert.throws(()=>checkPreviewUrl("https://user.workers.dev.evil.com"));
});
test("screenshot and real behaviour are mandatory to approve",()=>{
 const url="https://pr-1-bk-sample.user.workers.dev";
 const ok={schema:1,previewUrl:url,httpStatus:200,screenshot:true,pageErrors:0,behaviouralTestsPassed:true};
 assert.equal(verifyBrowserResults(ok,url),true);
 assert.throws(()=>verifyBrowserResults({...ok,behaviouralTestsPassed:false},url));
});
test("product classification requires human compliance decision on regulated categories",()=>{
 const profile=classifyProduct("diagnostic tool for doctors","patient records","cloud backend");
 assert.ok(profile.categories.includes("medical"));
 assert.equal(profile.humanComplianceReviewRequired,true);
 const checks={profile,secretScan:{passed:true},dependencyAudit:{passed:true},
   preview:{behaviouralTestsPassed:true},independentReview:{passed:true}};
 assert.equal(assessRelease(checks).decision,"BLOCK");
 assert.equal(assessRelease({...checks,externalAttestation:{approved:true}}).decision,"GO");
});
