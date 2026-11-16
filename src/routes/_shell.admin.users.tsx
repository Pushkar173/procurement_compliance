import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  Mail,
  MoreVertical,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserMinus,
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
  SearchInput,
  Select,
  StatCard,
  TableShell,
  Td,
  Th,
  inputClass,
} from "@/components/common/primitives";
import { DEPARTMENTS, ROLE_LABEL, type AppUser, type Role } from "@/data/demoData";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell/admin/users")({
  head: () => ({
    meta: [
      { title: "User Management — ProcureComply" },
      {
        name: "description",
        content: "Manage user accounts, assign roles, and administer system access permissions.",
      },
    ],
  }),
  component: UsersManagementPage,
});

function UsersManagementPage() {
  const { users, addUser, updateUser, user: currentUser } = useStore();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // New user form state
  const [newUserData, setNewUserData] = useState({
    name: "",
    email: "",
    role: "officer" as Role,
    department: DEPARTMENTS[0] || "Information Technology",
    designation: "",
  });

  // Edit user form state
  const [editUserData, setEditUserData] = useState<{
    name: string;
    email: string;
    role: Role;
    department: string;
    designation: string;
    status: "Active" | "Disabled";
  }>({
    name: "",
    email: "",
    role: "officer",
    department: "",
    designation: "",
    status: "Active",
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (deptFilter && u.department !== deptFilter) return false;
      if (statusFilter && u.status !== statusFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = [u.name, u.email, u.department, u.designation, u.id].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, roleFilter, deptFilter, statusFilter, query]);

  // Metric counts
  const totalUsers = users.length;
  const officersCount = users.filter((u) => u.role === "officer").length;
  const adminsCount = users.filter((u) => u.role === "admin").length;
  const auditorsCount = users.filter((u) => u.role === "auditor").length;
  const activeCount = users.filter((u) => u.status === "Active").length;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name.trim() || !newUserData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    const nextId = `USR-${String(users.length + 1).padStart(3, "0")}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
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
    setAddModalOpen(false);
  };

  const openEditModal = (u: AppUser) => {
    setSelectedUser(u);
    setEditUserData({
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      designation: u.designation,
      status: u.status,
    });
    setEditModalOpen(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editUserData.name.trim() || !editUserData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    updateUser(selectedUser.id, {
      name: editUserData.name.trim(),
      email: editUserData.email.trim(),
      role: editUserData.role,
      department: editUserData.department,
      designation: editUserData.designation.trim(),
      status: editUserData.status,
    });

    toast.success(`User ${editUserData.name} updated successfully`);
    setEditModalOpen(false);
    setSelectedUser(null);
  };

  const toggleUserStatus = (u: AppUser) => {
    if (u.id === currentUser?.id) {
      toast.error("You cannot disable your own active administrator account");
      return;
    }
    const nextStatus = u.status === "Active" ? "Disabled" : "Active";
    updateUser(u.id, { status: nextStatus });
    toast.info(`Account status for ${u.name} set to ${nextStatus}`);
  };

  const exportCSV = () => {
    const header = "ID,Name,Email,Role,Department,Designation,Status,LastLogin\n";
    const rows = filteredUsers
      .map(
        (u) =>
          `"${u.id}","${u.name}","${u.email}","${u.role}","${u.department}","${u.designation}","${u.status}","${u.lastLogin}"`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `procurecomply-users-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("User directory exported to CSV");
  };

  const getRoleTone = (role: Role) => {
    switch (role) {
      case "admin":
        return "danger";
      case "auditor":
        return "warning";
      case "officer":
      default:
        return "primary";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage authorized staff, assign system roles, and govern permissions across departments."
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={exportCSV}>
              <Download className="size-4" />
              Export CSV
            </Btn>
            <Btn size="sm" onClick={() => setAddModalOpen(true)}>
              <UserPlus className="size-4" />
              Add User
            </Btn>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Accounts"
          value={totalUsers}
          icon={Users}
          hint="Registered users in directory"
          tone="primary"
        />
        <StatCard
          label="Officers"
          value={officersCount}
          icon={ShieldCheck}
          hint="Procurement & tender execution"
          tone="primary"
        />
        <StatCard
          label="Auditors"
          value={auditorsCount}
          icon={Shield}
          hint="Vigilance & oversight reviewers"
          tone="warning"
        />
        <StatCard
          label="Administrators"
          value={adminsCount}
          icon={ShieldAlert}
          hint="System governance & config"
          tone="caution"
        />
        <StatCard
          label="Active Status"
          value={`${activeCount}/${totalUsers}`}
          icon={UserCheck}
          hint="Currently enabled"
          tone="success"
        />
      </div>

      {/* Filter and Search Bar */}
      <Panel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            placeholder="Search by name, email, designation..."
            value={query}
            onChange={setQuery}
          />
          <Select
            label="Filter by Role"
            value={roleFilter}
            options={["officer", "admin", "auditor"]}
            onChange={setRoleFilter}
            allLabel="All roles"
          />
          <Select
            label="Filter by Department"
            value={deptFilter}
            options={DEPARTMENTS}
            onChange={setDeptFilter}
            allLabel="All departments"
          />
          <Select
            label="Filter by Status"
            value={statusFilter}
            options={["Active", "Disabled"]}
            onChange={setStatusFilter}
            allLabel="All statuses"
          />
        </div>
      </Panel>

      {/* User Directory Table */}
      <Panel
        title={`User Directory (${filteredUsers.length} of ${users.length})`}
        description="Comprehensive list of staff members with role assignments and access statuses."
      >
        <TableShell
          head={
            <>
              <Th>User Profile</Th>
              <Th>Email & Department</Th>
              <Th>Assigned Role</Th>
              <Th>Status</Th>
              <Th>Last Activity</Th>
              <Th className="text-right">Actions</Th>
            </>
          }
        >
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                No users match your search criteria.
              </td>
            </tr>
          ) : (
            filteredUsers.map((u) => {
              const initials = u.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              const isSelf = u.id === currentUser?.id;

              return (
                <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground truncate">{u.name}</p>
                          {isSelf && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.designation} ({u.id})
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate flex items-center gap-1">
                        <Mail className="size-3 text-muted-foreground" />
                        {u.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{u.department}</p>
                    </div>
                  </Td>
                  <Td>
                    <Pill tone={getRoleTone(u.role)} dot>
                      {ROLE_LABEL[u.role]}
                    </Pill>
                  </Td>
                  <Td>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                        u.status === "Active"
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          u.status === "Active" ? "bg-success" : "bg-muted-foreground"
                        }`}
                      />
                      {u.status}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {u.lastLogin || "Never"}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Btn
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(u)}
                        title="Edit user details and role"
                      >
                        Edit
                      </Btn>
                      <Btn
                        variant={u.status === "Active" ? "ghost" : "subtle"}
                        size="sm"
                        onClick={() => toggleUserStatus(u)}
                        disabled={isSelf}
                        className={
                          u.status === "Active" ? "text-destructive hover:bg-destructive/10" : ""
                        }
                        title={u.status === "Active" ? "Disable account" : "Enable account"}
                      >
                        {u.status === "Active" ? (
                          <UserMinus className="size-3.5" />
                        ) : (
                          <UserCheck className="size-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {u.status === "Active" ? "Disable" : "Enable"}
                        </span>
                      </Btn>
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </TableShell>
      </Panel>

      {/* Role Permissions Reference Matrix */}
      <Panel
        title="Role Permissions Matrix"
        description="Reference guideline for role segregation and access governance in ProcureComply."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <ShieldCheck className="size-4" />
              Procurement Officer
            </div>
            <p className="text-xs text-muted-foreground">
              Operational officers responsible for drafting tenders, uploading compliance evidence,
              and managing contract delivery.
            </p>
            <ul className="text-xs space-y-1 text-foreground/80 list-disc list-inside pt-2">
              <li>Create & edit assigned tenders</li>
              <li>Link relevant regulatory circulars</li>
              <li>Upload compliance evidence & certificates</li>
              <li>Update contract milestones & payments</li>
            </ul>
          </div>

          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-warning-foreground font-semibold text-sm">
              <Shield className="size-4" />
              Auditor / Vigilance Officer
            </div>
            <p className="text-xs text-muted-foreground">
              Independent oversight personnel responsible for reviewing compliance status, evidence
              validity, and audit trail integrity.
            </p>
            <ul className="text-xs space-y-1 text-foreground/80 list-disc list-inside pt-2">
              <li>Read-only access across all modules</li>
              <li>Inspect uploaded compliance evidence</li>
              <li>Generate compliance & risk reports</li>
              <li>Examine tamper-evident audit logs</li>
            </ul>
          </div>

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
              <ShieldAlert className="size-4" />
              Administrator
            </div>
            <p className="text-xs text-muted-foreground">
              Executive authority managing platform configuration, user account provisioning, and
              regulatory master data.
            </p>
            <ul className="text-xs space-y-1 text-foreground/80 list-disc list-inside pt-2">
              <li>Provision & deactivate user accounts</li>
              <li>Publish and archive regulatory circulars</li>
              <li>Configure threshold values & system rules</li>
              <li>Full override and management authority</li>
            </ul>
          </div>
        </div>
      </Panel>

      {/* Add User Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Provision New Staff Account"
        description="Add a new personnel account and assign appropriate permissions."
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="outline" onClick={() => setAddModalOpen(false)}>
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
              placeholder="e.g. Dr. Rajesh Sharma"
              value={newUserData.name}
              onChange={(e) => setNewUserData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </Field>

          <Field label="Official Email Address" required>
            <input
              type="email"
              className={inputClass}
              placeholder="r.sharma@demo-procure.gov.in"
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
              placeholder="e.g. Deputy General Manager (Contracts)"
              value={newUserData.designation}
              onChange={(e) => setNewUserData((prev) => ({ ...prev, designation: e.target.value }))}
            />
          </Field>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit User: ${selectedUser?.name}`}
        description="Update user account information, designation, or access status."
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={handleUpdateUser}>Save Changes</Btn>
          </div>
        }
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <Field label="Full Name" required>
            <input
              type="text"
              className={inputClass}
              value={editUserData.name}
              onChange={(e) => setEditUserData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </Field>

          <Field label="Official Email Address" required>
            <input
              type="email"
              className={inputClass}
              value={editUserData.email}
              onChange={(e) => setEditUserData((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="System Role" required>
              <select
                className={inputClass}
                value={editUserData.role}
                onChange={(e) =>
                  setEditUserData((prev) => ({ ...prev, role: e.target.value as Role }))
                }
              >
                <option value="officer">Procurement Officer</option>
                <option value="auditor">Auditor / Vigilance Officer</option>
                <option value="admin">Administrator</option>
              </select>
            </Field>

            <Field label="Account Status" required>
              <select
                className={inputClass}
                value={editUserData.status}
                onChange={(e) =>
                  setEditUserData((prev) => ({
                    ...prev,
                    status: e.target.value as "Active" | "Disabled",
                  }))
                }
              >
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Department" required>
              <select
                className={inputClass}
                value={editUserData.department}
                onChange={(e) =>
                  setEditUserData((prev) => ({ ...prev, department: e.target.value }))
                }
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Designation">
              <input
                type="text"
                className={inputClass}
                value={editUserData.designation}
                onChange={(e) =>
                  setEditUserData((prev) => ({ ...prev, designation: e.target.value }))
                }
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
