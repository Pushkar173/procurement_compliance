import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Building2, FileCheck2, FileText, Mail, MapPin, Phone, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { ContractStatusBadge, Pill } from "@/components/common/badges";
import {
  Btn,
  DemoNotice,
  EmptyState,
  KeyValue,
  PageHeader,
  Panel,
  Timeline,
  WorkflowStrip,
} from "@/components/common/primitives";
import { ComplianceProgress, ComplianceTable } from "@/components/compliance/compliance-table";
import { formatINR, useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell/contracts/$contractId")({
  head: ({ params }) => ({
    meta: [
      { title: `Contract ${params.contractId} — ProcureComply` },
      {
        name: "description",
        content: `Contract ${params.contractId}: vendor details, milestones, documents, compliance checklist and activity history.`,
      },
      { property: "og:title", content: `Contract ${params.contractId} — ProcureComply` },
      { property: "og:description", content: "Contract record with milestones and compliance status." },
    ],
  }),
  loader: async ({ params }) => {
    return { dbContract: null, dbCompliance: [], dbAudit: [] };
  },
  component: ContractDetail,
  notFoundComponent: () => (
    <EmptyState
      icon={Building2}
      title="Contract not found."
      description="The contract you are looking for does not exist in the demo data."
      action={
        <Link to="/contracts">
          <Btn size="sm" variant="outline">
            Back to contracts
          </Btn>
        </Link>
      }
    />
  ),
});

function ContractDetail() {
  const { dbContract } = Route.useLoaderData() as any;
  const { contractId } = Route.useParams();
  const { contracts: storeContracts, compliance, audit, updateContract, user } = useStore();
  const role = user?.role;
  
  const storeContract = storeContracts.find((c) => c.id === contractId);
  const contract = dbContract || storeContract;
  if (!contract) throw notFound();

  const items = compliance.filter((c) => c.contractId === contract.id);
  const history = audit.filter(
    (a) => a.object.includes(contract.id) || items.some((i) => a.object.includes(i.id)),
  );

  const canEdit = role === "admin" || (role === "officer" && contract.manager === ((user as any)?.user_metadata?.name || "Pushkar Bhati"));

  return (
    <div className="space-y-6">
      <Link to="/contracts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Contract Management
      </Link>

      <PageHeader
        title={contract.name}
        subtitle={`${contract.id} · ${contract.vendor} · ${contract.department}`}
        actions={
          <>
            <ContractStatusBadge status={contract.status} />
            <Btn
              size="sm"
              variant="outline"
              disabled={!canEdit}
              onClick={() => {
                updateContract(contract.id, {
                  status: contract.status === "Active" ? "Expiring Soon" : "Active",
                });
                toast.success(`${contract.id} status updated`);
              }}
            >
              <RefreshCw className="size-3.5" /> Update Status
            </Btn>
            <Link to="/compliance" search={{ tender: "", contract: contract.id }}>
              <Btn size="sm">Update Compliance</Btn>
            </Link>
            <Link to="/reports" search={{ contract: contract.id }}>
              <Btn size="sm" variant="outline">
                <FileCheck2 className="size-3.5" /> Generate Report
              </Btn>
            </Link>
          </>
        }
      />

      {role === "officer" && !canEdit && (
        <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm text-warning-foreground flex items-center gap-2">
          You are viewing another officer's contract. Edit actions are restricted.
        </div>
      )}

      <DemoNotice />
      <WorkflowStrip active="Tender / Contract" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Contract Overview" className="lg:col-span-2">
          <KeyValue
            items={[
              { label: "Contract ID", value: contract.id },
              {
                label: "Related Tender",
                value: (
                  <Link
                    to="/tenders/$tenderId"
                    params={{ tenderId: contract.tenderId }}
                    className="text-primary hover:underline"
                  >
                    {contract.tenderId}
                  </Link>
                ),
              },
              { label: "Contract Value", value: formatINR(contract.value) },
              { label: "Department", value: contract.department },
              { label: "Start Date", value: contract.startDate },
              { label: "End Date", value: contract.endDate },
              { label: "Renewal Date", value: contract.renewalDate },
              { label: "Payment Status", value: <Pill tone="info">{contract.paymentStatus}</Pill> },
              { label: "Contract Manager", value: contract.manager },
              { label: "Status", value: <ContractStatusBadge status={contract.status} /> },
            ]}
          />
        </Panel>

        <div className="space-y-4">
          <Panel title="Compliance Status">
            <ComplianceProgress items={items} />
          </Panel>
          <Panel title="Vendor Information" bodyClassName="space-y-2.5 p-5 text-sm">
            <p className="font-semibold">{contract.vendor}</p>
            <p className="text-muted-foreground">{contract.vendorContact.person}</p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-4" /> {contract.vendorContact.email}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-4" /> {contract.vendorContact.phone}
            </p>
            <p className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" /> {contract.vendorContact.address}
            </p>
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Milestones & Timeline" description="Contract creation through renewal or completion">
          <Timeline items={contract.milestones} />
        </Panel>

        <div className="space-y-4">
          <Panel title="Contract Documents" bodyClassName="p-0">
            {contract.documents.length === 0 ? (
              <EmptyState icon={FileText} title="No documents attached." />
            ) : (
              <ul className="divide-y divide-border">
                {contract.documents.map((d: { name: string; date: string; by: string }) => (
                  <li key={d.name} className="flex items-center gap-3 px-5 py-3">
                    <FileText className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.date} · {d.by}
                      </p>
                    </div>
                    <Btn size="sm" variant="ghost" onClick={() => toast.info("Download is a demo action")}>
                      Download
                    </Btn>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Activity History" bodyClassName="p-0">
            {history.length === 0 ? (
              <EmptyState icon={RefreshCw} title="No activity recorded yet." />
            ) : (
              <ul className="divide-y divide-border">
                {history.slice(0, 6).map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <p className="text-sm font-medium">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.object}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.user} · {a.date}, {a.time}
                      {a.previous && a.next && (
                        <>
                          {" "}
                          · <span className="font-medium">{a.previous}</span> → <span className="font-medium">{a.next}</span>
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Contract Compliance Checklist" description="Requirements applicable during contract execution">
        <ComplianceTable
          items={items}
          scopeLabel={`Checklist for ${contract.id}`}
          defaultScope={{ contractId: contract.id }}
        />
      </Panel>
    </div>
  );
}
