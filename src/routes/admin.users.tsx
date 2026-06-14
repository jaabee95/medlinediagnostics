import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { createAdminUser, resetAdminPassword, setUserActive, setUserPermissions } from "@/lib/admin-users.functions";
import { ADMIN_PAGES } from "@/lib/permissions";
import { Plus, KeyRound, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: () => <AdminShell title="Users"><Users /></AdminShell>,
});

const PERMISSION_PAGES = ADMIN_PAGES.filter((p) => p.key !== "account" && p.key !== "users");

function Users() {
  const qc = useQueryClient();
  const create = useServerFn(createAdminUser);
  const reset = useServerFn(resetAdminPassword);
  const toggleActive = useServerFn(setUserActive);

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      const roleMap = new Map<string, string[]>();
      for (const r of roles.data || []) {
        const arr = roleMap.get(r.user_id) || [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      }
      return (profiles.data || []).map((p: any) => ({ ...p, roles: roleMap.get(p.id) || [] }));
    },
  });

  const [creating, setCreating] = useState(false);
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [permsUser, setPermsUser] = useState<any | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  async function onToggle(u: any) {
    try { await toggleActive({ data: { user_id: u.id, is_active: !u.is_active } }); refresh(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> Add User</Button>
      </div>
      <div className="grid gap-3">
        {users.map((u: any) => {
          const isAdminRole = u.roles.includes("admin");
          return (
            <Card key={u.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{u.username}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs uppercase ${isAdminRole ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {isAdminRole ? "Admin" : "Staff"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">{u.full_name || "—"}</div>
                  <div className="mt-1 flex gap-2 text-xs">
                    {u.must_change_password && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Must change password</span>}
                    {!u.is_active && <span className="rounded-full bg-muted px-2 py-0.5">Inactive</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isAdminRole && (
                    <Button size="sm" variant="outline" onClick={() => setPermsUser(u)}>
                      <Shield className="mr-1 h-3 w-3" />Permissions
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setResetUser(u)}><KeyRound className="mr-1 h-3 w-3" />Reset</Button>
                  <Button size="sm" variant={u.is_active ? "ghost" : "default"} onClick={() => onToggle(u)}>
                    {u.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <CreateUserForm
            onCreate={async (payload) => {
              try {
                await create({ data: payload });
                toast.success("User created");
                setCreating(false); refresh();
              } catch (err: any) { toast.error(err.message); }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={resetUser !== null} onOpenChange={(o) => !o && setResetUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reset password for {resetUser?.username}</DialogTitle></DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            try {
              await reset({ data: { user_id: resetUser.id, password: String(fd.get("password")) } });
              toast.success("Password reset. User must change on next login.");
              setResetUser(null); refresh();
            } catch (err: any) { toast.error(err.message); }
          }} className="space-y-3">
            <div className="space-y-1.5"><Label>New temporary password</Label><Input name="password" type="text" required /></div>
            <Button type="submit" className="w-full">Reset</Button>
          </form>
        </DialogContent>
      </Dialog>

      <PermissionsDialog
        user={permsUser}
        onClose={() => setPermsUser(null)}
      />
    </div>
  );
}

function CreateUserForm({ onCreate }: { onCreate: (d: any) => Promise<void> }) {
  const [role, setRole] = useState<"staff" | "admin">("staff");
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      await onCreate({
        username: String(fd.get("username")),
        full_name: String(fd.get("full_name")),
        password: String(fd.get("password")),
        role,
      });
    }} className="space-y-3">
      <div className="space-y-1.5"><Label>Username</Label><Input name="username" required /></div>
      <div className="space-y-1.5"><Label>Full name</Label><Input name="full_name" /></div>
      <div className="space-y-1.5">
        <Label>Role</Label>
        <Select value={role} onValueChange={(v) => setRole(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="staff">Staff — limited access (set permissions after creation)</SelectItem>
            <SelectItem value="admin">Admin — full access to everything</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Temporary password</Label><Input name="password" type="text" required /></div>
      <Button type="submit" className="w-full">Create user</Button>
    </form>
  );
}

function PermissionsDialog({ user, onClose }: { user: any | null; onClose: () => void }) {
  const save = useServerFn(setUserPermissions);
  const [perms, setPerms] = useState<Record<string, { can_view: boolean; can_edit: boolean }>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_permissions").select("*").eq("user_id", user.id);
      const map: Record<string, { can_view: boolean; can_edit: boolean }> = {};
      for (const p of PERMISSION_PAGES) {
        const existing = (data || []).find((r: any) => r.page_key === p.key);
        map[p.key] = { can_view: existing?.can_view ?? false, can_edit: existing?.can_edit ?? false };
      }
      setPerms(map);
    })();
  }, [user?.id]);

  async function onSave() {
    if (!user) return;
    setBusy(true);
    try {
      await save({
        data: {
          user_id: user.id,
          permissions: PERMISSION_PAGES.map((p) => ({
            page_key: p.key,
            can_view: perms[p.key]?.can_view ?? false,
            can_edit: perms[p.key]?.can_edit ?? false,
          })),
        },
      });
      toast.success("Permissions saved");
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={user !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Permissions for {user?.username}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Pick which admin pages this staff user can see and edit.</p>
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b pb-2 text-xs font-medium uppercase text-muted-foreground">
            <span>Page</span><span>View</span><span>Edit</span>
          </div>
          {PERMISSION_PAGES.map((p) => (
            <div key={p.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2">
              <span className="text-sm">{p.label}</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={perms[p.key]?.can_view ?? false}
                onChange={(e) => setPerms({ ...perms, [p.key]: { ...perms[p.key], can_view: e.target.checked } })}
              />
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={perms[p.key]?.can_edit ?? false}
                onChange={(e) => {
                  const edit = e.target.checked;
                  setPerms({ ...perms, [p.key]: { can_view: edit || (perms[p.key]?.can_view ?? false), can_edit: edit } });
                }}
              />
            </div>
          ))}
        </div>
        <Button className="w-full" onClick={onSave} disabled={busy}>{busy ? "Saving…" : "Save permissions"}</Button>
      </DialogContent>
    </Dialog>
  );
}
