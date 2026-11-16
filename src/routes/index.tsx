import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ClipboardCheck,
  FileText,
  Gauge,
  History,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Pill } from "@/components/common/badges";
import { LIFECYCLE_STAGES } from "@/data/demoData";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProcureComply — Smarter Procurement. Stronger Compliance." },
      {
        name: "description",
        content:
          "Centralise procurement regulations, track compliance, manage tenders and contracts, and generate reports from one platform. Academic project prototype.",
      },
      { property: "og:title", content: "ProcureComply — Smarter Procurement. Stronger Compliance." },
      {
        property: "og:description",
        content:
          "Centralised procurement regulations, compliance tracking, tender and contract management, and structured reporting.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: BookOpen,
    title: "Centralised Regulations",
    body: "Access procurement-related regulations, policies, guidelines, circulars, manuals and office memorandums from one repository with full metadata and version history.",
  },
  {
    icon: ClipboardCheck,
    title: "Compliance Tracking",
    body: "Track whether applicable requirements have been adopted and completed, with evidence, remarks, responsible officer and due dates against every requirement.",
  },
  {
    icon: FileText,
    title: "Tender Management",
    body: "Maintain tender information, link the regulations that apply, and generate the resulting compliance checklist automatically.",
  },
  {
    icon: Building2,
    title: "Contract Management",
    body: "Monitor contracts, vendors, milestones, renewal dates and contract-stage compliance in a single view.",
  },
  {
    icon: Gauge,
    title: "Reporting",
    body: "Generate structured compliance reports by tender, contract, department, regulation or month, with preview and export.",
  },
  {
    icon: History,
    title: "Audit Trail",
    body: "Every status change, upload and record update is attributed to a user with previous and new values for traceability.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">ProcureComply</p>
            <p className="truncate text-[11px] text-muted-foreground">
              Procurement Compliance & Contract Management System
            </p>
          </div>
          <nav className="ml-auto flex items-center gap-2">
            <Link
              to="/auth" search={{ redirect: undefined }}
              className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              Login
            </Link>
            <Link
              to="/auth" search={{ redirect: undefined }}
              
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Explore Demo <ArrowRight className="size-4" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div>
            <Pill tone="primary">Academic Project Prototype</Pill>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Smarter Procurement.
              <br />
              Stronger Compliance.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground">
              Centralize procurement regulations, track compliance, manage tenders and contracts, and
              generate reports from one secure platform.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/auth" search={{ redirect: undefined }}
                className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Login
              </Link>
              <Link
                to="/auth" search={{ redirect: undefined }}
                
                className="inline-flex h-11 items-center gap-1.5 rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-accent"
              >
                Explore Demo <ArrowRight className="size-4" />
              </Link>
            </div>
            <p className="mt-5 max-w-xl text-xs text-muted-foreground">
              This is a prototype built for academic demonstration. It uses fictional demo data and
              does not provide production-grade security on its own.
            </p>
          </div>

          <div className="panel p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Core workflow
            </p>
            <ol className="mt-4 space-y-3 text-sm">
              {[
                "Find the applicable regulation",
                "Apply it to a tender or contract",
                "Track requirement-wise compliance",
                "Maintain evidence and remarks",
                "Generate the compliance report",
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Roles supported
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Pill tone="primary">
                  <Users className="size-3" /> Procurement Officer
                </Pill>
                <Pill tone="info">
                  <ShieldCheck className="size-3" /> Administrator
                </Pill>
                <Pill tone="caution">
                  <History className="size-3" /> Auditor / Vigilance
                </Pill>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">What the platform covers</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Structured procurement records and procurement documents are kept connected, so a
          requirement can always be traced back to its source regulation and forward to its evidence.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="panel p-5 transition-shadow hover:shadow-[var(--shadow-raised)]">
              <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-3.5 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Procurement lifecycle</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Documents are not treated as isolated files — each one is linked to the lifecycle stages
            where it applies.
          </p>
          <div className="table-scroll mt-7 pb-2">
            <ol className="flex min-w-max items-center gap-2">
              {LIFECYCLE_STAGES.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="rounded-md border border-border bg-card px-3 py-2 text-xs font-medium">
                    {i + 1}. {s}
                  </span>
                  {i < LIFECYCLE_STAGES.length - 1 && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <footer className="px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        <p className="font-medium text-foreground">
          ProcureComply — Procurement Compliance & Contract Management System
        </p>
        <p className="mt-0.5">Academic Project Prototype</p>
      </footer>
    </div>
  );
}
