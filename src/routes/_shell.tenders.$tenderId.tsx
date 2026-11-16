import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  FileCheck2,
  FilePlus2,
  FileText,
  PencilLine,
  RefreshCw,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Pill, TenderStatusBadge } from "@/components/common/badges";
import {
  Btn,
  DemoNotice,
  EmptyState,
  KeyValue,
  PageHeader,
  Panel,
  TableShell,
  Td,
  Th,
  WorkflowStrip,
} from "@/components/common/primitives";
import { ComplianceProgress, ComplianceTable } from "@/components/compliance/compliance-table";
import {
  LIFECYCLE_STAGES,
  type Tender,
  type ComplianceItem,
  type RegDocument,
  type Contract,
  type AuditEvent,
} from "@/data/demoData";
import { formatINR, useStore } from "@/store/app-store";
export const Route = createFileRoute("/_shell/tenders/$tenderId")({
  head: ({ params }) => ({
    meta: [
      { title: `Tender ${params.tenderId} — ProcureComply` },
      {
        name: "description",
        content: `Tender ${params.tenderId}: applicable regulations, compliance checklist, documents, timeline and activity history.`,
      },
      { property: "og:title", content: `Tender ${params.tenderId} — ProcureComply` },
      {
        property: "og:description",
        content: "Tender record with applicable regulations and compliance checklist.",
      },
    ],
  }),
  loader: async () => {
    return {
      dbTender: null as Tender | null,
      dbCompliance: [] as ComplianceItem[],
      dbDocuments: [] as RegDocument[],
      dbContracts: [] as Contract[],
      dbAudit: [] as AuditEvent[],
    };
  },
  component: TenderDetail,
  notFoundComponent: () => (
    <EmptyState
      icon={FileText}
      title="Tender not found."
      description="The tender you are looking for does not exist in the demo data."
      action={
        <Link to="/tenders">
          <Btn size="sm" variant="outline">
            Back to tenders
          </Btn>
        </Link>
      }
    />
  ),
});

