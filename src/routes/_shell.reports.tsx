import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Pill } from "@/components/common/badges";
import {
  Btn,
  DemoNotice,
  PageHeader,
  Panel,
  ProgressBar,
  Select,
  StatCard,
} from "@/components/common/primitives";
import { DEPARTMENTS } from "@/data/demoData";
import { compliancePercent, statusCounts, useStore } from "@/store/app-store";
import {
  exportTendersCsv,
  exportContractsCsv,
  exportComplianceCsv,
  generateComplianceCertificatePdf,
} from "@/lib/export-utils";

export const Route = createFileRoute("/_shell/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Exports — ProcureComply" },
      {
        name: "description",
        content: "Generate compliance certificates, export tenders, contracts and audit data.",
      },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { tenders, contracts, compliance, user } = useStore();
  const [certTender, setCertTender] = useState("");
  const [dept, setDept] = useState("");

  const filteredTenders = useMemo(
    () => (dept ? tenders.filter((t) => t.department === dept) : tenders),
    [tenders, dept],
  );

  const filteredContracts = useMemo(
    () => (dept ? contracts.filter((c) => c.department === dept) : contracts),
    [contracts, dept],
  );

  const filteredCompliance = useMemo(() => {
    if (!dept) return compliance;
    const tenderIds = new Set(filteredTenders.map((t) => t.id));
    const contractIds = new Set(filteredContracts.map((c) => c.id));
    return compliance.filter(
      (c) =>
        (c.tenderId && tenderIds.has(c.tenderId)) ||
        (c.contractId && contractIds.has(c.contractId)),
    );
  }, [compliance, dept, filteredTenders, filteredContracts]);

  const counts = statusCounts(filteredCompliance);
  const pct = compliancePercent(filteredCompliance);

  const getContractCompliance = (contractId: string) =>
    compliance.filter((c) => c.contractId === contractId);

  const selectedTender = tenders.find((t) => t.id === certTender);
  const certItems = certTender ? compliance.filter((c) => c.tenderId === certTender) : [];
  const certPct = compliancePercent(certItems);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Exports"
        subtitle="Generate compliance reports, export data, and download compliance certificates."
        actions={
          <Select
            label="Filter by Department"
            value={dept}
            options={DEPARTMENTS}
            onChange={setDept}
            allLabel="All departments"
          />
        }
      />

      <DemoNotice />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Requirements"
          value={filteredCompliance.length}
          icon={ClipboardCheck}
          hint={`${pct}% compliant`}
        />
        <StatCard
          label="Compliant"
          value={counts.Compliant ?? 0}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Pending / Partial"
          value={(counts.Pending ?? 0) + (counts["Partially Compliant"] ?? 0)}
          icon={BarChart3}
          tone="warning"
        />
        <StatCard
          label="Non-Compliant"
          value={counts["Non-Compliant"] ?? 0}
          icon={BarChart3}
          tone="caution"
        />
      </div>

      {/* Compliance Overview Bar */}
      <Panel title="Overall Compliance Score" bodyClassName="p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">
            {dept || "All departments"} · {filteredCompliance.length} requirements
          </p>
          <p className="text-3xl font-bold">{pct}%</p>
        </div>
        <ProgressBar value={pct} />
      </Panel>

      {/* Export Buttons */}
      <Panel
        title="Data Exports"
        description="Download filtered data as CSV spreadsheets"
        bodyClassName="p-5"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => {
              exportTendersCsv(filteredTenders);
              toast.success("Tenders CSV downloaded", {
                description: `${filteredTenders.length} records exported.`,
              });
            }}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
          >
            <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Tenders List</p>
              <p className="text-xs text-muted-foreground">
                {filteredTenders.length} records · CSV
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              exportContractsCsv(filteredContracts, getContractCompliance, compliancePercent);
              toast.success("Contracts CSV downloaded", {
                description: `${filteredContracts.length} records exported.`,
              });
            }}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
          >
            <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Contracts Performance</p>
              <p className="text-xs text-muted-foreground">
                {filteredContracts.length} records · CSV
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              exportComplianceCsv(filteredCompliance);
              toast.success("Compliance CSV downloaded", {
                description: `${filteredCompliance.length} records exported.`,
              });
            }}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50"
          >
            <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Full Compliance Matrix</p>
              <p className="text-xs text-muted-foreground">
                {filteredCompliance.length} records · CSV
              </p>
            </div>
          </button>
        </div>
      </Panel>

      {/* Compliance Certificate Generator */}
      <Panel
        title="Compliance Certificate (PDF)"
        description="Generate a printable compliance certificate for a tender"
        bodyClassName="p-5 space-y-4"
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-64 flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Select Tender</span>
            <select
              value={certTender}
              onChange={(e) => setCertTender(e.target.value)}
              className="h-10 rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            >
              <option value="">Choose a tender…</option>
              {tenders.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} — {t.title}
                </option>
              ))}
            </select>
          </label>

          <Btn
            disabled={!certTender}
            onClick={() => {
              if (!selectedTender) return;
              generateComplianceCertificatePdf(
                selectedTender,
                certItems,
                certPct,
                user?.name ?? "Procurement Officer",
              );
              toast.success("Certificate generated", {
                description: `Compliance certificate for ${certTender} opened in a new tab.`,
              });
            }}
          >
            <Printer className="size-4" /> Generate Certificate
          </Btn>
        </div>

        {certTender && selectedTender && (
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm font-semibold">{selectedTender.title}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedTender.id} · {selectedTender.department} · {selectedTender.status}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{certPct}%</p>
                <p className="text-xs text-muted-foreground">compliance score</p>
              </div>
            </div>
            <ProgressBar value={certPct} />
            <div className="flex flex-wrap gap-2 text-xs">
              <Pill tone="success">
                {certItems.filter((i) => i.status === "Compliant").length} Compliant
              </Pill>
              <Pill tone="warning">
                {
                  certItems.filter(
                    (i) => i.status === "Pending" || i.status === "Partially Compliant",
                  ).length
                }{" "}
                Pending
              </Pill>
              <Pill tone="danger">
                {certItems.filter((i) => i.status === "Non-Compliant").length} Non-Compliant
              </Pill>
            </div>
          </div>
        )}
      </Panel>

      {/* Recent Reports (from store) */}
      <Panel title="Generated Reports" bodyClassName="p-0">
        {/* Placeholder — reports generated in this session appear here */}
        <div className="px-5 py-8 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">
            Export data above to create downloadable reports. Generated files are saved to your
            downloads folder.
          </p>
        </div>
      </Panel>
    </div>
  );
}
