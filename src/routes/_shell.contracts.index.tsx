import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Building2, Download, Eye, FileCheck2, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ContractStatusBadge, Pill } from "@/components/common/badges";
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
import { DEPARTMENTS } from "@/data/demoData";
import { compliancePercent, formatINR, useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell/contracts/")({
  head: () => ({
    meta: [
      { title: "Contract Management — ProcureComply" },
      {
        name: "description",
        content:
          "Monitor contracts, vendors, milestones, renewal dates and contract-stage compliance in one register.",
      },
      { property: "og:title", content: "Contract Management — ProcureComply" },
      {
        property: "og:description",
        content: "Contract register with milestones, deadlines and compliance.",
      },
    ],
  }),
  loader: async () => {
    return { dbContracts: [], dbCompliance: [] };
  },
  component: ContractsPage,
});

function ContractsPage() {
  const { dbContracts } = Route.useLoaderData();
  const { contracts: storeContracts, compliance, updateContract, user } = useStore();
  const contracts = dbContracts.length > 0 ? dbContracts : storeContracts;

  const role = user?.role;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return contracts.filter(
      (c) =>
        (!term ||
          [c.id, c.name, c.vendor, c.tenderId, c.manager].join(" ").toLowerCase().includes(term)) &&
        (!status || c.status === status) &&
        (!department || c.department === department),
    );
  }, [contracts, query, status, department]);

  const alerts = contracts.filter((c) => c.status === "Expiring Soon");
  const activeFilters = [query, status, department].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contract Management"
        subtitle="Track contract execution, milestones, renewal timelines and contract-stage compliance."
        actions={
          <Btn
            size="sm"
            variant="outline"
            onClick={() =>
              toast.info("Export is a demo action", {
                description: "The filtered contract register would be exported.",
              })
            }
          >
            <Download className="size-4" /> Export
          </Btn>
        }
      />

      <DemoNotice />

      {alerts.length > 0 && (
        <Panel title="Deadline Alerts" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {alerts.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-warning/20 text-warning-foreground">
                  <AlertTriangle className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    Contract {c.id} expires on {c.endDate}.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Renewal documentation pending · milestone verification pending for “
                    {c.milestones.find((m) => m.status === "In Progress")?.name ??
                      "current milestone"}
                    ”.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/contracts/$contractId" params={{ contractId: c.id }}>
                    <Btn size="sm" variant="outline">
                      <Eye className="size-3.5" /> View Contract
                    </Btn>
                  </Link>
                  <Btn
                    size="sm"
                    variant="outline"
                    disabled={
                      role === "auditor" ||
                      (role === "officer" && c.manager !== (user?.name || "Pushkar Bhati"))
                    }
                    onClick={() => {
                      updateContract(c.id, { paymentStatus: "On Schedule" });
                      toast.success(`${c.id} updated`, {
                        description: "Payment status set to On Schedule.",
                      });
                    }}
                  >
                    Update Status
                  </Btn>
                  <Link to="/reports" search={{ contract: c.id }}>
                    <Btn size="sm" variant="ghost">
                      <FileCheck2 className="size-3.5" /> Generate Report
                    </Btn>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel bodyClassName="space-y-4 p-5">
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search contract ID, vendor, related tender…"
          />
          <Select
            label="Status"
            value={status}
            options={["Active", "Expiring Soon", "Completed", "Terminated"]}
            onChange={setStatus}
            allLabel="All statuses"
          />
          <Select
            label="Department"
            value={department}
            options={DEPARTMENTS}
            onChange={setDepartment}
            allLabel="All departments"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
            {contracts.length} contracts
          </p>
          <Btn
            variant="ghost"
            size="sm"
            disabled={activeFilters === 0}
            onClick={() => {
              setQuery("");
              setStatus("");
              setDepartment("");
            }}
          >
            <RotateCcw className="size-3.5" /> Clear filters
          </Btn>
        </div>
      </Panel>

      <Panel title="Contract Register" bodyClassName="p-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No contracts match the current filters."
            description="Adjust the search or clear the filters."
          />
        ) : (
          <TableShell
            head={
              <>
                <Th>Contract ID</Th>
                <Th>Contract Name</Th>
                <Th>Vendor</Th>
                <Th>Related Tender</Th>
                <Th>Value</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Status</Th>
                <Th>Compliance</Th>
                <Th className="text-right">Actions</Th>
              </>
            }
          >
            {filtered.map((c) => {
              const items = compliance.filter((x) => x.contractId === c.id);
              return (
                <tr key={c.id} className="transition-colors hover:bg-accent/40">
                  <Td className="font-mono text-xs font-medium">{c.id}</Td>
                  <Td>
                    <Link
                      to="/contracts/$contractId"
                      params={{ contractId: c.id }}
                      className="text-sm font-medium hover:text-primary hover:underline"
                    >
                      {c.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{c.department}</p>
                  </Td>
                  <Td className="text-sm text-muted-foreground">{c.vendor}</Td>
                  <Td>
                    <Link
                      to="/tenders/$tenderId"
                      params={{ tenderId: c.tenderId }}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {c.tenderId}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap text-sm font-medium">{formatINR(c.value)}</Td>
                  <Td className="whitespace-nowrap text-sm text-muted-foreground">{c.startDate}</Td>
                  <Td className="whitespace-nowrap text-sm text-muted-foreground">{c.endDate}</Td>
                  <Td>
                    <ContractStatusBadge status={c.status} />
                  </Td>
                  <Td className="min-w-32">
                    {items.length === 0 ? (
                      <Pill>No checklist</Pill>
                    ) : (
                      <ProgressBar
                        value={compliancePercent(items)}
                        label={`${items.length} reqs`}
                      />
                    )}
                  </Td>
                  <Td className="text-right">
                    <Link to="/contracts/$contractId" params={{ contractId: c.id }}>
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
    </div>
  );
}
