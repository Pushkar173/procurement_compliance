import { cn } from "@/lib/utils";
import type { ComplianceStatus, ContractStatus, TenderStatus } from "@/data/demoData";

type Tone = "neutral" | "success" | "warning" | "caution" | "danger" | "info" | "primary";

const toneClass: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/18 text-warning-foreground border-warning/40",
  caution: "bg-caution/14 text-caution border-caution/30",
  danger: "bg-destructive/12 text-destructive border-destructive/25",
  info: "bg-info/12 text-info border-info/25",
  primary: "bg-primary/10 text-primary border-primary/20",
};

export function Pill({
  children,
  tone = "neutral",
  className,
  dot = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const complianceTone: Record<ComplianceStatus, Tone> = {
  Compliant: "success",
  Pending: "warning",
  "Partially Compliant": "caution",
  "Non-Compliant": "danger",
  "Not Applicable": "neutral",
};

export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  return (
    <Pill tone={complianceTone[status]} dot>
      {status}
    </Pill>
  );
}

const tenderTone: Record<TenderStatus, Tone> = {
  Draft: "neutral",
  "Under Review": "info",
  Published: "primary",
  Evaluation: "caution",
  Awarded: "success",
  Closed: "neutral",
};

export function TenderStatusBadge({ status }: { status: TenderStatus }) {
  return <Pill tone={tenderTone[status]}>{status}</Pill>;
}

const contractTone: Record<ContractStatus, Tone> = {
  Active: "success",
  "Expiring Soon": "warning",
  Completed: "info",
  Terminated: "danger",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <Pill tone={contractTone[status]}>{status}</Pill>;
}

export function DocStatusBadge({ status }: { status: string }) {
  const tone: Tone =
    status === "Active" ? "success" : status === "Superseded" ? "caution" : "neutral";
  return <Pill tone={tone}>{status}</Pill>;
}

export function YesNo({ value }: { value: boolean }) {
  return <Pill tone={value ? "success" : "neutral"}>{value ? "YES" : "NO"}</Pill>;
}
