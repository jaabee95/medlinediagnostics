import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, Images, Stethoscope, Star,
  Inbox, Users, KeyRound, LogOut, FlaskConical, Menu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import logo from "@/assets/medline-logo.png";
import { useAccess, type PageKey } from "@/lib/permissions";

const NAV: { to: string; label: string; icon: any; key: PageKey; exact?: boolean }[] = [
  { to: "/admin",           label: "Dashboard",          icon: LayoutDashboard, key: "dashboard", exact: true },
  { to: "/admin/profile",   label: "Diagnostic Profile", icon: Building2,       key: "profile" },
  { to: "/admin/slides",    label: "Homepage Slider",    icon: Images,          key: "slides" },
  { to: "/admin/services",  label: "Services & Tests",   icon: FlaskConical,    key: "services" },
  { to: "/admin/doctors",   label: "Doctors",            icon: Stethoscope,     key: "doctors" },
  { to: "/admin/enquiries", label: "Enquiries",          icon: Inbox,           key: "enquiries" },
  { to: "/admin/reviews",   label: "Reviews",            icon: Star,            key: "reviews" },
  { to: "/admin/users",     label: "Users",              icon: Users,           key: "users" },
  { to: "/admin/account",   label: "Account",            icon: KeyRound,        key: "account" },
];

type Profile = { id: string; username: string; full_name: string | null; must_change_password: boolean; is_active: boolean };

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [forceChange, setForceChange] = useState(false);

  const access = useAccess(userId);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/admin/login" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const hasAccess = (roles || []).some((r: any) => r.role === "admin" || r.role === "staff");
      if (!hasAccess) {
        await supabase.auth.signOut();
        toast.error("You do not have admin access");
        navigate({ to: "/admin/login" });
        return;
      }
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setMe(p as Profile);
      setUserId(user.id);
      if (p?.must_change_password) setForceChange(true);
      setLoading(false);
    })();
  }, [navigate]);

  // Page access gate (run after access is loaded)
  useEffect(() => {
    if (!access.isLoaded) return;
    const current = NAV.find((n) => (n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(n.to + "/")));
    // Account page is always accessible to self
    if (!current || current.key === "account") return;
    if (!access.can(current.key)) {
      toast.error("You don't have access to that page");
      navigate({ to: "/admin" });
    }
  }, [access.isLoaded, pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading admin…</div>;
  }

  const isActive = (item: typeof NAV[number]) =>
    item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");

  const visibleNav = NAV.filter((n) => n.key === "account" || access.can(n.key));

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-card transition-transform md:static md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <img src={logo} alt="" className="h-8 w-8" />
          <div>
            <div className="text-sm font-semibold leading-tight">Medline</div>
            <div className="text-xs text-muted-foreground">Admin Panel</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(item)
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t p-3">
          <div className="mb-2 px-2 text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{me?.username}</span>
            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{access.isAdmin ? "admin" : "staff"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex min-h-screen flex-1 flex-col md:pl-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg font-semibold">{title}</h1>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <ForcePasswordChange open={forceChange} onDone={() => setForceChange(false)} />
    </div>
  );
}

function ForcePasswordChange({ open, onDone }: { open: boolean; onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setBusy(false); return toast.error(error.message); }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
    setBusy(false);
    toast.success("Password updated");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={() => { /* force */ }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set a new password</DialogTitle>
          <DialogDescription>For security, please change the default password before continuing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="np">New password</Label>
            <Input id="np" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np2">Confirm password</Label>
            <Input id="np2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
