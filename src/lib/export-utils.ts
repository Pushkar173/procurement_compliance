/**
 * CSV / PDF export utilities.
 *
 * Uses the Web Blob API for CSV generation (zero external deps).
 * Uses jsPDF for PDF certificate generation. If jsPDF is not installed,
 * falls back to a printable HTML window.
 */

import type { ComplianceItem, Contract, Tender } from "@/data/demoData";

// ───────────────────── CSV helpers ──────────────────────

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(","));
  }
  return lines.join("\r\n");
}

function downloadBlob(content: string, filename: string, mimeType = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF" + content], { type: mimeType }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// ───────────────────── Public API ──────────────────────

/**
 * Export a list of tenders as CSV.
 */
export function exportTendersCsv(tenders: Tender[]) {
  const headers = [
    "Tender ID", "Title", "Department", "Type", "Value (₹)",
    "Issue Date", "Closing Date", "Status", "Stage", "Officer",
  ];
  const rows = tenders.map((t) => [
    t.id, t.title, t.department, t.type, String(t.value),
    t.issueDate, t.closingDate, t.status, t.stage, t.officer,
  ]);
  const csv = buildCsv(headers, rows);
  downloadBlob(csv, `Tenders_Export_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Export contract performance summary as CSV.
 */
export function exportContractsCsv(
  contracts: Contract[],
  getCompliance: (contractId: string) => ComplianceItem[],
  compliancePct: (items: ComplianceItem[]) => number,
) {
  const headers = [
    "Contract ID", "Name", "Vendor", "Tender ID", "Value (₹)",
    "Start Date", "End Date", "Status", "Payment", "Department",
    "Manager", "Compliance %", "Total Requirements", "Compliant",
  ];
  const rows = contracts.map((c) => {
    const items = getCompliance(c.id);
    const compliant = items.filter((i) => i.status === "Compliant").length;
    return [
      c.id, c.name, c.vendor, c.tenderId, String(c.value),
      c.startDate, c.endDate, c.status, c.paymentStatus, c.department,
      c.manager, String(compliancePct(items)), String(items.length), String(compliant),
    ];
  });
  const csv = buildCsv(headers, rows);
  downloadBlob(csv, `Contracts_Performance_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Export full compliance matrix as CSV.
 */
export function exportComplianceCsv(items: ComplianceItem[]) {
  const headers = [
    "ID", "Requirement", "Source Document", "Tender ID", "Contract ID",
    "Status", "Applicable", "Included in Tender", "Evidence",
    "Responsible", "Due Date", "Completion Date", "Category", "Remarks",
  ];
  const rows = items.map((c) => [
    c.id, c.requirement, c.sourceDocId, c.tenderId ?? "", c.contractId ?? "",
    c.status, String(c.applicable), String(c.includedInTender), c.evidence,
    c.responsible, c.dueDate, c.completionDate, c.category, c.remarks,
  ]);
  const csv = buildCsv(headers, rows);
  downloadBlob(csv, `Compliance_Matrix_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Export audit trail as CSV/JSON.
 */
export function exportAuditCsv(
  events: { id: string; user: string; role: string; action: string; object: string; objectType: string; date: string; time: string; previous?: string; next?: string }[],
  format: "csv" | "json" = "csv",
) {
  if (format === "json") {
    const json = JSON.stringify(events, null, 2);
    downloadBlob(json, `Audit_Trail_${new Date().toISOString().slice(0, 10)}.json`, "application/json");
    return;
  }
  const headers = [
    "Event ID", "User", "Role", "Action", "Object", "Object Type",
    "Date", "Time", "Previous Value", "New Value",
  ];
  const rows = events.map((e) => [
    e.id, e.user, e.role, e.action, e.object, e.objectType,
    e.date, e.time, e.previous ?? "", e.next ?? "",
  ]);
  const csv = buildCsv(headers, rows);
  downloadBlob(csv, `Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Generate a printable compliance certificate as an HTML page.
 * Opens a new window with print-friendly formatting.
 */
export function generateComplianceCertificatePdf(
  tender: Tender,
  items: ComplianceItem[],
  compliancePct: number,
  officerName: string,
) {
  const satisfiedClauses = items
    .filter((i) => i.status === "Compliant")
    .map((i) => `<li style="margin-bottom:4px">${i.requirement} <em style="color:#666">(${i.sourceDocId})</em></li>`)
    .join("");

  const pendingClauses = items
    .filter((i) => i.status !== "Compliant" && i.status !== "Not Applicable")
    .map((i) => `<li style="margin-bottom:4px">${i.requirement} — <strong>${i.status}</strong></li>`)
    .join("");

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Compliance Certificate — ${tender.id}</title>
  <style>
    @media print { body { margin: 0; } .no-print { display: none; } }
    body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.6; }
    .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: 1px; }
    .header p { color: #666; margin: 0; font-size: 13px; }
    .badge { display: inline-block; background: ${compliancePct >= 80 ? "#16a34a" : compliancePct >= 50 ? "#ca8a04" : "#dc2626"}; color: white; padding: 4px 16px; border-radius: 20px; font-size: 20px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e5e5; font-size: 13px; }
    th { font-weight: 600; color: #666; width: 180px; }
    .section { margin-top: 24px; }
    .section h2 { font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    .signature { margin-top: 48px; display: flex; justify-content: space-between; }
    .sig-block { text-align: center; min-width: 200px; }
    .sig-line { border-top: 1px solid #333; margin-top: 48px; padding-top: 8px; font-size: 13px; }
    .btn { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .btn:hover { background: #1d4ed8; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:20px">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="header">
    <h1>COMPLIANCE CERTIFICATE</h1>
    <p>ProcureComply — Procurement Compliance & Contract Management System</p>
  </div>

  <table>
    <tr><th>Tender ID</th><td>${tender.id}</td></tr>
    <tr><th>Tender Title</th><td>${tender.title}</td></tr>
    <tr><th>Department</th><td>${tender.department}</td></tr>
    <tr><th>Estimated Value</th><td>₹${tender.value.toLocaleString("en-IN")}</td></tr>
    <tr><th>Procurement Method</th><td>${tender.type}</td></tr>
    <tr><th>Issue Date</th><td>${tender.issueDate}</td></tr>
    <tr><th>Closing Date</th><td>${tender.closingDate}</td></tr>
    <tr><th>Status</th><td>${tender.status}</td></tr>
    <tr><th>Certificate Date</th><td>${dateStr}</td></tr>
  </table>

  <div style="text-align:center;margin:24px 0">
    <p style="color:#666;margin-bottom:8px">Overall Compliance Score</p>
    <span class="badge">${compliancePct}%</span>
    <p style="margin-top:8px;font-size:13px;color:#666">
      ${items.filter((i) => i.status === "Compliant").length} of ${items.filter((i) => i.status !== "Not Applicable").length} applicable requirements satisfied
    </p>
  </div>

  <div class="section">
    <h2>✓ Satisfied Clauses (${items.filter((i) => i.status === "Compliant").length})</h2>
    ${satisfiedClauses ? `<ul>${satisfiedClauses}</ul>` : "<p><em>None</em></p>"}
  </div>

  ${pendingClauses ? `
  <div class="section">
    <h2>⚠ Pending / Non-Compliant Items (${items.filter((i) => i.status !== "Compliant" && i.status !== "Not Applicable").length})</h2>
    <ul>${pendingClauses}</ul>
  </div>` : ""}

  <div class="signature">
    <div class="sig-block">
      <div class="sig-line">
        <strong>${officerName}</strong><br/>
        Verifying Officer<br/>
        Date: ${dateStr}
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-line">
        <strong>Approving Authority</strong><br/>
        Designation: ____________<br/>
        Date: ____________
      </div>
    </div>
  </div>

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:11px;color:#999;text-align:center">
    This certificate was generated by ProcureComply on ${now.toISOString()}. It is valid only with authorized signatures.
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
