/**
 * Tests for the audit engine using content from the included demo PDFs.
 *
 * Run with: npx tsx src/lib/__tests__/audit-engine.test.ts
 *
 * These use the known content of the two fictional sample tenders to verify
 * that the engine produces expected results.
 */

import { runAudit, type AuditFinding, type FindingStatus } from "../audit-engine";
import type { PdfPage } from "../pdf-extract";

/* ───────── Test Helpers ───────── */

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function findById(findings: AuditFinding[], ruleId: string): AuditFinding | undefined {
  return findings.find((f) => f.ruleId === ruleId);
}

function assertStatus(findings: AuditFinding[], ruleId: string, expected: FindingStatus) {
  const finding = findById(findings, ruleId);
  assert(
    finding?.status === expected,
    `${ruleId}: expected "${expected}", got "${finding?.status ?? "NOT FOUND"}"`,
  );
}

function assertHasEvidence(findings: AuditFinding[], ruleId: string) {
  const finding = findById(findings, ruleId);
  assert(
    (finding?.evidence.length ?? 0) > 0,
    `${ruleId}: has evidence snippets (${finding?.evidence.length ?? 0} found)`,
  );
}

function assertHasPageRef(findings: AuditFinding[], ruleId: string) {
  const finding = findById(findings, ruleId);
  const hasPage = finding?.evidence.some((e) => e.pageNumber > 0) ?? false;
  assert(hasPage, `${ruleId}: evidence includes page number reference`);
}

/* ───────── Sample Tender 1: Smart Classroom Equipment ───────── */

// Reconstructed from the known content of sample-tender-1-smart-classroom.pdf
const TENDER_1_PAGES: PdfPage[] = [
  {
    pageNumber: 1,
    text: `Sample Tender 1 -- Smart Classroom Equipment
NOTICE: ILLUSTRATIVE DEMO -- NOT AN OFFICIAL TENDER OR GOVERNMENT DOCUMENT.
Tender Notice Procurement of Smart Classroom Equipment
Tender Reference: DEMO-EDU-2025-001 Date of Issue: 15 March 2025
Fictional Department of Education -- Demo District

1. Introduction & Background
The Fictional Department of Education, Demo District, invites sealed bids from eligible suppliers for the supply, delivery, and installation of smart classroom equipment across 25 government schools. This procurement is part of the district's Digital Learning Initiative 2025-26.

2. Scope of Work
The selected vendor shall supply and install the following items:
- 250 interactive flat-panel displays (75-inch, 4K resolution)
- 250 mini-PCs with pre-loaded educational software
- 25 wireless routers and LAN infrastructure per school
- 500 student tablets with protective cases
- On-site installation, configuration, and 1-day training per school

3. Budget Allocation
The estimated total budget for this procurement is INR 3,50,00,000 (Three Crore Fifty Lakh) inclusive of all taxes, delivery, and installation charges.
Payment schedule:
- 30% advance on contract signing
- 50% on delivery and installation at each school
- 20% after successful acceptance testing

4. Eligibility Criteria
Bidders must meet all of the following:
a) Registered company with valid GST registration
b) Minimum 3 years of experience in supply of IT/AV equipment
c) Annual turnover of at least INR 5,00,00,000 in any of the last 3 financial years
d) At least 2 completed contracts of similar nature and value
e) Not blacklisted by any Central or State Government department

5. Bid Security (Earnest Money Deposit)
Each bidder must submit a bid security of INR 7,00,000 (Seven Lakh) in the form of a bank guarantee or demand draft from a scheduled bank, valid for 180 days from the date of bid submission.

6. Technical Specifications
Detailed technical specifications for each item are provided in Annexure-A (not included in this demo document). All equipment must:
- Conform to BIS standards where applicable
- Carry a minimum 3-year comprehensive on-site warranty
- Include manufacturer authorization certificates

7. Delivery Timeline
All equipment must be delivered and installed within 90 calendar days from the date of issue of the purchase order. Delivery shall be staggered across 5 phases of 5 schools each, with a gap of no more than 15 days between phases.

8. Evaluation Criteria
Bids will be evaluated on a Quality and Cost-Based Selection (QCBS) method:
- Technical score: 70% (experience, compliance, certifications, warranty terms)
- Financial score: 30% (lowest price gets highest score)
Minimum qualifying technical score: 60 out of 100.

9. Terms and Conditions
a) The procuring authority reserves the right to cancel the tender without assigning any reason.
b) All disputes shall be subject to the jurisdiction of Demo District courts.
c) The contract will be governed by the applicable laws of India.
Note: This section does not include clauses for:
- Penalty for delayed delivery (DELIBERATELY OMITTED FOR DEMO)
- Liquidated damages
- Force majeure

10. Important Dates
- Tender publication date: 15 March 2025
- Pre-bid conference: 25 March 2025
- Last date for queries: 28 March 2025
- Bid submission deadline: 10 April 2025, 3:00 PM
- Technical bid opening: 11 April 2025, 11:00 AM`,
  },
  {
    pageNumber: 2,
    text: `Items Deliberately Omitted (For Testing Purposes)
The following clauses have been intentionally left out of this sample tender so that the ProcureComply audit engine can flag them as "Missing" or "Needs Review":
1. Environmental / Green Procurement Clause
2. Accessibility Requirements
3. Grievance Redressal Mechanism
4. Integrity Pact / Anti-Corruption Clause
5. Penalty / Liquidated Damages Clause
6. Insurance Requirements
These omissions are DELIBERATE and for demonstration only.`,
  },
];

