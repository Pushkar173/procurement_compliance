/**
 * Client-side PDF Report Generator for ProcureComply Audit Results.
 *
 * Requirements:
 * - Labeled: "Automated review — human verification required"
 * - Does NOT claim to be an audit clearance certificate or that the tender is legally compliant.
 * - Works with both demo PDFs and user-uploaded PDFs.
 * - Contains tender file name, audit date, findings, evidence excerpts with page numbers,
 *   source references (distinguishing official vs demo), and human review status with officer notes.
 */

import { jsPDF } from "jspdf";
import type { AuditFinding, FindingStatus } from "./audit-engine";

function formatCurrency(val: number): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  } catch {
    return `₹${val.toLocaleString()}`;
  }
}

/* ───────── Types ───────── */

export interface AuditReportData {
  tender: {
    id?: string;
    title: string;
    department: string;
    type: string;
    value: number;
    issueDate?: string;
    closingDate?: string;
    description?: string;
  };
  filename: string;
  auditDate: string;
  score: number;
  scoreExplanation: string;
  reviewStatus: string;
  findings: AuditFinding[];
  verifiedCount: number;
  officerName?: string;
}

const MANDATORY_DISCLAIMER =
  "Automated review — human verification required. " +
  "This report is generated automatically by ProcureComply as decision support. " +
  "It is NOT an audit clearance certificate, and does not claim or warrant that the tender is legally compliant. " +
  "All findings, cited excerpts, and regulatory gaps must be reviewed and confirmed by an authorized officer.";

/* ───────── Generator ───────── */

