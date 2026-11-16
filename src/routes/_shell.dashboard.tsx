import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  FileCheck2,
  FilePlus2,
  FileSearch,
  FileText,
  Link2,
  RefreshCw,
  ArrowRight,
  Download,
  ScrollText,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Pill } from "@/components/common/badges";
import {
  Btn,
  DemoNotice,
  EmptyState,
  Panel,
  ProgressBar,
  StatCard,
  WorkflowStrip,
} from "@/components/common/primitives";
import { complianceTrend, deadlines, recentActivity } from "@/data/demoData";
import { compliancePercent, statusCounts, useStore } from "@/store/app-store";
import { listTenders } from "@/lib/api/tenders";
import { listContracts } from "@/lib/api/contracts";
import { getComplianceChecklist } from "@/lib/api/compliance";
import { listRegulatoryDocuments } from "@/lib/api/documents";
import { listAuditLogs } from "@/lib/api/audit";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ProcureComply" },
      {
        name: "description",
        content:
          "Procurement compliance overview: active tenders, contracts, pending requirements, compliance trend and upcoming deadlines.",
      },
      { property: "og:title", content: "Dashboard — ProcureComply" },
      { property: "og:description", content: "Procurement compliance overview dashboard." },
    ],
  }),
  loader: async () => {
    return { dbTenders: [], dbContracts: [], dbCompliance: [], dbDocuments: [], dbAudit: [] };
  },
  component: Dashboard,
});

