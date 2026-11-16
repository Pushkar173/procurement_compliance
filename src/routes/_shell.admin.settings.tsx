import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Key,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Btn,
  Field,
  Modal,
  PageHeader,
  Panel,
  StatCard,
  inputClass,
} from "@/components/common/primitives";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell/admin/settings")({
  head: () => ({
    meta: [
      { title: "System Settings — ProcureComply" },
      {
        name: "description",
        content: "Configure compliance policies, security rules, and data integrations.",
      },
    ],
  }),
  component: AdminSettingsPage,
});

const SETTINGS_STORAGE_KEY = "procurecomply.admin_settings";

interface SystemConfig {
  orgName: string;
  portalTitle: string;
  adminEmail: string;
  fiscalYear: string;
  minComplianceScore: number;
  requireEvidenceForCompliant: boolean;
  highValueDualApproval: boolean;
  strictAuditLogging: boolean;
  escalationNoticeDays: number;
  autoArchiveCompletedDays: number;
}

const defaultSettings: SystemConfig = {
  orgName: "National Infrastructure & Energy Undertaking",
  portalTitle: "ProcureComply Enterprise",
  adminEmail: "admin@vistaar-demo.example",
  fiscalYear: "2026-2027",
  minComplianceScore: 85,
  requireEvidenceForCompliant: true,
  highValueDualApproval: true,
  strictAuditLogging: true,
  escalationNoticeDays: 14,
  autoArchiveCompletedDays: 90,
};