export function generateAuditReportDoc(data: AuditReportData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = margin + 10;
      drawRunningHeader();
    }
  }

  function drawRunningHeader() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("ProcureComply — Automated Tender Review Report", margin, 10);
    doc.text("Automated review — human verification required", pageWidth - margin, 10, {
      align: "right",
    });
    doc.setDrawColor(210, 210, 210);
    doc.line(margin, 12, pageWidth - margin, 12);
  }

  // ── Header Banner ──
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(margin, y, contentWidth, 24, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("AUTOMATED TENDER REVIEW REPORT", margin + 6, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text("Automated review — human verification required", margin + 6, y + 16);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Audit Generated: ${data.auditDate} | Reviewer: ${data.officerName || "Procurement Officer"}`,
    pageWidth - margin - 6,
    y + 16,
    { align: "right" },
  );

  y += 28;

  // ── Prominent Advisory Banner ──
  doc.setFillColor(254, 243, 199); // Amber-100
  doc.setDrawColor(245, 158, 11); // Amber-500
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(146, 64, 14); // Amber-900
  doc.text("DECISION SUPPORT NOTICE", margin + 4, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const noticeLines = doc.splitTextToSize(
    "This automated review assesses tender document text against tested compliance rules. It is NOT legal advice, a formal clearance certificate, or certification of statutory compliance. Findings must be validated by an authorized officer.",
    contentWidth - 8,
  );
  doc.text(noticeLines, margin + 4, y + 10);

  y += 20;

  // ── Document & Tender Overview Table ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("1. Tender & Document Information", margin, y);
  y += 4;


  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 38, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const col1 = margin + 4;
  const col2 = margin + 38;
  const col3 = margin + 104;
  const col4 = margin + 138;

  // Row 1: Document Filename & Department
  doc.setFont("helvetica", "bold");
  doc.text("Source Document:", col1, y + 6);
  doc.setFont("helvetica", "normal");
  const filenameLines = doc.splitTextToSize(data.filename, 62);
  doc.text(filenameLines[0] || data.filename, col2, y + 6);

  doc.setFont("helvetica", "bold");
  doc.text("Department:", col3, y + 6);
  doc.setFont("helvetica", "normal");
  const deptLines = doc.splitTextToSize(data.tender.department, 42);
  doc.text(deptLines[0] || data.tender.department, col4, y + 6);

  // Row 2: Tender Title & Type
  doc.setFont("helvetica", "bold");
  doc.text("Tender Title:", col1, y + 14);
  doc.setFont("helvetica", "normal");
  const titleLines = doc.splitTextToSize(data.tender.title, 62);
  doc.text(titleLines[0] || data.tender.title, col2, y + 14);

  doc.setFont("helvetica", "bold");
  doc.text("Procurement Type:", col3, y + 14);
  doc.setFont("helvetica", "normal");
  doc.text(data.tender.type, col4, y + 14);

  // Row 3: Estimated Value & Issue Date
  doc.setFont("helvetica", "bold");
  doc.text("Estimated Value:", col1, y + 22);
  doc.setFont("helvetica", "normal");
  doc.text(formatCurrency(data.tender.value), col2, y + 22);

  doc.setFont("helvetica", "bold");
  doc.text("Tender Timeline:", col3, y + 22);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${data.tender.issueDate || "—"} to ${data.tender.closingDate || "—"}`,
    col4,
    y + 22,
  );

  // Row 4: Review Status & Verification Count
  doc.setFont("helvetica", "bold");
  doc.text("Review Status:", col1, y + 30);
  doc.setFont("helvetica", "normal");
  doc.text(data.reviewStatus, col2, y + 30);

  doc.setFont("helvetica", "bold");
  doc.text("Human Verification:", col3, y + 30);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${data.verifiedCount} of ${data.findings.length} findings verified`,
    col4,
    y + 30,
  );

  y += 44;

  // ── Overall Compliance Score & Status ──
  checkPageBreak(30);

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text(`${data.score}%`, margin + 8, y + 14);

  doc.setFontSize(9);
  doc.text("Overall Rule Coverage Score", margin + 35, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const scoreExplLines = doc.splitTextToSize(
    data.scoreExplanation ||
      "Calculated as: (Found items [1.0] + Needs Review items [0.5]) / Total Applicable Rules * 100. Measures presence of required clauses in document text, not legal validity.",
    contentWidth - 42,
  );
  doc.text(scoreExplLines, margin + 35, y + 13);

  y += 28;

  // ── Priority & Status Summary Metrics ──
  checkPageBreak(25);

  const highPriority = data.findings.filter((f) => f.priority === "High");
  const medPriority = data.findings.filter((f) => f.priority === "Medium");
  const lowPriority = data.findings.filter((f) => f.priority === "Low");

  const foundCount = data.findings.filter((f) => f.status === "Found").length;
  const missingCount = data.findings.filter((f) => f.status === "Missing").length;
  const reviewCount = data.findings.filter((f) => f.status === "Needs Review").length;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("2. Findings Summary by Priority & Status", margin, y);
  y += 5;

  const cardW = (contentWidth - 6) / 3;

  // Box 1: High Priority
  doc.setFillColor(254, 242, 242); // Red-50
  doc.setDrawColor(248, 113, 113); // Red-400
  doc.rect(margin, y, cardW, 16, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(153, 27, 27);
  doc.text("HIGH PRIORITY", margin + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    `${highPriority.filter((f) => f.status === "Missing").length} Missing | ${highPriority.filter((f) => f.status === "Needs Review").length} Review | ${highPriority.filter((f) => f.status === "Found").length} Found`,
    margin + 4,
    y + 11,
  );

  // Box 2: Medium Priority
  doc.setFillColor(255, 251, 235); // Amber-50
  doc.setDrawColor(251, 191, 36); // Amber-400
  doc.rect(margin + cardW + 3, y, cardW, 16, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(146, 64, 14);
  doc.text("MEDIUM PRIORITY", margin + cardW + 7, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    `${medPriority.filter((f) => f.status === "Missing").length} Missing | ${medPriority.filter((f) => f.status === "Needs Review").length} Review | ${medPriority.filter((f) => f.status === "Found").length} Found`,
    margin + cardW + 7,
    y + 11,
  );

  // Box 3: Low Priority / Advisory
  doc.setFillColor(240, 253, 244); // Green-50
  doc.setDrawColor(74, 222, 128); // Green-400
  doc.rect(margin + (cardW + 3) * 2, y, cardW, 16, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52);
  doc.text("LOW / ADVISORY", margin + (cardW + 3) * 2 + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    `${lowPriority.filter((f) => f.status === "Missing").length} Missing | ${lowPriority.filter((f) => f.status === "Found").length} Found`,
    margin + (cardW + 3) * 2 + 4,
    y + 11,
  );

  y += 22;

  // ── Detailed Findings Grouped by Priority ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("3. Detailed Audit Findings & Evidence", margin, y);
  y += 6;

  const priorityGroups: { priority: "High" | "Medium" | "Low"; title: string }[] = [
    { priority: "High", title: "High Priority Rules (Critical Statutory & Financial Requirements)" },
    { priority: "Medium", title: "Medium Priority Rules (Contractual & Governance Standards)" },
    { priority: "Low", title: "Low Priority Rules (Operational & Advisory Provisions)" },
  ];

  for (const grp of priorityGroups) {
    const groupFindings = data.findings.filter((f) => f.priority === grp.priority);
    if (groupFindings.length === 0) continue;

    checkPageBreak(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(grp.title, margin, y);
    y += 4;

    for (const f of groupFindings) {
      // Estimate height needed for this finding
      const baseHeight = 28;
      const evidenceLinesCount = f.evidence.length > 0 ? 10 : 0;
      const notesLinesCount = f.officerNotes ? 8 : 0;
      const totalItemHeight = baseHeight + evidenceLinesCount + notesLinesCount;

      checkPageBreak(totalItemHeight);

      // Card border
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, y, contentWidth, totalItemHeight, 1.5, 1.5, "FD");

      // Status indicator pill
      let statusColor = [34, 197, 94]; // Green
      if (f.status === "Missing") statusColor = [239, 68, 68]; // Red
      if (f.status === "Needs Review") statusColor = [245, 158, 11]; // Amber
      if (f.status === "Not Applicable") statusColor = [148, 163, 184]; // Gray

      doc.setFillColor(statusColor[0]!, statusColor[1]!, statusColor[2]!);
      doc.rect(margin, y, 3, totalItemHeight, "F");

      // Rule Title & Status Tag
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(f.ruleName, margin + 6, y + 5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(statusColor[0]!, statusColor[1]!, statusColor[2]!);
      doc.text(
        `[${f.status.toUpperCase()}]`,
        margin + 6 + doc.getTextWidth(f.ruleName) + 3,
        y + 5,
      );

      // Source reference
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const sourceLabel = `Source: ${f.source.name} (${f.source.type === "reference" ? "Official Reference" : "Demo Rule"} - ${f.source.authority}${f.source.version ? ` - ${f.source.version}` : ""})`;
      doc.text(sourceLabel, margin + 6, y + 10);

      // Explanation
      doc.setTextColor(51, 65, 85);
      const explLines = doc.splitTextToSize(`Explanation: ${f.explanation}`, contentWidth - 12);
      doc.text(explLines[0] || f.explanation, margin + 6, y + 15);

      let innerY = y + 20;

      // Evidence excerpt with page number
      if (f.evidence && f.evidence.length > 0) {
        const ev = f.evidence[0]!;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 58, 138); // Blue
        const quoteText = `Evidence (Page ${ev.pageNumber}): "${ev.text.slice(0, 130)}..."`;
        const quoteLines = doc.splitTextToSize(quoteText, contentWidth - 12);
        doc.text(quoteLines[0] || quoteText, margin + 6, innerY);
        innerY += 5;
      }

      // Human review status & Officer Notes
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const verText = f.humanVerified ? "Verified by Officer: YES" : "Verified by Officer: PENDING";
      doc.text(verText, margin + 6, innerY);

      if (f.officerNotes && f.officerNotes.trim()) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(` | Review Note: ${f.officerNotes.trim()}`, margin + 6 + doc.getTextWidth(verText), innerY);
      }

      y += totalItemHeight + 3;
    }

    y += 4;
  }

  // ── Signatures & Closing Block ──
  checkPageBreak(35);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("4. Review Sign-off", margin, y);
  y += 8;

  const sigW = (contentWidth - 20) / 2;

  // Officer Block
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, y + 15, margin + sigW, y + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Verifying Officer: ${data.officerName || "Procurement Officer"}`, margin, y + 19);
  doc.text(`Verification Date: ${data.auditDate}`, margin, y + 23);

  // Approving Officer Block
  doc.line(margin + sigW + 20, y + 15, pageWidth - margin, y + 15);
  doc.text("Competent Authority / Supervisor:", margin + sigW + 20, y + 19);
  doc.text("Date & Official Seal: ____________________", margin + sigW + 20, y + 23);

  // ── Footers on all pages ──
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);

    // Disclaimer
    const disLines = doc.splitTextToSize(MANDATORY_DISCLAIMER, contentWidth);
    doc.text(disLines[0] || MANDATORY_DISCLAIMER, margin, pageHeight - 10);

    // Page number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, {
      align: "right",
    });
  }

  return doc;
}

/**
 * Downloads the generated PDF audit report directly in the browser.
 */
export function downloadAuditReportPdf(data: AuditReportData) {
  const doc = generateAuditReportDoc(data);
  const cleanName = data.filename.replace(/\.pdf$/i, "").replace(/[^\w-]/g, "_");
  doc.save(`${cleanName}-audit-report.pdf`);
}