/* ───────── Sample Tender 2: Road Resurfacing ───────── */

const TENDER_2_PAGES: PdfPage[] = [
  {
    pageNumber: 1,
    text: `Sample Tender 2 -- Municipal Road Resurfacing
NOTICE: ILLUSTRATIVE DEMO -- NOT AN OFFICIAL TENDER OR GOVERNMENT DOCUMENT.
Tender Notice Road Resurfacing & Drainage Works -- Demo Ward
Tender Reference: DEMO-MW-2025-047 Date of Issue: 01 April 2025
Fictional Municipal Corporation -- Demo City

1. Introduction
The Fictional Municipal Corporation of Demo City invites online bids through the e-procurement portal from eligible civil contractors for road resurfacing and allied drainage improvement works in Ward Nos. 12, 15, and 18.

2. Scope of Work
a) Milling and removal of existing damaged bituminous surface (approx. 8.5 km)
b) Supply and laying of Dense Bituminous Macadam (DBM) -- 50 mm
c) Supply and laying of Bituminous Concrete (BC) -- 40 mm
d) Repair/reconstruction of roadside drains (approx. 3.2 km)
e) Road marking and signage as per IRC standards
f) Traffic management during construction

3. Estimated Cost & Budget
The estimated cost of the project is INR 4,75,00,000 (Four Crore Seventy-Five Lakh) based on the Schedule of Rates (SOR) of the Public Works Department.
Payment terms:
- Running account bills on certified measurements
- 5% retention money, released after defect liability period
- No advance payment

4. Contractor Eligibility
a) Must be a registered contractor (Class I or Class II) with the Public Works Department or equivalent state authority
b) Minimum 5 years of experience in road construction works
c) Must have completed at least 3 similar works of value INR 2,00,00,000+ each in the last 5 years
d) Valid PAN, GST registration, and labour license
e) Not blacklisted by any government department

5. Bid Security & Performance Guarantee
- Bid Security (EMD): INR 9,50,000 (Nine Lakh Fifty Thousand) via bank guarantee
- Performance Guarantee: 5% of contract value within 15 days of award
- Defect Liability Period: 24 months from date of completion

6. Material Specifications
All materials must conform to:
- IRC:37 (Design of Flexible Pavements)
- IS:73 (Paving Bitumen specifications)
- MORTH Specifications (5th Revision) for Road and Bridge Works
- Aggregates: Conforming to IS:383
Quality testing certificates must be submitted for each lot of material.

7. Timeline & Milestones
Total project duration: 120 calendar days from work order.
- Phase 1 (Ward 12): Days 1-40
- Phase 2 (Ward 15): Days 30-80
- Phase 3 (Ward 18): Days 70-120
Weekly progress reports mandatory. Delay beyond 120 days attracts penalty.

8. Penalty Clause
For each week of delay beyond the stipulated completion date, a penalty of 0.5% of the contract value shall be levied, up to a maximum of 10%.
Beyond 10% penalty, the contract may be terminated and the performance guarantee forfeited.

9. Dispute Resolution
Any dispute arising under this contract shall be referred to the Chief Engineer of the Municipal Corporation for resolution. If unresolved within 30 days, the matter shall be referred to arbitration under the Arbitration and Conciliation Act, 1996.
Note: While a dispute resolution clause is present, it is vague on the arbitrator appointment process (DELIBERATE for demo).

10. Important Dates
- Publication date: 01 April 2025
- Pre-bid meeting: 08 April 2025
- Last date for bid submission: 22 April 2025, 5:00 PM
- Technical bid opening: 23 April 2025, 11:00 AM`,
  },
  {
    pageNumber: 2,
    text: `Items Deliberately Omitted (For Testing Purposes)
The following clauses have been intentionally left out of this sample tender so that the ProcureComply audit engine can flag them:
1. Safety & Occupational Health Clause
2. Insurance Provisions
3. Subcontracting Restrictions
4. Environmental Impact Assessment
5. Integrity Pact / Anti-Corruption
6. Accessibility
7. Quality Inspection Process
These omissions are DELIBERATE and for demonstration only.`,
  },
];

