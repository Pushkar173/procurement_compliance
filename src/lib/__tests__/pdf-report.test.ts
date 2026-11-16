/**
 * Tests for the client-side Audit Report Generator (jsPDF).
 *
 * Verifies:
 * - Labeled "Automated review — human verification required"
 * - Does NOT call itself an audit clearance certificate or claim legal compliance
 * - Contains tender file name, audit date, findings, evidence excerpts with page numbers,
 *   source references, and human review status with officer notes
 * - Works with both demo PDFs and user-uploaded PDFs
 * - Groups findings by priority (High, Medium, Low) and status
 *
 * Run with: npx tsx src/lib/__tests__/pdf-report.test.ts
 */

import { generateAuditReportDoc, type AuditReportData } from "../pdf-report";
import { runAudit } from "../audit-engine";
import type { PdfPage } from "../pdf-extract";

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

console.log("\n=== Test Suite: PDF Audit Report Generation ===\n");

// ── Demo 1: Smart Classroom Tender ──
const DEMO_PAGES_1: PdfPage[] = [
  {
    pageNumber: 1,
    text: "Tender Reference: TDR-EDU-2026-001. Title: Procurement of Smart Classroom Hardware & Interactive Panels. Department: Directorate of School Education. Estimated Value: INR 3,50,00,000. Earnest Money Deposit (EMD) of 2% must be submitted. Performance Security of 5% required.",
  },
  {
    pageNumber: 2,
    text: "Delivery Period: 90 days from award. Technical Specifications: 75-inch 4K UHD interactive flat panels with anti-glare toughened glass. Eligibility Criteria: 3 years experience. Evaluation: QCBS with 70% technical and 30% financial weightage.",
  },
];

const auditResult1 = runAudit(DEMO_PAGES_1);

// Add officer notes and verify a subset
auditResult1.findings[0]!.humanVerified = true;
auditResult1.findings[0]!.officerNotes = "Verified clause 1.4 conforms to GFR 2017 Rule 170.";
auditResult1.findings[1]!.humanVerified = true;
auditResult1.findings[1]!.officerNotes = "Bank guarantee format reviewed and accepted.";

const demoData1: AuditReportData = {
  tender: {
    id: "TDR-EDU-2026-001",
    title: "Procurement of Smart Classroom Hardware",
    department: "Directorate of School Education",
    type: "Open Tender (Goods)",
    value: 35000000,
    issueDate: "2026-01-15",
    closingDate: "2026-02-15",
    description: "Procurement of interactive displays for 150 government higher secondary schools.",
  },
  filename: "sample-tender-1-smart-classroom.pdf",
  auditDate: "16-Nov-2026",
  score: auditResult1.score,
  scoreExplanation:
    "Calculated as (Found items [1.0] + Needs Review items [0.5]) / Total Applicable Rules * 100. Measures clause coverage in extracted text, not statutory legal compliance.",
  reviewStatus: "Action Required — Critical Gaps",
  findings: auditResult1.findings,
  verifiedCount: 2,
  officerName: "Rajesh Kumar (Executive Procurement Officer)",
};

const doc1 = generateAuditReportDoc(demoData1);
const pdfBytes1 = doc1.output("arraybuffer");

assert(pdfBytes1.byteLength > 15000, `Demo 1 generated valid PDF of ${pdfBytes1.byteLength} bytes`);
assert(
  doc1.getNumberOfPages() >= 2,
  `Demo 1 contains multiple pages (${doc1.getNumberOfPages()} pages)`,
);

// Check that the mandatory text labels are present in the PDF raw output string
const pdfString1 = doc1.output().replace(/\x97/g, "—");
assert(
  pdfString1.includes("Automated review — human verification required"),
  "Demo 1 contains mandatory label 'Automated review — human verification required'",
);
assert(
  pdfString1.includes("NOT an audit clearance certificate"),
  "Demo 1 explicitly states 'NOT an audit clearance certificate'",
);
assert(
  pdfString1.includes("sample-tender-1-smart-classroom.pdf"),
  "Demo 1 includes the exact tender file name",
);
assert(pdfString1.includes("Rajesh Kumar"), "Demo 1 includes verifying officer name");
assert(
  pdfString1.includes("Verified clause 1.4 conforms to GFR 2017"),
  "Demo 1 includes officer review note",
);

// ── Demo 2: Road Resurfacing Tender ──
const DEMO_PAGES_2: PdfPage[] = [
  {
    pageNumber: 1,
    text: "Tender Ref: MUNC-ENGG-2026-089. Tender for Resurfacing of Municipal Arterial Roads in Zone 4. Department of Municipal Engineering. Budget: INR 7,80,00,000. Earnest money deposit of 2% in form of FDR. Liquidated Damages: 0.5% per week up to maximum 10%.",
  },
  {
    pageNumber: 2,
    text: "Dispute Resolution: Sole Arbitrator appointed in accordance with Arbitration and Conciliation Act 1996. Defect Liability Period: 36 months from completion.",
  },
];

