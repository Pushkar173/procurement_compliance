import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Btn } from "@/components/common/primitives";
import { useStore } from "@/store/app-store";
import type { Role } from "@/data/demoData";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Authentication — ProcureComply" },
      { name: "description", content: "Sign in to ProcureComply." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, login } = useStore();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  const [role, setRole] = useState<Role>("officer");

  useEffect(() => {
    if (user) {
      navigate({ to: redirect || "/dashboard" });
    }
  }, [user, navigate, redirect]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login(role);
    toast.success("Signed in successfully");
    navigate({ to: redirect || "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <span className="text-sm font-semibold text-sidebar-accent-foreground">
            ProcureComply
          </span>
        </Link>
        <div className="max-w-md">
          <h2 className="font-serif text-3xl leading-snug text-sidebar-accent-foreground">
            One platform for regulations, tenders, contracts and compliance records.
          </h2>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:text-left">
            <h1 className="text-2xl font-semibold tracking-tight">ProcureComply</h1>
            <p className="mt-1 text-sm text-muted-foreground">Mock Persona Login</p>
          </div>

          <form onSubmit={submit} className="panel space-y-4 p-6">
            <div>
              <label className="mb-1 block text-sm font-medium">Select Persona</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-md border p-2"
              >
                <option value="admin">Admin</option>
                <option value="officer">Procurement Officer</option>
                <option value="auditor">Auditor</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Btn type="submit">
                <LogIn className="size-4" /> Sign In
              </Btn>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