/* ───────── Tests ───────── */

console.log("\n=== Sample Tender 1: Smart Classroom Equipment ===\n");

const report1 = runAudit(TENDER_1_PAGES);

console.log("-- Rules that SHOULD be Found --");
assertStatus(report1.findings, "BUDGET_ALLOCATION", "Found");
assertStatus(report1.findings, "PAYMENT_TERMS", "Found");
assertStatus(report1.findings, "ELIGIBILITY_CRITERIA", "Found");
assertStatus(report1.findings, "BID_SECURITY", "Found");
assertStatus(report1.findings, "TECHNICAL_SPECS", "Found");
assertStatus(report1.findings, "DELIVERY_TIMELINE", "Found");
assertStatus(report1.findings, "EVALUATION_CRITERIA", "Found");
assertStatus(report1.findings, "SCOPE_OF_WORK", "Found");
assertStatus(report1.findings, "WARRANTY_TERMS", "Found");

console.log("\n-- Rules that SHOULD be Missing --");
assertStatus(report1.findings, "ENVIRONMENTAL_COMPLIANCE", "Missing");
assertStatus(report1.findings, "ACCESSIBILITY", "Missing");
assertStatus(report1.findings, "GRIEVANCE_REDRESSAL", "Missing");
assertStatus(report1.findings, "INTEGRITY_PACT", "Missing");
assertStatus(report1.findings, "INSURANCE_REQUIREMENTS", "Missing");
assertStatus(report1.findings, "SUBCONTRACTING", "Missing");
assertStatus(report1.findings, "SAFETY_COMPLIANCE", "Missing");

console.log("\n-- Penalty & Dispute (edge cases for Tender 1) --");
// Tender 1 mentions "Penalty for delayed delivery (DELIBERATELY OMITTED)"
// The word "penalty" appears but without supporting terms like "per week", "maximum" etc.
// so the engine correctly flags it as "Needs Review" — the requirement is mentioned but not addressed
assertStatus(report1.findings, "PENALTY_CLAUSE", "Needs Review");
assertStatus(report1.findings, "DISPUTE_RESOLUTION", "Found"); // "jurisdiction" appears

console.log("\n-- Evidence checks --");
assertHasEvidence(report1.findings, "BUDGET_ALLOCATION");
assertHasEvidence(report1.findings, "BID_SECURITY");
assertHasPageRef(report1.findings, "BUDGET_ALLOCATION");
assertHasPageRef(report1.findings, "ELIGIBILITY_CRITERIA");

