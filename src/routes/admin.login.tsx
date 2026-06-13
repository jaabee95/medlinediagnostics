import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, User as UserIcon } from "lucide-react";
import logo from "@/assets/medline-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login — Medline Diagnostics" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const username = String(fd.get("username") || "").trim();
    const password = String(fd.get("password") || "");
    if (!username || !password) { toast.error("Enter username and password"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: `${username.toLowerCase()}@medline.local`,
      password,
    });
    setLoading(false);
    if (error) { toast.error("Invalid credentials"); return; }
    toast.success("Welcome back");
    navigate({ to: "/admin" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 shadow-elegant">
        <div className="text-center">
          <img src={logo} alt="" className="mx-auto h-12 w-12" width={48} height={48} />
          <h1 className="mt-3 font-display text-2xl font-bold">Staff Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Medline Diagnostics admin panel</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="username" name="username" defaultValue="Admin" className="pl-9" autoComplete="username" required />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="password" name="password" type="password" className="pl-9" autoComplete="current-password" required />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
        <p className="text-center text-xs text-muted-foreground">
          Default: <code className="rounded bg-muted px-1.5 py-0.5">Admin / Admin@123</code>
        </p>
      </form>
    </div>
  );
}
