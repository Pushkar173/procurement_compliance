import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const { user } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Checking session…</p>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
