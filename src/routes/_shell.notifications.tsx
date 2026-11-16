import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  Clock,
  FileWarning,
  Info,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Pill } from "@/components/common/badges";
import {
  Btn,
  DemoNotice,
  EmptyState,
  PageHeader,
  Panel,
} from "@/components/common/primitives";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — ProcureComply" },
      {
        name: "description",
        content: "View and manage system notifications and compliance alerts.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { notifications, tenders, contracts, compliance, markRead, markAllRead, pushNotification, user } = useStore();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  // ── Dynamic alert generation ──
  // Run once on mount to check for deadline/expiry/compliance alerts
  useEffect(() => {
    const existingTitles = new Set(notifications.map((n) => n.title));
    const now = new Date();

    // 1. Tender deadline within 48 hours
    for (const t of tenders) {
      if (t.status === "Closed" || t.status === "Awarded") continue;
      const closing = new Date(t.closingDate);
      const hoursUntil = (closing.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntil > 0 && hoursUntil <= 48) {
        const title = `Tender ${t.id} closing in ${Math.round(hoursUntil)} hours`;
        if (!existingTitles.has(title)) {
          pushNotification({
            kind: "warning",
            title,
            body: `${t.title} (${t.department}) closes on ${t.closingDate}. Ensure all submissions are finalized.`,
            date: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            link: `/tenders/${t.id}`,
          });
          existingTitles.add(title);
        }
      }
    }

    // 2. Contract expiring within 30 days
    for (const c of contracts) {
      if (c.status === "Completed" || c.status === "Terminated") continue;
      const end = new Date(c.endDate);
      const daysUntil = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntil > 0 && daysUntil <= 30) {
        const title = `Contract ${c.id} expires in ${Math.round(daysUntil)} days`;
        if (!existingTitles.has(title)) {
          pushNotification({
            kind: "warning",
            title,
            body: `${c.name} with ${c.vendor} expires on ${c.endDate}. Review renewal options.`,
            date: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            link: `/contracts/${c.id}`,
          });
          existingTitles.add(title);
        }
      }
    }

    // 3. Non-compliant or pending items on active tenders
    const activeTenders = tenders.filter(
      (t) => t.status !== "Closed" && t.status !== "Awarded",
    );
    for (const t of activeTenders) {
      const items = compliance.filter((c) => c.tenderId === t.id);
      const critical = items.filter(
        (c) => c.status === "Non-Compliant" || c.status === "Pending",
      );
      if (critical.length > 0) {
        const title = `${critical.length} compliance issue${critical.length > 1 ? "s" : ""} on ${t.id}`;
        if (!existingTitles.has(title)) {
          pushNotification({
            kind: "warning",
            title,
            body: `${t.title} has ${critical.length} requirement${critical.length > 1 ? "s" : ""} that ${critical.length > 1 ? "are" : "is"} pending or non-compliant.`,
            date: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            link: `/compliance?tender=${t.id}`,
          });
          existingTitles.add(title);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    if (filter === "read") return notifications.filter((n) => n.read);
    return notifications;
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const iconForKind = (kind: string) => {
    switch (kind) {
      case "warning":
        return <AlertTriangle className="size-4 text-amber-500" />;
      case "success":
        return <CheckCheck className="size-4 text-emerald-500" />;
      case "document":
        return <FileWarning className="size-4 text-blue-500" />;
      default:
        return <Info className="size-4 text-sky-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="System alerts, compliance warnings, and activity updates."
        actions={
          <>
            <Pill tone={unreadCount > 0 ? "warning" : "success"}>
              {unreadCount} unread
            </Pill>
            <Btn
              variant="outline"
              size="sm"
              disabled={unreadCount === 0}
              onClick={() => {
                markAllRead();
                toast.success("All notifications marked as read");
              }}
            >
              <CheckCheck className="size-3.5" /> Mark All Read
            </Btn>
          </>
        }
      />

      <DemoNotice />

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? `All (${notifications.length})` : f === "unread" ? `Unread (${unreadCount})` : `Read (${notifications.length - unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <Panel bodyClassName="p-0">
        {filtered.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={filter === "unread" ? "No unread notifications" : "No notifications"}
            description={
              filter === "unread"
                ? "You're all caught up! All notifications have been read."
                : "System alerts and compliance warnings will appear here."
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 px-5 py-4 transition-colors hover:bg-accent/30 ${
                  !n.read ? "bg-primary/[0.02]" : ""
                }`}
              >
                <div className="mt-0.5">{iconForKind(n.kind)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>
                      {n.title}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      {!n.read && (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {n.date}
                      </span>
                    </div>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  <div className="mt-2 flex items-center gap-2">
                    {!n.read && (
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          markRead(n.id);
                          toast.info("Marked as read");
                        }}
                      >
                        <CheckCheck className="size-3" /> Mark as Read
                      </Btn>
                    )}
                    {n.link && (
                      <a
                        href={n.link}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View details →
                      </a>
                    )}
                    <Pill tone={n.kind === "warning" ? "warning" : n.kind === "success" ? "success" : "info"}>
                      {n.kind}
                    </Pill>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* Alert Rules Info */}
      <Panel title="Active Alert Rules" description="Automated alerts are generated based on these rules" bodyClassName="p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-md border border-border p-3">
            <Clock className="mt-0.5 size-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Tender Deadline</p>
              <p className="text-xs text-muted-foreground">Alert when a tender closes within 48 hours</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border p-3">
            <AlertTriangle className="mt-0.5 size-5 text-orange-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Contract Expiry</p>
              <p className="text-xs text-muted-foreground">Alert when a contract expires within 30 days</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border border-border p-3">
            <ShieldAlert className="mt-0.5 size-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Compliance Issues</p>
              <p className="text-xs text-muted-foreground">Alert on pending/non-compliant items on active tenders</p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