function TenderDetail() {
  const { dbTender } = Route.useLoaderData();
  const { tenderId } = Route.useParams();
  const { tenders: storeTenders, documents, compliance, contracts, audit, user } = useStore();
  const role = user?.role;

  const storeTender = storeTenders.find((t) => t.id === tenderId);
  const tender = dbTender || storeTender;
  if (!tender) throw notFound();

  const items = compliance.filter((c) => c.tenderId === tender.id);
  const regs = documents.filter((d) => tender.regulationIds.includes(d.id));
  const linkedContracts = contracts.filter((c) => c.tenderId === tender.id);
  const history = audit.filter(
    (a) => a.object.includes(tender.id) || items.some((i) => a.object.includes(i.id)),
  );
  const stageIndex = LIFECYCLE_STAGES.indexOf(tender.stage);

  // RBAC: Admin can edit anything. Officer can only edit if they are the officer (or created_by in real DB). Auditor cannot edit.
  // Using tender.officer for mock data comparison since we don't have created_by yet.
  const canEdit =
    role === "admin" || (role === "officer" && tender.officer === (user?.name || "Pushkar Bhati"));

  return (
    <div className="space-y-6">
      <Link
        to="/tenders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Tender Management
      </Link>

      <PageHeader
        title={tender.title}
        subtitle={`${tender.id} · ${tender.department} · ${tender.type}`}
        actions={
          <>
            <TenderStatusBadge status={tender.status} />
            <Btn
              size="sm"
              variant="outline"
              disabled={!canEdit}
              onClick={() =>
                toast.info("Edit is a demo action", {
                  description: "Tender fields would open in an editable form.",
                })
              }
            >
              <PencilLine className="size-3.5" /> Edit
            </Btn>
            <Link to="/compliance" search={{ tender: tender.id, contract: "" }}>
              <Btn size="sm">
                <RefreshCw className="size-3.5" /> Update Compliance
              </Btn>
            </Link>
            <Btn
              size="sm"
              variant="outline"
              disabled={!canEdit}
              onClick={() =>
                toast.info("Add Document is a demo action", {
                  description: "A file would be attached to this tender file.",
                })
              }
            >
              <FilePlus2 className="size-3.5" /> Add Document
            </Btn>
            <Link to="/reports" search={{ tender: tender.id }}>
              <Btn size="sm" variant="outline">
                <FileCheck2 className="size-3.5" /> Generate Report
              </Btn>
            </Link>
          </>
        }
      />

      {role === "officer" && !canEdit && (
        <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm text-warning-foreground flex items-center gap-2">
          You are viewing another officer's tender. Edit actions are restricted.
        </div>
      )}

      <DemoNotice />
      <WorkflowStrip active="Tender / Contract" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Tender Information" className="lg:col-span-2">
          <KeyValue
            items={[
              { label: "Tender ID", value: tender.id },
              { label: "Department", value: tender.department },
              { label: "Tender Type", value: tender.type },
              { label: "Estimated Value", value: formatINR(tender.value) },
              { label: "Publication Date", value: tender.issueDate },
              { label: "Submission Deadline", value: tender.closingDate },
              { label: "Evaluation Date", value: tender.evaluationDate },
              { label: "Current Lifecycle Stage", value: tender.stage },
            ]}
          />
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Description
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">{tender.description}</p>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Compliance Status">
            <ComplianceProgress items={items} />
            <p className="mt-3 text-xs text-muted-foreground">
              Calculated over applicable requirements; partially compliant items count as half.
            </p>
          </Panel>
          <Panel title="Responsible Officer">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                <UserCircle2 className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">{tender.officer}</p>
                <p className="text-xs text-muted-foreground">{tender.department}</p>
              </div>
            </div>
          </Panel>
          <Panel title="Important Dates" bodyClassName="p-0">
            <ul className="divide-y divide-border text-sm">
              {[
                ["Published", tender.issueDate],
                ["Submission closes", tender.closingDate],
                ["Evaluation", tender.evaluationDate],
              ].map(([k, val]) => (
                <li key={k} className="flex items-center gap-2.5 px-5 py-3">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-muted-foreground">{k}</span>
                  <span className="font-medium">{val}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel title="Procurement Lifecycle" description="Stages completed for this tender">
        <div className="table-scroll pb-1">
          <ol className="flex min-w-max items-center gap-2">
            {LIFECYCLE_STAGES.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={`rounded-md border px-3 py-2 text-xs font-medium ${
                    i < stageIndex
                      ? "border-success/25 bg-success/10 text-success"
                      : i === stageIndex
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {s}
                </span>
                {i < LIFECYCLE_STAGES.length - 1 && (
                  <span className="text-muted-foreground">→</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </Panel>

      <Panel
        title="Applicable Regulations"
        description="Documents linked to this tender; their requirements form the checklist below"
        bodyClassName="p-0"
      >
        {regs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No regulations linked yet."
            description="Open the repository and use “Add to Tender” to link an applicable regulation."
            action={
              <Link to="/documents" search={{ q: "" }}>
                <Btn size="sm" variant="outline">
                  Browse repository
                </Btn>
              </Link>
            }
          />
        ) : (
          <TableShell
            head={
              <>
                <Th>Document ID</Th>
                <Th>Title</Th>
                <Th>Authority</Th>
                <Th>Type</Th>
                <Th>Version</Th>
                <Th>Requirements</Th>
              </>
            }
          >
            {regs.map((d) => (
              <tr key={d.id} className="transition-colors hover:bg-accent/40">
                <Td className="font-mono text-xs">{d.id}</Td>
                <Td className="text-sm font-medium">{d.title}</Td>
                <Td className="text-sm text-muted-foreground">{d.authority}</Td>
                <Td>
                  <Pill>{d.type}</Pill>
                </Td>
                <Td className="text-sm">v{d.version}</Td>
                <Td className="text-sm text-muted-foreground">
                  {items.filter((i) => i.sourceDocId === d.id).length} in checklist
                </Td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <Panel
        title="Compliance Checklist"
        description="Requirement → source regulation → evidence → status"
      >
        <ComplianceTable
          items={items}
          scopeLabel={`Checklist for ${tender.id}`}
          defaultScope={{ tenderId: tender.id }}
        />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Tender Documents" bodyClassName="p-0">
          {tender.documents.length === 0 ? (
            <EmptyState
              icon={FilePlus2}
              title="No documents attached."
              description="Attach the notice, specifications and evaluation records here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {tender.documents.map((d: { name: string; date: string; by: string }) => (
                <li key={d.name} className="flex items-center gap-3 px-5 py-3">
                  <FileText className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.date} · {d.by}
                    </p>
                  </div>
                  <Btn
                    size="sm"
                    variant="ghost"
                    onClick={() => toast.info("Download is a demo action")}
                  >
                    Download
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Activity History"
          description="Attributable record of changes"
          bodyClassName="p-0"
        >
          {history.length === 0 ? (
            <EmptyState icon={RefreshCw} title="No activity recorded yet." />
          ) : (
            <ul className="divide-y divide-border">
              {history.slice(0, 8).map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <p className="text-sm font-medium">{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.object}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.user} · {a.date}, {a.time}
                    {a.previous && a.next && (
                      <>
                        {" "}
                        · <span className="font-medium">{a.previous}</span> →{" "}
                        <span className="font-medium">{a.next}</span>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {linkedContracts.length > 0 && (
        <Panel title="Contracts arising from this tender" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {linkedContracts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Link
                  to="/contracts/$contractId"
                  params={{ contractId: c.id }}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {c.id} — {c.name}
                </Link>
                <span className="text-xs text-muted-foreground">{c.vendor}</span>
                <span className="ml-auto text-sm font-medium">{formatINR(c.value)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
