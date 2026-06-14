import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadPublicMedia } from "@/lib/admin-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/slides")({
  head: () => ({ meta: [{ title: "Homepage Slider — Admin" }] }),
  component: () => <AdminShell title="Homepage Slider"><Slides /></AdminShell>,
});

function Slides() {
  const qc = useQueryClient();
  const { data: slides = [] } = useQuery({
    queryKey: ["admin-slides"],
    queryFn: async () => (await supabase.from("slides").select("*").order("sort_order")).data || [],
  });
  const [editing, setEditing] = useState<any | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-slides"] });

  async function move(s: any, dir: -1 | 1) {
    const idx = slides.findIndex((x) => x.id === s.id);
    const swap = slides[idx + dir]; if (!swap) return;
    await supabase.from("slides").update({ sort_order: swap.sort_order }).eq("id", s.id);
    await supabase.from("slides").update({ sort_order: s.sort_order }).eq("id", swap.id);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this slide?")) return;
    const { error } = await supabase.from("slides").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function toggle(s: any) {
    await supabase.from("slides").update({ is_active: !s.is_active }).eq("id", s.id);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">Up to 5 active slides shown on the homepage.</p>
        <Button onClick={() => setEditing({})}><Plus className="mr-1 h-4 w-4" /> Add Slide</Button>
      </div>

      <div className="grid gap-3">
        {slides.map((s, i) => (
          <Card key={s.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <img src={s.image_url} alt="" className="h-16 w-28 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{s.heading || <span className="text-muted-foreground">(no heading)</span>}</div>
                <div className="truncate text-sm text-muted-foreground">{s.subtext}</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={s.is_active} onCheckedChange={() => toggle(s)} />
                <Button size="icon" variant="ghost" onClick={() => move(s, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(s, 1)} disabled={i === slides.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {slides.length === 0 && <p className="text-sm text-muted-foreground">No slides yet.</p>}
      </div>

      <SlideDialog
        open={editing !== null}
        slide={editing}
        nextOrder={(slides.at(-1)?.sort_order ?? 0) + 10}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); refresh(); }}
      />
    </div>
  );
}

function SlideDialog({ open, slide, nextOrder, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const isEdit = slide && slide.id;

  useEffect(() => {
    if (!open) return;
    setForm(isEdit ? { ...slide } : { heading: "", subtext: "", link_url: "", image_url: "", is_active: true, sort_order: nextOrder });
  }, [open, slide?.id]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    try { const url = await uploadPublicMedia(f, "slides"); setForm((p: any) => ({ ...p, image_url: url })); }
    catch (err: any) { toast.error(err.message); }
  }

  async function save() {
    if (!form.image_url) return toast.error("Upload an image");
    setBusy(true);
    const payload = { heading: form.heading, subtext: form.subtext, link_url: form.link_url || null, image_url: form.image_url, is_active: form.is_active, sort_order: form.sort_order };
    const { error } = isEdit
      ? await supabase.from("slides").update(payload).eq("id", slide.id)
      : await supabase.from("slides").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Slide saved");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Edit" : "Add"} Slide</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {form.image_url && <img src={form.image_url} alt="" className="h-32 w-full rounded object-cover" />}
          <Input type="file" accept="image/*" onChange={upload} />
          <div className="space-y-1.5"><Label>Heading</Label><Input value={form.heading ?? ""} onChange={(e) => setForm({ ...form, heading: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Subtext</Label><Textarea rows={2} value={form.subtext ?? ""} onChange={(e) => setForm({ ...form, subtext: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Link URL (optional)</Label><Input value={form.link_url ?? ""} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
