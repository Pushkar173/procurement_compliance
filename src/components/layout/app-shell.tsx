import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Building2,
  ClipboardCheck,
  FileSearch,
  FileStack,
  FileText,
  Gauge,
  HelpCircle,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Pill } from "@/components/common/badges";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/data/demoData";
import { useStore } from "@/store/app-store";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const coreNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/audit-tender", label: "Audit a Tender", icon: FileSearch },
  { to: "/tenders", label: "Tender History", icon: FileText },
  { to: "/compliance", label: "Compliance Tracker", icon: ClipboardCheck },
  { to: "/documents", label: "Rule Library", icon: BookOpen },
  { to: "/contracts", label: "Contracts", icon: Building2 },
  { to: "/reports", label: "Reports", icon: Gauge },
  { to: "/audit", label: "Activity Log", icon: History },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Admin Console", icon: ShieldCheck },
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/documents", label: "Document Management", icon: FileStack },
  { to: "/admin/settings", label: "System Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, notifications, documents, tenders, contracts, theme, toggleTheme } = useStore();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const unread = notifications.filter((n) => !n.read).length;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const hits: { label: string; sub: string; to: string; kind: string }[] = [];
    documents.forEach((d) => {
      if (
        [d.id, d.title, d.authority, d.type, d.category, d.description].join(" ").toLowerCase().includes(q)
      )
        hits.push({ label: `${d.id} — ${d.title}`, sub: `${d.type} · ${d.authority}`, to: `/documents?q=${encodeURIComponent(query)}`, kind: "Document" });
    });
    tenders.forEach((t) => {
      if ([t.id, t.title, t.department, t.status, t.description].join(" ").toLowerCase().includes(q))
        hits.push({ label: `${t.id} — ${t.title}`, sub: `Tender · ${t.department}`, to: `/tenders/${t.id}`, kind: "Tender" });
    });
    contracts.forEach((c) => {
      if ([c.id, c.name, c.vendor, c.tenderId, c.status].join(" ").toLowerCase().includes(q))
        hits.push({ label: `${c.id} — ${c.name}`, sub: `Contract · ${c.vendor}`, to: `/contracts/${c.id}`, kind: "Contract" });
    });
    return hits.slice(0, 8);
  }, [query, documents, tenders, contracts]);

  const isAdmin = user?.role === "admin";
  // Auditors keep read access to every workspace module; write actions are
  // disabled per-page through store.can("edit").
  const nav = coreNav;

  const SidebarBody = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">ProcureComply</p>
          <p className="truncate text-[11px] text-sidebar-foreground/70">Compliance & Contracts</p>
        </div>
        <button
          className="ml-auto rounded p-1 text-sidebar-foreground/70 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {nav.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  item.to === "/audit-tender" && "bg-primary/8 border-l-2 border-primary",
                )}
                activeProps={{
                  className:
                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_0_var(--sidebar-primary)]",
                }}
                activeOptions={{ exact: item.to === "/dashboard" }}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.to === "/notifications" && unread > 0 && (
                  <span className="ml-auto rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-primary-foreground">
                    {unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {isAdmin && (
          <>
            <p className="px-2 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Administration
            </p>
            <ul className="space-y-0.5">
              {adminNav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_0_var(--sidebar-primary)]",
                    }}
                    activeOptions={{ exact: item.to === "/admin" }}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="space-y-0.5 border-t border-sidebar-border px-3 py-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
        >
          <HelpCircle className="size-4" />
          Help
        </Link>
        <button
          onClick={() => {
            logout();
            navigate({ to: "/" });
          }}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border lg:block">
        {SidebarBody}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-[var(--shadow-raised)]">
            {SidebarBody}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              className="rounded-md border border-input p-2 transition-colors hover:bg-accent lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </button>

            <div className="relative hidden flex-1 max-w-xl sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search regulations, tenders, contracts…"
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/25"
              />
              {searchOpen && query.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-11 panel max-h-80 overflow-y-auto p-1.5">
                  {results.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">
                      No matching records found for “{query}”.
                    </p>
                  ) : (
                    results.map((r) => (
                      <button
                        key={r.kind + r.label}
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                          navigate({ to: r.to });
                        }}
                        className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
                      >
                        <Pill tone="primary" className="mt-0.5">
                          {r.kind}
                        </Pill>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{r.label}</span>
                          <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Toggle colour mode"
                className="rounded-md border border-input p-2 transition-colors hover:bg-accent"
              >
                {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
              </button>
              <Link
                to="/notifications"
                className="relative rounded-md border border-input p-2 transition-colors hover:bg-accent"
                aria-label="Notifications"
              >
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                    {unread}
                  </span>
                )}
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2.5 rounded-md border border-input px-2.5 py-1.5 transition-colors hover:bg-accent"
              >
                <span className="grid size-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {user?.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-xs font-semibold">{user?.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {user ? ROLE_LABEL[user.role] : ""}
                  </span>
                </span>
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-1.5 text-[11px] text-muted-foreground sm:px-6">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-success" /> Session active · role-based access
              enforced in UI
            </span>
            <span className="hidden sm:inline">Prototype environment · demo data only</span>
          </div>
        </header>

        <main className={cn("mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6")}>{children}</main>

        <footer className="mt-4 border-t border-border px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
          <p className="font-medium text-foreground">
            ProcureComply — Procurement Compliance & Contract Management System
          </p>
          <p className="mt-0.5">Academic Project Prototype</p>
        </footer>
      </div>
    </div>
  );
}
