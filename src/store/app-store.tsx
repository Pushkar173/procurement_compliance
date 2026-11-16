/**
 * Central application state for the ProcureComply prototype.
 *
 * Everything the UI reads flows through this store. A real backend can replace
 * the seed imports with API calls without touching the components.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  auditEvents as seedAudit,
  complianceItems as seedCompliance,
  contracts as seedContracts,
  documents as seedDocuments,
  notifications as seedNotifications,
  tenders as seedTenders,
  users as seedUsers,
  ROLE_LABEL,
  type AppUser,
  type AuditEvent,
  type ComplianceItem,
  type ComplianceStatus,
  type Contract,
  type Notification,
  type RegDocument,
  type Role,
  type Tender,
} from "@/data/demoData";

export interface GeneratedReport {
  id: string;
  type: string;
  typeId: string;
  generatedAt: string;
  generatedBy: string;
  department: string;
  scope: string;
  items: ComplianceItem[];
}

interface Store {
  hydrated: boolean;
  user: AppUser | null;
  users: AppUser[];
  documents: RegDocument[];
  tenders: Tender[];
  contracts: Contract[];
  compliance: ComplianceItem[];
  notifications: Notification[];
  audit: AuditEvent[];
  reports: GeneratedReport[];
  theme: "light" | "dark";
  // auth
  login: (role: Role) => AppUser;
  logout: () => void;
  can: (action: "edit" | "admin") => boolean;
  // compliance
  updateCompliance: (id: string, patch: Partial<ComplianceItem>) => void;
  addCompliance: (item: Omit<ComplianceItem, "id">) => string;
  // records
  addTender: (t: Tender) => void;
  linkRegulation: (tenderId: string, docId: string) => void;
  addContract: (c: Contract) => void;
  updateContract: (id: string, patch: Partial<Contract>) => void;
  addDocument: (d: RegDocument) => void;
  updateDocument: (id: string, patch: Partial<RegDocument>, note?: string) => void;
  // users
  addUser: (u: AppUser) => void;
  updateUser: (id: string, patch: Partial<AppUser>) => void;
  // notifications
  markRead: (id: string) => void;
  markAllRead: () => void;
  pushNotification: (n: Omit<Notification, "id" | "read">) => void;
  // reports
  addReport: (r: Omit<GeneratedReport, "id" | "generatedAt" | "generatedBy">) => GeneratedReport;
  // misc
  toggleTheme: () => void;
  log: (e: Omit<AuditEvent, "id" | "date" | "time" | "user" | "role">) => void;
}

const StoreContext = createContext<Store | null>(null);

const SESSION_KEY = "procurecomply.session";
const THEME_KEY = "procurecomply.theme";

function stamp() {
  const d = new Date();
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

let seq = 2000;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>(seedUsers);
  const [documents, setDocuments] = useState<RegDocument[]>(seedDocuments);
  const [tenders, setTenders] = useState<Tender[]>(seedTenders);
  const [contracts, setContracts] = useState<Contract[]>(seedContracts);
  const [compliance, setCompliance] = useState<ComplianceItem[]>(seedCompliance);
  const [notifications, setNotifications] = useState<Notification[]>(seedNotifications);
  const [audit, setAudit] = useState<AuditEvent[]>(seedAudit);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const role = JSON.parse(raw) as Role;
        setUser(seedUsers.find((u) => u.role === role) ?? null);
      }
      const t = localStorage.getItem(THEME_KEY);
      if (t === "dark" || t === "light") setTheme(t);
    } catch {
      /* storage unavailable — continue signed out */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme, hydrated]);

  const log = useCallback(
    (e: Omit<AuditEvent, "id" | "date" | "time" | "user" | "role">) => {
      const { date, time } = stamp();
      setAudit((prev) => [
        {
          id: nextId("AUD"),
          user: user?.name ?? "System",
          role: user?.role ?? "officer",
          date,
          time,
          ...e,
        },
        ...prev,
      ]);
    },
    [user],
  );

  const pushNotification = useCallback((n: Omit<Notification, "id" | "read">) => {
    setNotifications((prev) => [{ id: nextId("NTF"), read: false, ...n }, ...prev]);
  }, []);

  const login = useCallback((role: Role) => {
    const account =
      seedUsers.find((u) => u.role === role && u.status === "Active") ?? seedUsers[0]!;
    setUser(account ?? null);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(role));
    } catch {
      /* ignore */
    }
    if (!account) return account as unknown as AppUser;
    const { date, time } = stamp();
    setAudit((prev) => [
      {
        id: nextId("AUD"),
        user: account.name,
        role: account.role,
        action: "Signed in",
        object: `${ROLE_LABEL[account.role]} session started`,
        objectType: "Session",
        date,
        time,
      },
      ...prev,
    ]);
    return account;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const can = useCallback(
    (action: "edit" | "admin") => {
      if (!user) return false;
      if (action === "admin") return user.role === "admin";
      return user.role !== "auditor";
    },
    [user],
  );

  const updateCompliance = useCallback(
    (id: string, patch: Partial<ComplianceItem>) => {
      setCompliance((prev) => {
        const current = prev.find((c) => c.id === id);
        if (current && patch.status && patch.status !== current.status) {
          log({
            action: "Compliance status updated",
            object: `${id} — ${current.requirement}`,
            objectType: "Compliance",
            previous: current.status,
            next: patch.status,
          });
          pushNotification({
            kind: patch.status === "Compliant" ? "success" : "warning",
            title: "Compliance updated",
            body: `${id} changed from ${current.status} to ${patch.status}.`,
            date: `${stamp().date}, ${stamp().time}`,
            link: "/compliance",
          });
        } else if (current) {
          log({
            action: "Compliance record edited",
            object: `${id} — ${current.requirement}`,
            objectType: "Compliance",
          });
        }
        return prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      });
    },
    [log, pushNotification],
  );

  const addCompliance = useCallback(
    (item: Omit<ComplianceItem, "id">) => {
      const id = nextId("CR");
      setCompliance((prev) => [...prev, { id, ...item }]);
      log({
        action: "Compliance requirement added",
        object: `${id} — ${item.requirement}`,
        objectType: "Compliance",
        next: item.status,
      });
      return id;
    },
    [log],
  );

  const addTender = useCallback(
    (t: Tender) => {
      setTenders((prev) => [t, ...prev]);
      log({
        action: "Tender created",
        object: `${t.id} — ${t.title}`,
        objectType: "Tender",
        next: t.status,
      });
      pushNotification({
        kind: "info",
        title: "Tender created",
        body: `${t.id} ${t.title} was created with ${t.regulationIds.length} applicable regulations.`,
        date: `${stamp().date}, ${stamp().time}`,
        link: "/tenders",
      });
    },
    [log, pushNotification],
  );

  const linkRegulation = useCallback(
    (tenderId: string, docId: string) => {
      setTenders((prev) =>
        prev.map((t) =>
          t.id === tenderId && !t.regulationIds.includes(docId)
            ? { ...t, regulationIds: [...t.regulationIds, docId] }
            : t,
        ),
      );
      log({
        action: "Regulation linked to tender",
        object: `${docId} → ${tenderId}`,
        objectType: "Tender",
      });
    },
    [log],
  );

  const addContract = useCallback(
    (c: Contract) => {
      setContracts((prev) => [c, ...prev]);
      log({
        action: "Contract created",
        object: `${c.id} — ${c.name}`,
        objectType: "Contract",
        next: c.status,
      });
    },
    [log],
  );

  const updateContract = useCallback(
    (id: string, patch: Partial<Contract>) => {
      setContracts((prev) => {
        const current = prev.find((c) => c.id === id);
        log({
          action: "Contract updated",
          object: `${id} — ${current?.name ?? ""}`,
          objectType: "Contract",
          previous: current?.status ?? "",
          next: patch.status ?? current?.status ?? "",
        });
        return prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      });
    },
    [log],
  );

  const addDocument = useCallback(
    (d: RegDocument) => {
      setDocuments((prev) => [d, ...prev]);
      log({
        action: "Document uploaded",
        object: `${d.id} — ${d.title}`,
        objectType: "Document",
        next: d.status,
      });
      pushNotification({
        kind: "document",
        title: "New document uploaded",
        body: `${d.id} ${d.title} was added to the repository.`,
        date: `${stamp().date}, ${stamp().time}`,
        link: "/documents",
      });
    },
    [log, pushNotification],
  );

  const updateDocument = useCallback(
    (id: string, patch: Partial<RegDocument>, note?: string) => {
      setDocuments((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          const versionChanged = patch.version && patch.version !== d.version;
          const history = versionChanged
            ? [
                ...d.history,
                {
                  version: patch.version as string,
                  date: stamp().date,
                  note: note ?? "Version updated",
                  by: user?.name ?? "System",
                },
              ]
            : d.history;
          return { ...d, ...patch, history };
        }),
      );
      const current = documents.find((d) => d.id === id);
      log({
        action: patch.status === "Archived" ? "Document archived" : "Document updated",
        object: `${id} — ${patch.title ?? current?.title ?? ""}`,
        objectType: "Document",
        previous: (patch.version ? current?.version : current?.status) ?? "",
        next: patch.version ?? patch.status ?? "",
      });
    },
    [documents, log, user],
  );

  const addUser = useCallback(
    (u: AppUser) => {
      setUsers((prev) => [...prev, u]);
      log({
        action: "User created",
        object: `${u.id} — ${u.name}`,
        objectType: "User",
        next: ROLE_LABEL[u.role],
      });
    },
    [log],
  );

  const updateUser = useCallback(
    (id: string, patch: Partial<AppUser>) => {
      setUsers((prev) => {
        const current = prev.find((u) => u.id === id);
        log({
          action: patch.role ? "User role changed" : "User updated",
          object: `${id} — ${current?.name ?? ""}`,
          objectType: "User",
          previous: (patch.role ? ROLE_LABEL[current!.role] : current?.status) ?? "",
          next: (patch.role ? ROLE_LABEL[patch.role] : patch.status) ?? "",
        });
        return prev.map((u) => (u.id === id ? { ...u, ...patch } : u));
      });
    },
    [log],
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const addReport = useCallback(
    (r: Omit<GeneratedReport, "id" | "generatedAt" | "generatedBy">) => {
      const { date, time } = stamp();
      const report: GeneratedReport = {
        ...r,
        id: `RPT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        generatedAt: `${date}, ${time}`,
        generatedBy: user?.name ?? "System",
      };
      setReports((prev) => [report, ...prev]);
      log({
        action: "Report generated",
        object: `${report.id} — ${report.type}`,
        objectType: "Report",
      });
      return report;
    },
    [log, user],
  );

  const toggleTheme = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);

  const value = useMemo<Store>(
    () => ({
      hydrated,
      user,
      users,
      documents,
      tenders,
      contracts,
      compliance,
      notifications,
      audit,
      reports,
      theme,
      login,
      logout,
      can,
      updateCompliance,
      addCompliance,
      addTender,
      linkRegulation,
      addContract,
      updateContract,
      addDocument,
      updateDocument,
      addUser,
      updateUser,
      markRead,
      markAllRead,
      pushNotification,
      addReport,
      toggleTheme,
      log,
    }),
    [
      hydrated,
      user,
      users,
      documents,
      tenders,
      contracts,
      compliance,
      notifications,
      audit,
      reports,
      theme,
      login,
      logout,
      can,
      updateCompliance,
      addCompliance,
      addTender,
      linkRegulation,
      addContract,
      updateContract,
      addDocument,
      updateDocument,
      addUser,
      updateUser,
      markRead,
      markAllRead,
      pushNotification,
      addReport,
      toggleTheme,
      log,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside AppStoreProvider");
  return ctx;
}

/* ---------- derived helpers ---------- */

export function compliancePercent(items: ComplianceItem[]) {
  const applicable = items.filter((i) => i.status !== "Not Applicable");
  if (applicable.length === 0) return 0;
  const score = applicable.reduce((sum, i) => {
    if (i.status === "Compliant") return sum + 1;
    if (i.status === "Partially Compliant") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((score / applicable.length) * 100);
}

export function statusCounts(items: ComplianceItem[]) {
  const base: Record<ComplianceStatus, number> = {
    Compliant: 0,
    Pending: 0,
    "Partially Compliant": 0,
    "Non-Compliant": 0,
    "Not Applicable": 0,
  };
  items.forEach((i) => {
    base[i.status] += 1;
  });
  return base;
}

export function formatINR(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Crore`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return `₹${value.toLocaleString("en-IN")}`;
}
