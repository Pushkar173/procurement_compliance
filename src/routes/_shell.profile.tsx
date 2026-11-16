import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Mail, Shield, User } from "lucide-react";

import { Pill } from "@/components/common/badges";
import {
  Btn,
  DemoNotice,
  KeyValue,
  PageHeader,
  Panel,
} from "@/components/common/primitives";
import { ROLE_LABEL } from "@/data/demoData";
import { useStore } from "@/store/app-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/profile")({
  head: () => ({
    meta: [
      { title: "Profile — ProcureComply" },
      { name: "description", content: "View and manage your account profile." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useStore();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="View your account details and session information."
      />

      <DemoNotice />

      <Panel title="Account Information" bodyClassName="p-5 space-y-6">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
            <User className="size-7" />
          </div>
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.designation}</p>
            <div className="mt-1 flex items-center gap-2">
              <Pill tone="primary">{ROLE_LABEL[user.role]}</Pill>
              <Pill tone={user.status === "Active" ? "success" : "danger"}>{user.status}</Pill>
            </div>
          </div>
        </div>

        <KeyValue
          items={[
            { label: "Full Name", value: user.name },
            { label: "Email", value: user.email },
            { label: "Role", value: ROLE_LABEL[user.role] },
            { label: "Department", value: user.department },
            { label: "Designation", value: user.designation },
            { label: "Status", value: user.status },
            { label: "Last Login", value: user.lastLogin },
          ]}
        />
      </Panel>

      <Panel title="Security" bodyClassName="p-5 space-y-3">
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div className="flex items-center gap-3">
            <KeyRound className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Last changed: Demo mode</p>
            </div>
          </div>
          <Btn
            variant="outline"
            size="sm"
            onClick={() => toast.info("Password change is a demo action", { description: "Connect to Supabase to enable real authentication." })}
          >
            Change Password
          </Btn>
        </div>
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2.5">
          <Shield className="mt-0.5 size-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            This is a mock authentication session. In production, authentication is handled by Supabase Auth with JWT tokens and automatic session refresh.
          </p>
        </div>
      </Panel>
    </div>
  );
}
