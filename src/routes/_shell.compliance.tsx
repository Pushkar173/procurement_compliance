import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ClipboardCheck, RotateCcw, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { Pill } from "@/components/common/badges";
import {
  Btn,
  DemoNotice,
  PageHeader,
  Panel,
  SearchInput,
  Select,
  StatCard,
  WorkflowStrip,
} from "@/components/common/primitives";
import { ComplianceProgress, ComplianceTable } from "@/components/compliance/compliance-table";
import { COMPLIANCE_STATUSES } from "@/data/demoData";
import { compliancePercent, statusCounts, useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell/compliance")({
  validateSearch: (search: Record<string, unknown>) => ({
    tender: typeof search.tender === "string" ? search.tender : "",
    contract: typeof search.contract === "string" ? search.contract : "",
  }),
  head: () => ({
    meta: [
      { title: "Compliance Management — ProcureComply" },
      {
        name: "description",
        content:
          "Requirement-wise compliance checklist linking each regulation to its tender or contract, evidence, remarks and current status.",
      },
      { property: "og:title", content: "Compliance Management — ProcureComply" },
      {
        property: "og:description",
        content: "Track applicable requirements, evidence and compliance status in one checklist.",
      },
    ],
  }),
  loader: async ({ deps }) => {
    return { dbCompliance: [], dbDocuments: [], dbTenders: [], dbContracts: [] };
  },
  component: CompliancePage,
});

function CompliancePage() {
  const { dbCompliance } = Route.useLoaderData();
  const { compliance: storeCompliance, documents, tenders, contracts } = useStore();
  const compliance = dbCompliance.length > 0 ? dbCompliance : storeCompliance;
  const search = Route.useSearch();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [scope, setScope] = useState(search.tender || search.contract || "");

  const scopeOptions = useMemo(
    () => [...tenders.map((t) => t.id), ...contracts.map((c) => c.id)],
    [tenders, contracts],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return compliance.filter((c) => {
      const scopeId = c.tenderId ?? c.contractId ?? "";
      return (
        (!term || [c.id, c.requirement, c.remarks, c.responsible, c.sourceDocId].join(" ").toLowerCase().includes(term)) &&
        (!status || c.status === status) &&
        (!source || c.sourceDocId === source) &&
        (!scope || scopeId === scope)
      );
    });
  }, [compliance, query, status, source, scope]);

  const counts = statusCounts(compliance);
  const activeFilters = [query, status, source, scope].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Management"
        subtitle="Every requirement is traced from its source regulation to the tender or contract it applies to, the evidence on record and its current status."
        actions={<Pill tone="primary">Overall compliance {compliancePercent(compliance)}%</Pill>}
      />

      <DemoNotice />
      <WorkflowStrip active="Status" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Compliant" value={counts.Compliant} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending" value={counts.Pending} icon={ClipboardCheck} tone="warning" />
        <StatCard label="Partially Compliant" value={counts["Partially Compliant"]} icon={ClipboardCheck} tone="caution" />
        <StatCard label="Non-Compliant" value={counts["Non-Compliant"]} icon={TriangleAlert} tone="info" />
      </div>

      <Panel title="Overall Compliance">
        <ComplianceProgress items={filtered.length > 0 ? filtered : compliance} />
      </Panel>

      <Panel bodyClassName="space-y-4 p-5">
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <SearchInput value={query} onChange={setQuery} placeholder="Search requirement, remark, officer…" />
          <Select label="Status" value={status} options={COMPLIANCE_STATUSES} onChange={setStatus} allLabel="All statuses" />
          <Select
            label="Source Regulation"
            value={source}
            options={documents.map((d) => d.id)}
            onChange={setSource}
            allLabel="All documents"
          />
          <Select label="Tender / Contract" value={scope} options={scopeOptions} onChange={setScope} allLabel="All records" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {compliance.length} requirements
          </p>
          <Btn
            variant="ghost"
            size="sm"
            disabled={activeFilters === 0}
            onClick={() => {
              setQuery("");
              setStatus("");
              setSource("");
              setScope("");
            }}
          >
            <RotateCcw className="size-3.5" /> Clear filters
          </Btn>
        </div>
      </Panel>

      <Panel title="Compliance Checklist" description="Update status, evidence, remarks and responsibility; every change is written to the audit trail">
        <ComplianceTable
          items={filtered}
          showScopeColumn
          scopeLabel={scope ? `Requirements for ${scope}` : "All compliance requirements"}
          defaultScope={
            scope
              ? tenders.some((t) => t.id === scope)
                ? { tenderId: scope }
                : { contractId: scope }
              : undefined
          }
        />
      </Panel>
    </div>
  );
}
