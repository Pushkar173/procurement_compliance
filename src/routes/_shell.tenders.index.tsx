import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Eye, FileSearch, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Pill, TenderStatusBadge } from "@/components/common/badges";
import {
  Btn,
  DemoNotice,
  EmptyState,
  PageHeader,
  Panel,
  ProgressBar,
  SearchInput,
  Select,
  TableShell,
  Td,
  Th,
} from "@/components/common/primitives";
import { CreateTenderWizard } from "@/components/tenders/create-tender-wizard";
import { DEPARTMENTS } from "@/data/demoData";
import { compliancePercent, formatINR, useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell/tenders/")({
  head: () => ({
    meta: [
      { title: "Tender Management — ProcureComply" },
      {
        name: "description",
        content:
          "Manage tender records, applicable regulations and requirement-wise compliance for each tender.",
      },
      { property: "og:title", content: "Tender Management — ProcureComply" },
      {
        property: "og:description",
        content: "Tender records with applicable regulations and compliance status.",
      },
    ],
  }),
  loader: async () => {
    return { dbTenders: [], dbCompliance: [] };
  },
  component: TendersPage,
});

function TendersPage() {
  const { dbTenders } = Route.useLoaderData();
  const { tenders: storeTenders, compliance, user } = useStore();
  const tenders = dbTenders.length > 0 ? dbTenders : storeTenders;

  const role = user?.role;
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tenders.filter(
      (t) =>
        (!term ||
          [t.id, t.title, t.department, t.officer, t.description]
            .join(" ")
            .toLowerCase()
            .includes(term)) &&
        (!department || t.department === department) &&
        (!status || t.status === status),
    );
  }, [tenders, query, department, status]);

  const activeFilters = [query, department, status].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tender Management"
        subtitle="Create tenders, attach the regulations that apply, and track the resulting compliance checklist."
        actions={
          <>
            {role !== "auditor" && (
              <Btn size="sm" onClick={() => setWizardOpen(true)}>
                <Plus className="size-4" /> Create Tender
              </Btn>
            )}
            <Btn
              size="sm"
              variant="outline"
              onClick={() =>
                toast.info("Export is a demo action", {
                  description: "Filtered tenders would be exported as CSV.",
                })
              }
            >
              <Download className="size-4" /> Export
            </Btn>
          </>
        }
      />

      <DemoNotice />

      <Panel bodyClassName="space-y-4 p-5">
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search tender ID, title, officer…"
          />
          <Select
            label="Department"
            value={department}
            options={DEPARTMENTS}
            onChange={setDepartment}
            allLabel="All departments"
          />
          <Select
            label="Status"
            value={status}
            options={["Draft", "Under Review", "Published", "Evaluation", "Awarded", "Closed"]}
            onChange={setStatus}
            allLabel="All statuses"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
            {tenders.length} tenders
          </p>
          <Btn
            variant="ghost"
            size="sm"
            disabled={activeFilters === 0}
            onClick={() => {
              setQuery("");
              setDepartment("");
              setStatus("");
            }}
          >
            <RotateCcw className="size-3.5" /> Clear filters
          </Btn>
        </div>
      </Panel>

      <Panel title="Tender Records" bodyClassName="p-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No tenders match the current filters."
            description="Adjust the search or create a new tender."
            action={
              role !== "auditor" ? (
                <Btn size="sm" onClick={() => setWizardOpen(true)}>
                  <Plus className="size-4" /> Create Tender
                </Btn>
              ) : undefined
            }
          />
        ) : (
          <TableShell
            head={
              <>
                <Th>Tender ID</Th>
                <Th>Tender Title</Th>
                <Th>Department</Th>
                <Th>Estimated Value</Th>
                <Th>Issue Date</Th>
                <Th>Closing Date</Th>
                <Th>Status</Th>
                <Th>Compliance</Th>
                <Th className="text-right">Actions</Th>
              </>
            }
          >
            {filtered.map((t) => {
              const items = compliance.filter((c) => c.tenderId === t.id);
              const pct = compliancePercent(items);
              return (
                <tr key={t.id} className="transition-colors hover:bg-accent/40">
                  <Td className="font-mono text-xs font-medium">{t.id}</Td>
                  <Td>
                    <Link
                      to="/tenders/$tenderId"
                      params={{ tenderId: t.id }}
                      className="text-sm font-medium hover:text-primary hover:underline"
                    >
                      {t.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{t.type}</p>
                  </Td>
                  <Td className="text-sm text-muted-foreground">{t.department}</Td>
                  <Td className="whitespace-nowrap text-sm font-medium">{formatINR(t.value)}</Td>
                  <Td className="whitespace-nowrap text-sm text-muted-foreground">{t.issueDate}</Td>
                  <Td className="whitespace-nowrap text-sm text-muted-foreground">
                    {t.closingDate}
                  </Td>
                  <Td>
                    <TenderStatusBadge status={t.status} />
                  </Td>
                  <Td className="min-w-32">
                    {items.length === 0 ? (
                      <Pill>No checklist</Pill>
                    ) : (
                      <ProgressBar value={pct} label={`${items.length} reqs`} />
                    )}
                  </Td>
                  <Td className="text-right">
                    <Link to="/tenders/$tenderId" params={{ tenderId: t.id }}>
                      <Btn size="sm" variant="outline">
                        <Eye className="size-3.5" /> Open
                      </Btn>
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </TableShell>
        )}
      </Panel>

      <CreateTenderWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
