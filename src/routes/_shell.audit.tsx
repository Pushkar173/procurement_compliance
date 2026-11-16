import { createFileRoute } from "@tanstack/react-router";
import { Download, History, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Pill } from "@/components/common/badges";
import {
  Btn,
  DemoNotice,
  EmptyState,
  PageHeader,
  Panel,
  SearchInput,
  Select,
  TableShell,
  Td,
  Th,
} from "@/components/common/primitives";
import { useStore } from "@/store/app-store";
import { exportAuditCsv } from "@/lib/export-utils";
import type { AuditEvent } from "@/data/demoData";

export const Route = createFileRoute("/_shell/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail — ProcureComply" },
      {
        name: "description",
        content: "Immutable chronological log of all system actions for statutory compliance.",
      },
    ],
  }),
  component: AuditPage,
});

const OBJECT_TYPES = ["Document", "Tender", "Contract", "Compliance", "Report", "User", "Session"];

function AuditPage() {
  const { audit } = useStore();
  const [query, setQuery] = useState("");
  const [objectType, setObjectType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return audit.filter((e) => {
      const haystack = [e.id, e.user, e.action, e.object, e.objectType, e.date]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      const matchesType = !objectType || e.objectType === objectType;

      let matchesDate = true;
      if (dateFrom || dateTo) {
        // Simple string-based date comparison for demo data format "DD Mon YYYY" or "Oct 6, 2026"
        // This works best with ISO dates but handles demo dates gracefully
        const eventDate = new Date(e.date);
        if (dateFrom && !isNaN(new Date(dateFrom).getTime())) {
          matchesDate = matchesDate && eventDate >= new Date(dateFrom);
        }
        if (dateTo && !isNaN(new Date(dateTo).getTime())) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59);
          matchesDate = matchesDate && eventDate <= to;
        }
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [audit, query, objectType, dateFrom, dateTo]);

  const activeFilters = [query, objectType, dateFrom, dateTo].filter(Boolean).length;

  const clearFilters = () => {
    setQuery("");
    setObjectType("");
    setDateFrom("");
    setDateTo("");
  };

  const handleExport = () => {
    exportAuditCsv(filtered, exportFormat);
    toast.success(`Audit trail exported as ${exportFormat.toUpperCase()}`, {
      description: `${filtered.length} events exported.`,
    });
  };

  const objectTypeColor: Record<
    AuditEvent["objectType"],
    "info" | "primary" | "success" | "warning" | "neutral" | "danger"
  > = {
    Document: "info",
    Tender: "primary",
    Contract: "success",
    Compliance: "warning",
    Report: "neutral",
    User: "danger",
    Session: "neutral",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        subtitle="Immutable, chronological log of every system action for statutory compliance and accountability."
        actions={
          <>
            <Pill tone="primary">{audit.length} total events</Pill>
          </>
        }
      />

      <DemoNotice />

      {/* Filters */}
      <Panel bodyClassName="space-y-4 p-5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search actions, users, objects…"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Object Type"
            value={objectType}
            options={OBJECT_TYPES}
            onChange={setObjectType}
            allLabel="All types"
          />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Date From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Date To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Export Format</span>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as "csv" | "json")}
              className="h-10 rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
            {audit.length} events
            {activeFilters > 0 &&
              ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""} applied`}
          </p>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={clearFilters} disabled={activeFilters === 0}>
              <RotateCcw className="size-3.5" /> Clear filters
            </Btn>
            <Btn size="sm" variant="outline" onClick={handleExport}>
              <Download className="size-3.5" /> Export Statutory Audit Report
            </Btn>
          </div>
        </div>
      </Panel>

      {/* Audit Table */}
      <Panel title="Event Log" bodyClassName="p-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching audit events."
            description="Try a different search term or clear the filters."
            action={
              <Btn variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Btn>
            }
          />
        ) : (
          <TableShell
            head={
              <>
                <Th>Time</Th>
                <Th>User</Th>
                <Th>Role</Th>
                <Th>Action</Th>
                <Th>Object</Th>
                <Th>Type</Th>
                <Th>Previous</Th>
                <Th>New</Th>
              </>
            }
          >
            {filtered.map((e) => (
              <tr key={e.id} className="transition-colors hover:bg-accent/40">
                <Td className="whitespace-nowrap text-xs text-muted-foreground">
                  <div>{e.date}</div>
                  <div className="text-[10px]">{e.time}</div>
                </Td>
                <Td className="text-sm font-medium">{e.user}</Td>
                <Td>
                  <Pill tone="neutral">{e.role}</Pill>
                </Td>
                <Td className="text-sm">{e.action}</Td>
                <Td className="max-w-48 truncate text-sm text-muted-foreground">{e.object}</Td>
                <Td>
                  <Pill tone={objectTypeColor[e.objectType] ?? "neutral"}>{e.objectType}</Pill>
                </Td>
                <Td className="max-w-32 truncate text-xs text-muted-foreground">
                  {e.previous || "—"}
                </Td>
                <Td className="max-w-32 truncate text-xs text-muted-foreground">{e.next || "—"}</Td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      {/* Integrity Notice */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-4 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Audit records are immutable and cannot be edited or deleted. All timestamps are recorded
          at the time of the action. Exports include a complete, unaltered event log suitable for
          statutory audit requirements.
        </p>
      </div>
    </div>
  );
}
