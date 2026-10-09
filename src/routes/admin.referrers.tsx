import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Pencil, Network } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/permissions";
import { inr, type Referrer } from "@/lib/billing";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/referrers")({
  head: () => ({ meta: [{ title: "Referrers — Admin" }] }),
  component: () => <AdminShell title="Referrers (CRM)"><Referrers /></AdminShell>,
});

const REFERRER_TYPES = ["doctor", "clinic", "hospital", "organization", "other"];

function Referrers() {
  const qc = useQueryClient();
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  const access = useAccess(uid);
  const [editing, setEditing] = useState<Referrer | null | "new">(null);

  const { data } = useQuery({
    queryKey: ["referrers-crm"],
    queryFn: async () => {
      const [refs, inv, pay] = await Promise.all([
        supabase.from("referrers").select("*").order("name"),
        supabase.from("invoices").select("id,referrer_id,status,total"),
        supabase.from("payments").select("invoice_id,amount"),
      ]);
      return { refs: (refs.data || []) as Referrer[], invoices: inv.data || [], payments: pay.data || [] };
    },
  });

  const refs = data?.refs || [];
  const outstanding = (refId: string) => {
    const paidMap = new Map<string, number>();
    for (const p of data?.payments || []) paidMap.set(p.invoice_id, (paidMap.get(p.invoice_id) || 0) + Number(p.amount || 0));
    return (data?.invoices || [])
      .filter((i: any) => i.referrer_id === refId && i.status === "issued")
      .reduce((s: number, i: any) => s + Math.max(0, Number(i.total || 0) - (paidMap.get(i.id) || 0)), 0);
  };
  const invoiceCount = (refId: string) =>
    (data?.invoices || []).filter((i: any) => i.referrer_id === refId).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {access.can("referrers", "edit") && <Button onClick={() => setEditing("new")}><Plus className="mr-1 h-4 w-4" /> Add Referrer</Button>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {refs.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.name}</span>
                    {!r.is_active && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Inactive</span>}
                  </div>
                  <div className="text-xs capitalize text-muted-foreground">{r.type}</div>
                  <div className="mt-1 text-sm">{r.phone || "—"}</div>
                  {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
                </div>
                {access.can("referrers", "edit") && <Button aria-label="Edit referrer" size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>}
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <div className="text-xs text-muted-foreground">{invoiceCount(r.id)} invoices</div>
                <div className={`text-sm font-bold ${outstanding(r.id) > 0 ? "text-primary" : "text-success"}`}>
                  Credit: {inr(outstanding(r.id))}
                </div>
              </div>
              {r.notes && <p className="mt-2 text-xs text-muted-foreground">{r.notes}</p>}
            </CardContent>
          </Card>
        ))}
        {refs.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <Network className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No referrers yet. Add doctors, clinics or organizations that send patients.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <ReferrerDialog
        open={editing !== null}
        referrer={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["referrers-crm"] }); }}
      />
    </div>
  );
}

function ReferrerDialog({ open, referrer, onClose, onSaved }: {
  open: boolean; referrer: Referrer | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const isEdit = !!referrer?.id;

  useEffect(() => {
    if (!open) return;
    setForm(isEdit
      ? { ...referrer }
      : { name: "", type: "doctor", phone: "", email: "", address: "", notes: "", is_active: true });
  }, [open, referrer?.id]);

  async function save() {
    if (!form.name?.trim()) return toast.error("Name required");
    setBusy(true);
    const payload = {
      name: form.name.trim(), type: form.type || "other", phone: form.phone || null,
      email: form.email || null, address: form.address || null, notes: form.notes || null,
      is_active: !!form.is_active,
    };
    const { error } = isEdit
      ? await supabase.from("referrers").update(payload).eq("id", referrer?.id ?? "")
      : await supabase.from("referrers").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit" : "Add"} Referrer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type || "doctor"} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REFERRER_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Address</Label><Textarea rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex items-center gap-2">
            <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>Active</Label>
          </div>
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