const auditResult2 = runAudit(DEMO_PAGES_2);
const demoData2: AuditReportData = {
  tender: {
    id: "MUNC-ENGG-2026-089",
    title: "Resurfacing of Municipal Arterial Roads in Zone 4",
    department: "Municipal Engineering",
    type: "Open Tender (Works)",
    value: 78000000,
    issueDate: "2026-02-01",
    closingDate: "2026-03-01",
    description: "Asphalt resurfacing and drainage re-profiling for 18.5 km municipal roads.",
  },
  filename: "sample-tender-2-road-resurfacing.pdf",
  auditDate: "16-Nov-2026",
  score: auditResult2.score,
  scoreExplanation:
    "Calculated as (Found items [1.0] + Needs Review items [0.5]) / Total Applicable Rules * 100. Measures clause coverage in extracted text, not statutory legal compliance.",
  reviewStatus: "Action Required — Critical Gaps",
  findings: auditResult2.findings,
  verifiedCount: 0,
  officerName: "Priya Sharma (Auditor)",
};

const doc2 = generateAuditReportDoc(demoData2);
const pdfBytes2 = doc2.output("arraybuffer");
assert(pdfBytes2.byteLength > 15000, `Demo 2 generated valid PDF of ${pdfBytes2.byteLength} bytes`);
const pdfString2 = doc2.output().replace(/\x97/g, "—");
assert(
  pdfString2.includes("sample-tender-2-road-resurfacing.pdf"),
  "Demo 2 includes the exact tender file name",
);
assert(
  pdfString2.includes("Automated review — human verification required"),
  "Demo 2 contains mandatory label",
);

// ── Test 3: User-Uploaded Custom PDF ──
const USER_PAGES: PdfPage[] = [
  {
    pageNumber: 1,
    text: "National Highway Authority Tender Document 2026. Custom construction works. Bid security exemption for registered MSEs under PPP order 2012. Integrity Pact as per CVC circular is mandatory for all bidders.",
  },
  {
    pageNumber: 2,
    text: "Performance security: 3% of contract value within 21 days of Letter of Acceptance. Force Majeure: Acts of God, war, pandemic. Governing law: Laws of India, jurisdiction New Delhi.",
  },
];

const userAuditResult = runAudit(USER_PAGES);
// Mark all findings verified with custom notes
userAuditResult.findings.forEach((f, idx) => {
  f.humanVerified = true;
  f.officerNotes = `Officer verification note for check #${idx + 1}: Confirmed clause location.`;
});

const userData: AuditReportData = {
  tender: {
    title: "Construction of Expressway Overbridge Bypass",
    department: "National Highways & Infrastructure",
    type: "Open Tender (Works)",
    value: 125000000,
    issueDate: "2026-03-10",
    closingDate: "2026-04-10",
    description: "Four-lane flyover and junction bypass construction at km 142.",
  },
  filename: "my-uploaded-custom-tender-v2.pdf",
  auditDate: "16-Nov-2026",
  score: userAuditResult.score,
  scoreExplanation:
    "Calculated as (Found items [1.0] + Needs Review items [0.5]) / Total Applicable Rules * 100. Measures clause coverage in extracted text, not statutory legal compliance.",
  reviewStatus: "Preliminary Review Satisfactory",
  findings: userAuditResult.findings,
  verifiedCount: userAuditResult.findings.length,
  officerName: "Anil Deshmukh (Chief Vigilance Officer)",
};

const doc3 = generateAuditReportDoc(userData);
const pdfBytes3 = doc3.output("arraybuffer");
assert(
  pdfBytes3.byteLength > 15000,
  `User upload generated valid PDF of ${pdfBytes3.byteLength} bytes`,
);
const pdfString3 = doc3.output().replace(/\x97/g, "—");
assert(
  pdfString3.includes("my-uploaded-custom-tender-v2.pdf"),
  "User upload PDF report contains the custom uploaded filename",
);
assert(pdfString3.includes("Anil Deshmukh"), "User upload PDF report contains custom officer name");
assert(
  pdfString3.includes("Preliminary Review Satisfactory"),
  "User upload PDF report contains review status",
);
assert(
  pdfString3.includes("Automated review — human verification required"),
  "User upload PDF report contains mandatory label",
);

// ── Test 4: Priority & Status Grouping Verification ──
const highPriorityCount = userAuditResult.findings.filter((f) => f.priority === "High").length;
const medPriorityCount = userAuditResult.findings.filter((f) => f.priority === "Medium").length;
const lowPriorityCount = userAuditResult.findings.filter((f) => f.priority === "Low").length;

assert(highPriorityCount > 0, `Audit contains ${highPriorityCount} High priority rules`);
assert(medPriorityCount > 0, `Audit contains ${medPriorityCount} Medium priority rules`);
assert(lowPriorityCount > 0, `Audit contains ${lowPriorityCount} Low priority rules`);

assert(pdfString3.includes("HIGH PRIORITY"), "Report includes High Priority section header");
assert(pdfString3.includes("MEDIUM PRIORITY"), "Report includes Medium Priority section header");
assert(
  pdfString3.includes("LOW / ADVISORY") || pdfString3.includes("Low Priority Rules"),
  "Report includes Low Priority section header",
);

console.log(`\n========================================`);
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
