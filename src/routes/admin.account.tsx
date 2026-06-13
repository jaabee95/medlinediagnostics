import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/account")({
  head: () => ({ meta: [{ title: "My Account — Admin" }] }),
  component: () => <AdminShell title="My Account"><Account /></AdminShell>,
});

function Account() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPw(""); setPw2("");
    toast.success("Password updated");
  }

  return (
    <Card className="max-w-md">
      <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>Confirm password</Label><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></div>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
