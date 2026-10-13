export function classifyProduct(brief,prd,hld) {
  const s=(String(brief)+"\n"+String(prd)+"\n"+String(hld)).toLowerCase();
  const checks=[
    ["medical",/\b(patient|diagnos|medical|clinical|health record|prescri)\w*/],
    ["finance",/\b(banking|credit scoring|loan|financial advice|insurance underwriting)\b/],
    ["children",/\b(child(?:ren)?|minor|under.?13|under.?16|school pupil)\b/],
    ["biometric",/\b(biometric|face recognition|fingerprint|voiceprint)\b/],
    ["regulated-identity",/\b(iqama|kyc|anti.money.laundering|national id)\b/],
  ];
  const sensitive=checks.filter(([,re])=>re.test(s)).map(([tag])=>tag);
  const jurisdictions=[["EU",/\b(eu|gdpr|european union|spain|france|germany)\b/],
    ["US",/\b(usa|united states|us state|california|hipaa)\b/],
    ["Saudi Arabia",/\b(saudi|ksa|sama|pdpl)\b/]]
    .filter(([,re])=>re.test(s)).map(([tag])=>tag);
  const personalData=/\b(name|email|phone|account|login|user profile|customer|personal data|pii)\b/.test(s);
  return {schema:1,tier:sensitive.length?"regulated-review":personalData?"personal-data":"baseline",
    categories:sensitive,jurisdictions,
    checks:["credential scanning","dependency CVEs","authentication/authorization","input validation",
      "tenant isolation if multi-tenant","privacy and retention","rate limiting","error handling"],
    humanComplianceReviewRequired:sensitive.length>0,
    statement:"Automated classification is not a legal determination or certification."};
}
export function assessRelease({profile,secretScan,dependencyAudit,preview,independentReview,externalAttestation}){
  const blockers=[];
  if(!secretScan?.passed)blockers.push("Secret scanning has not passed.");
  if(!dependencyAudit?.passed)blockers.push("Dependency audit has not passed.");
  if(!preview?.behaviouralTestsPassed)blockers.push("No passing browser journey evidence.");
  if(!independentReview?.passed)blockers.push("Independent code/security review missing or failed.");
  if(profile.humanComplianceReviewRequired&&!externalAttestation?.approved)
    blockers.push("Regulated product requires explicit qualified human compliance review.");
  return {schema:1,decision:blockers.length?"BLOCK":"GO",blockers,profile,
    assurance:"Security checks provide evidence, not a security or legal compliance certification."};
}
