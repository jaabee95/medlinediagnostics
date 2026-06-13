import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadPublicMedia } from "@/lib/admin-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/doctors")({
  head: () => ({ meta: [{ title: "Doctors — Admin" }] }),
  component: () => <AdminShell title="Doctors"><Doctors /></AdminShell>,
});

function Doctors() {
  const qc = useQueryClient();
  const { data: doctors = [] } = useQuery({
    queryKey: ["admin-doctors"],
    queryFn: async () => (await supabase.from("doctors").select("*").order("sort_order")).data || [],
  });
  const [editing, setEditing] = useState<any | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-doctors"] });

  async function remove(id: string) {
    if (!confirm("Delete this doctor?")) return;
    const { error } = await supabase.from("doctors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> Add Doctor</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {doctors.map((d) => (
          <Card key={d.id}>
            <CardContent className="flex gap-4 p-4">
              {d.photo_url ? (
                <img src={d.photo_url} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted"><Stethoscope className="h-8 w-8 text-muted-foreground" /></div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{d.name}</div>
                <div className="text-sm text-muted-foreground">{d.specialization}</div>
                <div className="text-xs text-muted-foreground">{d.qualification}</div>
                <div className="mt-2 flex gap-2 text-xs">
                  {d.show_on_home && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">Home</span>}
                  {!d.is_active && <span className="rounded-full bg-muted px-2 py-0.5">Inactive</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" onClick={() => setEditing(d)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {doctors.length === 0 && <p className="text-sm text-muted-foreground">No doctors yet.</p>}
      </div>

      <DoctorDialog
        open={editing !== null}
        doctor={editing}
        nextOrder={(doctors.at(-1)?.sort_order ?? 0) + 10}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); refresh(); }}
      />
    </div>
  );
}

function DoctorDialog({ open, doctor, nextOrder, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const isEdit = doctor && doctor.id;

  function init() {
    setForm(isEdit ? { ...doctor } : { name: "", reg_no: "", qualification: "", specialization: "", photo_url: "", description: "", show_on_home: false, is_active: true, sort_order: nextOrder });
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    try { const url = await uploadPublicMedia(f, "doctors"); setForm((p: any) => ({ ...p, photo_url: url })); }
    catch (err: any) { toast.error(err.message); }
  }

  async function save() {
    if (!form.name) return toast.error("Name required");
    setBusy(true);
    const payload = { name: form.name, reg_no: form.reg_no || null, qualification: form.qualification || null, specialization: form.specialization || null, photo_url: form.photo_url || null, description: form.description || null, show_on_home: !!form.show_on_home, is_active: !!form.is_active, sort_order: form.sort_order };
    const { error } = isEdit
      ? await supabase.from("doctors").update(payload).eq("id", doctor.id)
      : await supabase.from("doctors").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else init(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Edit" : "Add"} Doctor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {form.photo_url && <img src={form.photo_url} alt="" className="h-24 w-24 rounded-full object-cover" />}
          <Input type="file" accept="image/*" onChange={upload} />
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Qualification</Label><Input value={form.qualification ?? ""} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Reg No.</Label><Input value={form.reg_no ?? ""} onChange={(e) => setForm({ ...form, reg_no: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Specialization</Label><Input value={form.specialization ?? ""} onChange={(e) => setForm({ ...form, specialization: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Switch checked={!!form.show_on_home} onCheckedChange={(v) => setForm({ ...form, show_on_home: v })} /><Label>Show on homepage</Label></div>
            <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