console.log("\n-- Report metadata --");
assert(report1.score > 0, `Score is positive: ${report1.score}%`);
assert(report1.score <= 100, `Score is <= 100: ${report1.score}%`);
assert(report1.disclaimer.length > 0, "Disclaimer is present");
assert(
  report1.findings.every((f) => !f.humanVerified),
  "All findings start unverified",
);
assert(
  report1.findings.every((f) => f.source.type === "demo" || f.source.type === "reference"),
  "All findings have source type 'demo' or 'reference'",
);
assert(
  report1.findings.every((f) => f.source.name.length > 0 && f.source.authority.length > 0),
  "All findings have source name and authority",
);

console.log("\n\n=== Sample Tender 2: Road Resurfacing ===\n");

const report2 = runAudit(TENDER_2_PAGES);

console.log("-- Rules that SHOULD be Found --");
assertStatus(report2.findings, "BUDGET_ALLOCATION", "Found");
assertStatus(report2.findings, "PAYMENT_TERMS", "Found");
assertStatus(report2.findings, "ELIGIBILITY_CRITERIA", "Found");
assertStatus(report2.findings, "BID_SECURITY", "Found");
assertStatus(report2.findings, "TECHNICAL_SPECS", "Found");
assertStatus(report2.findings, "DELIVERY_TIMELINE", "Found");
assertStatus(report2.findings, "PENALTY_CLAUSE", "Found");
assertStatus(report2.findings, "PERFORMANCE_GUARANTEE", "Found");
assertStatus(report2.findings, "SCOPE_OF_WORK", "Found");

console.log("\n-- Dispute Resolution (should be Needs Review — vague) --");
// Tender 2 has dispute resolution but is noted as vague on arbitrator appointment
const disputeFinding = findById(report2.findings, "DISPUTE_RESOLUTION");
assert(
  disputeFinding?.status === "Found" || disputeFinding?.status === "Needs Review",
  `DISPUTE_RESOLUTION: "${disputeFinding?.status}" (Found or Needs Review both acceptable)`,
);

console.log("\n-- Rules that SHOULD be Missing --");
assertStatus(report2.findings, "SAFETY_COMPLIANCE", "Missing");
assertStatus(report2.findings, "INSURANCE_REQUIREMENTS", "Missing");
assertStatus(report2.findings, "SUBCONTRACTING", "Missing");
assertStatus(report2.findings, "ENVIRONMENTAL_COMPLIANCE", "Missing");
assertStatus(report2.findings, "INTEGRITY_PACT", "Missing");
assertStatus(report2.findings, "ACCESSIBILITY", "Missing");
assertStatus(report2.findings, "GRIEVANCE_REDRESSAL", "Missing");

console.log("\n-- Evidence checks --");
assertHasEvidence(report2.findings, "PENALTY_CLAUSE");
assertHasEvidence(report2.findings, "PERFORMANCE_GUARANTEE");
assertHasPageRef(report2.findings, "PENALTY_CLAUSE");

console.log("\n-- Comparative checks --");
assert(
  report2.score >= report1.score - 15 && report2.score <= report1.score + 15,
  `Scores are comparable: Tender1=${report1.score}%, Tender2=${report2.score}%`,
);
assert(
  report2.counts.Found >= report1.counts.Found,
  `Tender 2 has >= Found items (${report2.counts.Found} vs ${report1.counts.Found})`,
);

console.log("\n\n=== Empty / No-text test ===\n");

const emptyReport = runAudit([{ pageNumber: 1, text: "" }]);
assert(
  emptyReport.findings.every((f) => f.status === "Missing"),
  "All rules are Missing for empty text",
);
assert(emptyReport.score === 0, `Score is 0 for empty text: ${emptyReport.score}`);

console.log("\n\n=== RESULTS ===\n");
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed!`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${passed} tests passed!`);
}