function AdminSettingsPage() {
  const store = useStore();
  const [settings, setSettings] = useState<SystemConfig>(defaultSettings);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "mock">("mock");

  // Load saved settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
    } catch {
      /* ignore */
    }

    // Check supabase status
    const hasLiveUrl = Boolean(import.meta.env["VITE_SUPABASE_URL"]);
    setConnectionStatus(hasLiveUrl ? "connected" : "mock");
  }, []);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      store.log({
        action: "System settings updated",
        object: "System Configuration",
        objectType: "Session",
      });
      toast.success("System configuration saved successfully", {
        description: "All administrative parameters and compliance thresholds have been updated.",
      });
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const handleResetDefaults = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    toast.info("Settings restored to factory defaults");
  };

  const handleResetData = () => {
    try {
      localStorage.clear();
      toast.success("System prototype reset. Reloading application...");
      setTimeout(() => {
        window.location.href = "/admin";
      }, 800);
    } catch {
      toast.error("Failed to reset prototype data");
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const hasLiveUrl = Boolean(import.meta.env["VITE_SUPABASE_URL"]);
      if (hasLiveUrl) {
        const { error } = await supabase.from("compliance_records").select("count", { count: "exact", head: true });
        if (!error) {
          setConnectionStatus("connected");
          toast.success("Supabase live connection confirmed", {
            description: "Database and authentication endpoints are reachable.",
          });
        } else {
          setConnectionStatus("mock");
          toast.warning("Supabase returned an error. Operating in mock fallback mode.", {
            description: error.message,
          });
        }
      } else {
        setConnectionStatus("mock");
        toast.info("Operating in robust prototype mode", {
          description: "All records are simulated in memory and persisted locally via localStorage.",
        });
      }
    } catch {
      setConnectionStatus("mock");
      toast.info("Operating in prototype mode");
    } finally {
      setTestingConnection(false);
    }
  };

  const exportSystemBackup = () => {
    const backup = {
      exportTimestamp: new Date().toISOString(),
      settings,
      users: store.users,
      documents: store.documents,
      tenders: store.tenders,
      contracts: store.contracts,
      compliance: store.compliance,
      auditEvents: store.audit,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `procurecomply-full-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Full system backup exported (JSON)");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings & Governance Rules"
        subtitle="Configure organizational details, compliance verification rules, security thresholds, and backend integration status."
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" onClick={handleResetDefaults}>
              <RotateCcw className="size-4" />
              Reset Defaults
            </Btn>
            <Btn size="sm" onClick={handleSave}>
              <Save className="size-4" />
              Save Configuration
            </Btn>
          </div>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Target Compliance"
          value={`${settings.minComplianceScore}%`}
          icon={ShieldCheck}
          hint="Minimum acceptable audit score"
          tone="primary"
        />
        <StatCard
          label="Escalation SLA"
          value={`${settings.escalationNoticeDays} Days`}
          icon={AlertTriangle}
          hint="Advance notice for audit deadlines"
          tone="warning"
        />
        <StatCard
          label="Storage Provider"
          value={connectionStatus === "connected" ? "Supabase Cloud" : "Local Prototype"}
          icon={Database}
          hint="Evidence & document store"
          tone={connectionStatus === "connected" ? "success" : "info"}
        />
        <StatCard
          label="Dual Sign-Off"
          value={settings.highValueDualApproval ? "Enforced" : "Disabled"}
          icon={Shield}
          hint="Required for tenders > ₹50 Cr"
          tone="caution"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Organization & Portal Config */}
        <Panel
          title="Organization & General Information"
          description="Basic organization identity and fiscal calendar parameters."
        >
          <div className="space-y-4">
            <Field label="Organization / PSU Name" required>
              <input
                type="text"
                className={inputClass}
                value={settings.orgName}
                onChange={(e) => setSettings((s) => ({ ...s, orgName: e.target.value }))}
              />
            </Field>

            <Field label="Portal Title">
              <input
                type="text"
                className={inputClass}
                value={settings.portalTitle}
                onChange={(e) => setSettings((s) => ({ ...s, portalTitle: e.target.value }))}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary Admin Email" required>
                <input
                  type="email"
                  className={inputClass}
                  value={settings.adminEmail}
                  onChange={(e) => setSettings((s) => ({ ...s, adminEmail: e.target.value }))}
                />
              </Field>

              <Field label="Active Fiscal Year">
                <input
                  type="text"
                  className={inputClass}
                  value={settings.fiscalYear}
                  onChange={(e) => setSettings((s) => ({ ...s, fiscalYear: e.target.value }))}
                />
              </Field>
            </div>
          </div>
        </Panel>

        {/* Compliance & Vigilance Rules */}
        <Panel
          title="Compliance & Audit Enforcement Rules"
          description="Verification standards and risk mitigation controls enforced across tender cycles."
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3.5 bg-card">
              <div>
                <p className="text-sm font-medium">Mandatory Evidence Upload</p>
                <p className="text-xs text-muted-foreground">
                  Prevent marking compliance items as "Compliant" without an attached document or certificate.
                </p>
              </div>
              <input
                type="checkbox"
                className="size-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                checked={settings.requireEvidenceForCompliant}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, requireEvidenceForCompliant: e.target.checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3.5 bg-card">
              <div>
                <p className="text-sm font-medium">Dual Sign-Off for High-Value Tenders</p>
                <p className="text-xs text-muted-foreground">
                  Requires independent approval by both Procurement Officer and Finance Controller for bids &gt; ₹50 Cr.
                </p>
              </div>
              <input
                type="checkbox"
                className="size-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                checked={settings.highValueDualApproval}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, highValueDualApproval: e.target.checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3.5 bg-card">
              <div>
                <p className="text-sm font-medium">Comprehensive Audit Trail Logging</p>
                <p className="text-xs text-muted-foreground">
                  Log document view, download, status update, and credential authentication events.
                </p>
              </div>
              <input
                type="checkbox"
                className="size-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                checked={settings.strictAuditLogging}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, strictAuditLogging: e.target.checked }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-1">
              <Field label="Minimum Target Compliance Score (%)">
                <input
                  type="number"
                  min="50"
                  max="100"
                  className={inputClass}
                  value={settings.minComplianceScore}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, minComplianceScore: Number(e.target.value) || 85 }))
                  }
                />
              </Field>

              <Field label="Escalation Notice Window (Days)">
                <input
                  type="number"
                  min="1"
                  max="60"
                  className={inputClass}
                  value={settings.escalationNoticeDays}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, escalationNoticeDays: Number(e.target.value) || 14 }))
                  }
                />
              </Field>
            </div>
          </div>
        </Panel>

        {/* Cloud & Supabase Integration */}
        <Panel
          title="Cloud Backend & Storage Status"
          description="Configuration of Supabase Postgres database, Auth, and Storage bucket integration."
          actions={
            <Btn
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testingConnection}
            >
              <RefreshCw className={`size-3.5 ${testingConnection ? "animate-spin" : ""}`} />
              Test Connection
            </Btn>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border p-4 bg-muted/20">
              <div
                className={`grid size-10 place-items-center rounded-lg ${
                  connectionStatus === "connected"
                    ? "bg-success/15 text-success"
                    : "bg-info/15 text-info"
                }`}
              >
                <Server className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">
                    {connectionStatus === "connected"
                      ? "Supabase Live Connection Active"
                      : "Prototype / Mock Storage Active"}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      connectionStatus === "connected"
                        ? "bg-success/20 text-success"
                        : "bg-info/20 text-info"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        connectionStatus === "connected" ? "bg-success" : "bg-info"
                      }`}
                    />
                    {connectionStatus === "connected" ? "Cloud Connected" : "Local Fallback"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {connectionStatus === "connected"
                    ? "Using live Supabase Storage bucket for evidence uploads and PostgreSQL tables."
                    : "Operating in self-contained prototype mode. All data is managed safely in browser state."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Storage Bucket Name</span>
                <span className="font-mono font-medium">compliance-evidence</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Project Endpoint</span>
                <span className="font-mono font-medium truncate max-w-[200px] sm:max-w-[260px]">
                  {import.meta.env["VITE_SUPABASE_URL"] || "https://placeholder.supabase.co"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Row Level Security (RLS)</span>
                <span className="font-medium text-success flex items-center gap-1">
                  <ShieldCheck className="size-3.5" /> Enforced via Migrations
                </span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Data Management & Disaster Recovery */}
        <Panel
          title="Data Management & Backup"
          description="Export full state backups or reset prototype data to original demonstration seeds."
        >
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-card space-y-2">
              <p className="text-sm font-medium">Export System State</p>
              <p className="text-xs text-muted-foreground">
                Download a complete JSON snapshot containing all users, regulatory documents, tenders, contracts, compliance items, and audit logs.
              </p>
              <Btn variant="outline" size="sm" onClick={exportSystemBackup}>
                <Download className="size-4" />
                Export Full Backup (JSON)
              </Btn>
            </div>

            <div className="rounded-lg border border-destructive/25 p-4 bg-destructive/5 space-y-2">
              <p className="text-sm font-medium text-destructive">Danger Zone: Reset Demo State</p>
              <p className="text-xs text-muted-foreground">
                Clears all custom added users, documents, and modified records, resetting ProcureComply back to pristine seed data.
              </p>
              <Btn
                variant="danger"
                size="sm"
                onClick={() => setResetModalOpen(true)}
              >
                <Trash2 className="size-4" />
                Reset Prototype Data
              </Btn>
            </div>
          </div>
        </Panel>
      </div>

      {/* Confirmation Modal for Reset */}
      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Prototype Data?"
        description="This will clear your local storage session and reload all original seed data."
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="outline" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Btn>
            <Btn variant="danger" onClick={handleResetData}>
              Yes, Reset Everything
            </Btn>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Any custom users created, uploaded documents, or compliance changes during this session will be reverted to initial defaults. Are you sure?
        </p>
      </Modal>
    </div>
  );
}
