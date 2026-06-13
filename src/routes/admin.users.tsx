import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { createAdminUser, resetAdminPassword, setUserActive } from "@/lib/admin-users.functions";
import { Plus, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: () => <AdminShell title="Users"><Users /></AdminShell>,
});

function Users() {
  const qc = useQueryClient();
  const create = useServerFn(createAdminUser);
  const reset = useServerFn(resetAdminPassword);
  const toggleActive = useServerFn(setUserActive);

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at")).data || [],
  });

  const [creating, setCreating] = useState(false);
  const [resetUser, setResetUser] = useState<any | null>(null);
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
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="font-semibold">{u.username}</div>
                <div className="text-sm text-muted-foreground">{u.full_name || "—"}</div>
                <div className="mt-1 flex gap-2 text-xs">
                  {u.must_change_password && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Must change password</span>}
                  {!u.is_active && <span className="rounded-full bg-muted px-2 py-0.5">Inactive</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setResetUser(u)}><KeyRound className="mr-1 h-3 w-3" />Reset</Button>
                <Button size="sm" variant={u.is_active ? "ghost" : "default"} onClick={() => onToggle(u)}>
                  {u.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Admin User</DialogTitle></DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            try {
              await create({ data: { username: String(fd.get("username")), full_name: String(fd.get("full_name")), password: String(fd.get("password")) } });
              toast.success("User created");
              setCreating(false); refresh();
            } catch (err: any) { toast.error(err.message); }
          }} className="space-y-3">
            <div className="space-y-1.5"><Label>Username</Label><Input name="username" required /></div>
            <div className="space-y-1.5"><Label>Full name</Label><Input name="full_name" /></div>
            <div className="space-y-1.5"><Label>Temporary password</Label><Input name="password" type="text" required /></div>
            <Button type="submit" className="w-full">Create user</Button>
          </form>
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
    </div>
  );
}
