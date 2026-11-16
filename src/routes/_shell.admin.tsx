import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useStore } from "@/store/app-store";

export const Route = createFileRoute("/_shell/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== "admin") {
      toast.error("Unauthorized access");
      navigate({ to: "/dashboard" });
    }
  }, [user, navigate]);

  if (!user || user.role !== "admin") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Checking permissions…</p>
      </div>
    );
  }

  return <Outlet />;
}