const activityIcons: Record<string, typeof Link2> = {
  link: Link2,
  check: CheckCircle2,
  contract: Building2,
  upload: FilePlus2,
  report: FileCheck2,
  tender: FileText,
  alert: AlertTriangle,
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { dbTenders, dbContracts, dbCompliance, dbDocuments, dbAudit } = Route.useLoaderData();
  const { user, tenders: storeTenders, contracts: storeContracts, documents: storeDocs, compliance: storeComp, audit: storeAudit } = useStore();
  
  const tenders = dbTenders.length > 0 ? dbTenders : storeTenders;
  const contracts = dbContracts.length > 0 ? dbContracts : storeContracts;
  const compliance = dbCompliance.length > 0 ? dbCompliance : storeComp;
  const documents = dbDocuments.length > 0 ? dbDocuments : storeDocs;
  const audit = dbAudit.length > 0 ? dbAudit : storeAudit;

  const activeTenders = tenders.filter((t) => !["Closed", "Draft"].includes(t.status)).length;
  const activeContracts = contracts.filter((c) => c.status === "Active" || c.status === "Expiring Soon").length;
  const counts = statusCounts(compliance);
  const overall = compliancePercent(compliance);

  const complianceData = [
    { name: "Compliant", value: counts.Compliant, color: "var(--color-chart-2)" },
    { name: "Pending", value: counts.Pending, color: "var(--color-chart-3)" },
    { name: "Partially Compliant", value: counts["Partially Compliant"], color: "var(--color-chart-4)" },
    { name: "Non-Compliant", value: counts["Non-Compliant"], color: "var(--color-chart-6)" },
    { name: "Not Applicable", value: counts["Not Applicable"], color: "var(--color-chart-5)" },
  ].filter((d) => d.value > 0);

  const tenderStatusData = ["Draft", "Under Review", "Published", "Evaluation", "Awarded", "Closed"].map(
    (s) => ({ status: s, count: tenders.filter((t) => t.status === s).length }),
  );

  const contractStatusData = ["Active", "Expiring Soon", "Completed", "Terminated"].map((s) => ({
    status: s,
    count: contracts.filter((c) => c.status === s).length,
  }));

  const trend = [...complianceTrend.slice(0, 5), { month: "Sep", compliance: overall }];

  const tooltipStyle = {
    backgroundColor: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "var(--color-foreground)",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting()}, {user?.designation?.split("(")[0]?.trim()}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's your procurement compliance overview. Start by auditing a tender below.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="primary">Overall compliance {overall}%</Pill>
          <Pill>{user?.department}</Pill>
        </div>
      </div>

      {/* Primary CTA — Audit a Tender */}
      <Link to="/audit-tender" className="block">
        <div className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent p-6 transition-all hover:border-primary/40 hover:shadow-md sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary transition-transform group-hover:scale-105">
                <FileSearch className="size-6" />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Audit a Tender</h2>
                <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                  Upload a tender document, check it against procurement rules, and generate a compliance report — all in one guided workflow.
                </p>
              </div>
            </div>
            <Btn className="shrink-0 gap-2 self-start sm:self-center">
              Start Audit <ArrowRight className="size-4" />
            </Btn>
          </div>
        </div>
      </Link>

      {/* Sample PDFs for demo / viva */}
      <div className="rounded-lg border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Download className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Sample PDFs &amp; Guides</h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Download fictional sample tenders to try the audit flow, or read the workflow explainer and viva guide.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/samples/sample-tender-1-smart-classroom.pdf", label: "Sample Tender 1 — Smart Classroom" },
            { href: "/samples/sample-tender-2-road-resurfacing.pdf", label: "Sample Tender 2 — Road Resurfacing" },
            { href: "/samples/how-tender-audit-works.pdf", label: "How the Audit Works" },
            { href: "/samples/viva-demo-guide.pdf", label: "Viva & Demo Guide" },
          ].map((s) => (
            <a
              key={s.href}
              href={s.href}
              download
              className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{s.label}</span>
              <Download className="ml-auto size-3 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>
        <p className="mt-2 text-[10px] italic text-muted-foreground">
          Illustrative demos only — not official tender or government documents.
        </p>
      </div>

      <DemoNotice />
      <WorkflowStrip />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Active Tenders" value={activeTenders} icon={FileText} to="/tenders" hint="Under review, published, evaluation or awarded" />
        <StatCard label="Active Contracts" value={activeContracts} icon={Building2} tone="info" to="/contracts" hint="Includes contracts expiring soon" />
        <StatCard label="Total Regulations & Documents" value={documents.length} icon={BookOpen} tone="primary" to="/documents" hint="Repository records with version history" />
        <StatCard label="Pending Compliance" value={counts.Pending + counts["Non-Compliant"]} icon={ClipboardCheck} tone="warning" to="/compliance" hint="Pending and non-compliant requirements" />
        <StatCard label="Completed Compliance" value={counts.Compliant} icon={CheckCircle2} tone="success" to="/compliance" hint="Requirements marked compliant" />
        <StatCard label="Upcoming Deadlines" value={deadlines.length} icon={CalendarClock} tone="caution" to="/reports" hint="Next 14 days" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Compliance Overview" description="Requirement-wise status across all tenders and contracts">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={complianceData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="var(--color-card)"
                >
                  {complianceData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="w-full space-y-2 sm:w-52">
              {complianceData.map((d) => (
                <li key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="flex-1 truncate text-muted-foreground">{d.name}</span>
                  <span className="font-semibold">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Compliance Trend" description="Monthly compliance percentage">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend} margin={{ left: -18, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} stroke="var(--color-border)" />
              <YAxis domain={[60, 100]} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} stroke="var(--color-border)" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Compliance"]} />
              <Line
                type="monotone"
                dataKey="compliance"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--color-chart-1)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Tender Status" description="Distribution of tenders by current stage">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tenderStatusData} margin={{ left: -22, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-border)" interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} stroke="var(--color-border)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Contract Status" description="Contracts by status, including those expiring soon">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={contractStatusData} margin={{ left: -22, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} stroke="var(--color-border)" interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} stroke="var(--color-border)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
                {contractStatusData.map((d, i) => (
                  <Cell
                    key={d.status}
                    fill={["var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-1)", "var(--color-chart-6)"][i]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Recent Activity"
          description="Latest actions recorded in the system"
          className="lg:col-span-2"
          actions={
            <Link to="/audit" className="text-xs font-medium text-primary hover:underline">
              View audit trail
            </Link>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {[
              ...audit.slice(0, 2).map((a) => ({
                id: a.id,
                icon: "check",
                text: `${a.action}: ${a.object}`,
                user: a.user,
                at: `${a.date}, ${a.time}`,
              })),
              ...recentActivity,
            ]
              .slice(0, 8)
              .map((a) => {
                const Icon = activityIcons[a.icon] ?? CircleDot;
                return (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-accent/40">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm">{a.text}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {a.user} · {a.at}
                      </p>
                    </div>
                  </li>
                );
              })}
          </ul>
        </Panel>

        <div className="space-y-4">
          <Panel title="Upcoming Deadlines" bodyClassName="p-0">
            {deadlines.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No upcoming deadlines." />
            ) : (
              <ul className="divide-y divide-border">
                {deadlines.map((d) => (
                  <li key={d.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        d.severity === "high"
                          ? "bg-destructive"
                          : d.severity === "medium"
                            ? "bg-warning"
                            : "bg-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{d.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{d.date}</p>
                    </div>
                    <Pill tone={d.severity === "high" ? "danger" : d.severity === "medium" ? "warning" : "neutral"}>
                      {d.severity === "high" ? "Urgent" : d.severity === "medium" ? "Due soon" : "Planned"}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Tender Compliance Snapshot" bodyClassName="space-y-4 p-5">
            {tenders.slice(0, 4).map((t) => {
              const items = compliance.filter((c) => c.tenderId === t.id);
              return (
                <div key={t.id}>
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to="/tenders/$tenderId"
                      params={{ tenderId: t.id }}
                      className="truncate text-sm font-medium hover:text-primary hover:underline"
                    >
                      {t.id}
                    </Link>
                    <span className="text-xs text-muted-foreground">{items.length} requirements</span>
                  </div>
                  <ProgressBar value={compliancePercent(items)} className="mt-1.5" />
                </div>
              );
            })}
            <Link
              to="/compliance"
              search={{ tender: "", contract: "" }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <RefreshCw className="size-3.5" /> Manage compliance checklist
            </Link>
          </Panel>

          <Panel title="Recently Updated Regulations" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {documents
                .filter((d) => d.status === "Active")
                .slice(0, 4)
                .map((d) => (
                  <li key={d.id} className="flex items-start gap-3 px-5 py-3">
                    <ScrollText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.id} · v{d.version} · {d.issueDate}
                      </p>
                    </div>
                  </li>
                ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
