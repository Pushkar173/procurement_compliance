import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle,
  Clock,
  Database,
  FileCheck2,
  FileStack,
  FileText,
  History,
  Lock,
  Plus,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Pill } from "@/components/common/badges";
import {
  Btn,
  Field,
  Modal,
  PageHeader,
  Panel,
  ProgressBar,
  StatCard,
  TableShell,
  Td,
  Th,
  inputClass,
} from "@/components/common/primitives";
import { DEPARTMENTS, ROLE_LABEL, type AppUser, type Role } from "@/data/demoData";
import { compliancePercent, formatINR, useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Console — ProcureComply" },
      {
        name: "description",
        content: "Executive administration console for governance, user provisioning, and compliance health.",
      },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { users, documents, tenders, contracts, compliance, audit, addUser, user } = useStore();

  const [quickUserModalOpen, setQuickUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    role: "officer" as Role,
    department: DEPARTMENTS[0] || "Information Technology",
    designation: "",
  });

  // Calculate overview metrics
  const totalUsers = users.length;
  const officersCount = users.filter((u) => u.role === "officer").length;
  const adminsCount = users.filter((u) => u.role === "admin").length;
  const auditorsCount = users.filter((u) => u.role === "auditor").length;

  const totalDocs = documents.length;
  const activeDocs = documents.filter((d) => d.status === "Active").length;

  const totalTenders = tenders.length;
  const totalContracts = contracts.length;

  const overallCompliance = useMemo(() => {
    return compliancePercent(compliance);
  }, [compliance]);

  // Recent administrative & security audit events
  const adminAuditEvents = useMemo(() => {
    return audit
      .filter(
        (a) =>
          a.objectType === "User" ||
          a.objectType === "Session" ||
          a.objectType === "Document" ||
          a.role === "admin",
      )
      .slice(0, 8);
  }, [audit]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name.trim() || !newUserData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    const nextId = `USR-${String(users.length + 1).padStart(3, "0")}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    const newUser: AppUser = {
      id: nextId,
      name: newUserData.name.trim(),
      email: newUserData.email.trim(),
      role: newUserData.role,
      department: newUserData.department,
      designation: newUserData.designation.trim() || "Procurement Staff",
      status: "Active",
      lastLogin: `${dateStr}, ${timeStr}`,
    };

    addUser(newUser);
    toast.success(`User ${newUser.name} created successfully`, {
      description: `Role assigned: ${ROLE_LABEL[newUser.role]}`,
    });

    setNewUserData({
      name: "",
      email: "",
      role: "officer",
      department: DEPARTMENTS[0] || "Information Technology",
      designation: "",
    });
    setQuickUserModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Console & Executive Overview"
        subtitle="Central administrative hub for identity management, regulatory master records, system parameters, and governance health."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/admin/settings">
              <Btn variant="outline" size="sm">
                <Settings className="size-4" />
                Settings
              </Btn>
            </Link>
            <Btn size="sm" onClick={() => setQuickUserModalOpen(true)}>
              <UserPlus className="size-4" />
              Add User
            </Btn>
          </div>
        }
      />

      {/* Primary KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Authorized Staff"
          value={totalUsers}
          icon={Users}
          hint={`${officersCount} Officers · ${auditorsCount} Auditors · ${adminsCount} Admins`}
          to="/admin/users"
          tone="primary"
        />
        <StatCard
          label="Regulatory Policies"
          value={totalDocs}
          icon={FileStack}
          hint={`${activeDocs} active in force`}
          to="/admin/documents"
          tone="info"
        />
        <StatCard
          label="Monitored Portfolios"
          value={`${totalTenders} / ${totalContracts}`}
          icon={Building2}
          hint="Active tenders & live contracts"
          to="/contracts"
          tone="caution"
        />
        <StatCard
          label="Compliance Index"
          value={`${overallCompliance}%`}
          icon={ShieldCheck}
          hint="Cross-department adherence"
          to="/compliance"
          tone={overallCompliance >= 85 ? "success" : "warning"}
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/admin/users"
          className="panel group flex flex-col justify-between p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-5" />
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <h3 className="font-semibold text-foreground text-base pt-1">User Management</h3>
            <p className="text-xs text-muted-foreground">
              Provision accounts, adjust RBAC permissions (Officer, Auditor, Admin), and monitor active session status.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>{totalUsers} Active Accounts</span>
            <span className="font-medium text-primary">Manage Users →</span>
          </div>
        </Link>

        <Link
          to="/admin/documents"
          className="panel group flex flex-col justify-between p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-lg bg-info/10 text-info">
                <FileStack className="size-5" />
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <h3 className="font-semibold text-foreground text-base pt-1">Document Management</h3>
            <p className="text-xs text-muted-foreground">
              Administer GFR manuals, CVC guidelines, circular amendments, and document revision histories.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>{totalDocs} Master Policies</span>
            <span className="font-medium text-info">Manage Docs →</span>
          </div>
        </Link>

        <Link
          to="/admin/settings"
          className="panel group flex flex-col justify-between p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-lg bg-caution/15 text-caution">
                <Settings className="size-5" />
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <h3 className="font-semibold text-foreground text-base pt-1">System Settings</h3>
            <p className="text-xs text-muted-foreground">
              Configure verification thresholds, dual sign-off rules, audit retention, and Supabase integration status.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Rules & Integrations</span>
            <span className="font-medium text-caution">Configure →</span>
          </div>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Distribution & Governance */}
        <Panel
          title="User Governance & Role Segregation"
          description="Active security separation among officers, administrators, and independent vigilance auditors."
          actions={
            <Link to="/admin/users">
              <Btn variant="outline" size="sm">
                View All Users
              </Btn>
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground font-medium">Officers</p>
                <p className="text-2xl font-semibold text-primary mt-1">{officersCount}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Execution & Tenders</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground font-medium">Auditors</p>
                <p className="text-2xl font-semibold text-warning-foreground mt-1">{auditorsCount}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Vigilance & Reviews</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground font-medium">Admins</p>
                <p className="text-2xl font-semibold text-destructive mt-1">{adminsCount}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">System Governance</p>
              </div>
            </div>

            <div className="divide-y divide-border">
              {users.slice(0, 4).map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.designation} · {u.department}
                    </p>
                  </div>
                  <Pill
                    tone={
                      u.role === "admin" ? "danger" : u.role === "auditor" ? "warning" : "primary"
                    }
                    dot
                  >
                    {ROLE_LABEL[u.role]}
                  </Pill>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Regulatory Master Status */}
        <Panel
          title="Regulatory Coverage Snapshot"
          description="Distribution of government circulars, vigilance guidelines, and procurement manuals."
          actions={
            <Link to="/admin/documents">
              <Btn variant="outline" size="sm">
                Manage Documents
              </Btn>
            </Link>
          }
        >
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Ministry of Finance (GFR & Manuals)</span>
                  <span>
                    {documents.filter((d) => d.authority === "Ministry of Finance").length} Documents
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${(documents.filter((d) => d.authority === "Ministry of Finance").length / totalDocs) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Central Vigilance Commission (CVC)</span>
                  <span>
                    {documents.filter((d) => d.authority === "Central Vigilance Commission").length} Documents
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-warning"
                    style={{
                      width: `${(documents.filter((d) => d.authority === "Central Vigilance Commission").length / totalDocs) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>Ministry of Power / Sectoral Mandates</span>
                  <span>
                    {documents.filter((d) => d.authority === "Ministry of Power").length} Documents
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-success"
                    style={{
                      width: `${(documents.filter((d) => d.authority === "Ministry of Power").length / totalDocs) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3 text-xs flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">Compliance Verification Rate</p>
                <p className="text-muted-foreground">Requirements validated with evidence</p>
              </div>
              <span className="font-bold text-base text-primary">{overallCompliance}%</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Recent Security & Administrative Activity */}
      <Panel
        title="Administrative & Security Activity Log"
        description="Immutable audit entries recording user authentication, document versioning, and configuration updates."
        actions={
          <Link to="/audit">
            <Btn variant="outline" size="sm">
              <History className="size-4" />
              Full Audit Trail
            </Btn>
          </Link>
        }
      >
        <TableShell
          head={
            <>
              <Th>Timestamp</Th>
              <Th>User / Operator</Th>
              <Th>Administrative Action</Th>
              <Th>Affected Object</Th>
              <Th>Type</Th>
            </>
          }
        >
          {adminAuditEvents.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                No administrative events recorded yet.
              </td>
            </tr>
          ) : (
            adminAuditEvents.map((evt) => (
              <tr key={evt.id} className="hover:bg-muted/40 transition-colors">
                <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {evt.date}, {evt.time}
                </Td>
                <Td>
                  <div className="min-w-0">
                    <p className="font-medium text-xs text-foreground truncate">{evt.user}</p>
                    <span className="text-[10px] text-muted-foreground uppercase">{evt.role}</span>
                  </div>
                </Td>
                <Td>
                  <span className="font-medium text-xs text-foreground">{evt.action}</span>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-muted-foreground line-clamp-1">{evt.object}</span>
                </Td>
                <Td>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {evt.objectType}
                  </span>
                </Td>
              </tr>
            ))
          )}
        </TableShell>
      </Panel>

      {/* Quick Add User Modal */}
      <Modal
        open={quickUserModalOpen}
        onClose={() => setQuickUserModalOpen(false)}
        title="Provision New Staff Account"
        description="Quickly register a new procurement officer, auditor, or admin."
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="outline" onClick={() => setQuickUserModalOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={handleCreateUser}>Create User</Btn>
          </div>
        }
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Field label="Full Name" required>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Smt. Neha Bansal"
              value={newUserData.name}
              onChange={(e) => setNewUserData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </Field>

          <Field label="Official Email Address" required>
            <input
              type="email"
              className={inputClass}
              placeholder="n.bansal@demo-procure.gov.in"
              value={newUserData.email}
              onChange={(e) => setNewUserData((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="System Role" required>
              <select
                className={inputClass}
                value={newUserData.role}
                onChange={(e) =>
                  setNewUserData((prev) => ({ ...prev, role: e.target.value as Role }))
                }
              >
                <option value="officer">Procurement Officer</option>
                <option value="auditor">Auditor / Vigilance Officer</option>
                <option value="admin">Administrator</option>
              </select>
            </Field>

            <Field label="Department" required>
              <select
                className={inputClass}
                value={newUserData.department}
                onChange={(e) =>
                  setNewUserData((prev) => ({ ...prev, department: e.target.value }))
                }
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Designation / Official Title">
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Executive Engineer (Procurement)"
              value={newUserData.designation}
              onChange={(e) =>
                setNewUserData((prev) => ({ ...prev, designation: e.target.value }))
              }
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
