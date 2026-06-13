import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/admin-helpers";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/services")({
  head: () => ({ meta: [{ title: "Services — Admin" }] }),
  component: () => <AdminShell title="Services & Tests"><Services /></AdminShell>,
});

function Services() {
  return (
    <Tabs defaultValue="main">
      <TabsList>
        <TabsTrigger value="main">Main Groups</TabsTrigger>
        <TabsTrigger value="sub">Sub Groups</TabsTrigger>
        <TabsTrigger value="tests">Tests</TabsTrigger>
        <TabsTrigger value="profiles">Profiles</TabsTrigger>
        <TabsTrigger value="packages">Packages</TabsTrigger>
      </TabsList>
      <TabsContent value="main"><MainGroups /></TabsContent>
      <TabsContent value="sub"><SubGroups /></TabsContent>
      <TabsContent value="tests"><Tests /></TabsContent>
      <TabsContent value="profiles"><TestProfiles /></TabsContent>
      <TabsContent value="packages"><Packages /></TabsContent>
    </Tabs>
  );
}

function useTable(name: string, key: string, order = "sort_order") {
  const qc = useQueryClient();
  const q = useQuery<any[]>({ queryKey: [key], queryFn: async () => ((await (supabase.from(name as any) as any).select("*").order(order)).data as any[]) || [] });
  return { ...q, data: (q.data ?? []) as any[], refresh: () => qc.invalidateQueries({ queryKey: [key] }) };
}

function ItemRow({ title, sub, onEdit, onDelete, active }: any) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{title} {active === false && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">Inactive</span>}</div>
          {sub && <div className="truncate text-sm text-muted-foreground">{sub}</div>}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MainGroups() {
  const { data: items = [], refresh } = useTable("main_groups", "mg");
  const [edit, setEdit] = useState<any | null>(null);
  return (
    <Section onAdd={() => setEdit({})}>
      {items.map((it) => (
        <ItemRow key={it.id} title={it.name} sub={it.description} active={it.is_active}
          onEdit={() => setEdit(it)}
          onDelete={async () => { if (!confirm("Delete?")) return; const { error } = await supabase.from("main_groups").delete().eq("id", it.id); error ? toast.error(error.message) : refresh(); }}
        />
      ))}
      <SimpleDialog open={edit !== null} onClose={() => setEdit(null)} title="Main Group" item={edit}
        fields={[{ k: "name", label: "Name" }, { k: "slug", label: "Slug", auto: "name" }, { k: "description", label: "Description", type: "textarea" }, { k: "icon", label: "Icon" }]}
        table="main_groups" onSaved={() => { setEdit(null); refresh(); }} />
    </Section>
  );
}

function SubGroups() {
  const { data: items = [], refresh } = useTable("sub_groups", "sg");
  const { data: mains = [] } = useTable("main_groups", "mg-for-sg");
  const [edit, setEdit] = useState<any | null>(null);
  return (
    <Section onAdd={() => setEdit({})}>
      {items.map((it) => (
        <ItemRow key={it.id} title={it.name} sub={mains.find((m: any) => m.id === it.main_group_id)?.name} active={it.is_active}
          onEdit={() => setEdit(it)}
          onDelete={async () => { if (!confirm("Delete?")) return; const { error } = await supabase.from("sub_groups").delete().eq("id", it.id); error ? toast.error(error.message) : refresh(); }}
        />
      ))}
      <SimpleDialog open={edit !== null} onClose={() => setEdit(null)} title="Sub Group" item={edit}
        fields={[
          { k: "main_group_id", label: "Main Group", type: "select", options: mains.map((m: any) => ({ value: m.id, label: m.name })) },
          { k: "name", label: "Name" }, { k: "slug", label: "Slug", auto: "name" },
          { k: "description", label: "Description", type: "textarea" },
        ]}
        table="sub_groups" onSaved={() => { setEdit(null); refresh(); }} />
    </Section>
  );
}

function Tests() {
  const { data: items = [], refresh } = useTable("tests", "t");
  const { data: subs = [] } = useTable("sub_groups", "sg-for-t");
  const [edit, setEdit] = useState<any | null>(null);
  return (
    <Section onAdd={() => setEdit({})}>
      {items.map((it) => (
        <ItemRow key={it.id} title={it.name} sub={`${subs.find((s: any) => s.id === it.sub_group_id)?.name || ""} · TAT: ${it.tat || "—"} · ₹${it.price ?? "—"}`} active={it.is_active}
          onEdit={() => setEdit(it)}
          onDelete={async () => { if (!confirm("Delete?")) return; const { error } = await supabase.from("tests").delete().eq("id", it.id); error ? toast.error(error.message) : refresh(); }}
        />
      ))}
      <SimpleDialog open={edit !== null} onClose={() => setEdit(null)} title="Test" item={edit}
        fields={[
          { k: "sub_group_id", label: "Sub Group", type: "select", options: subs.map((s: any) => ({ value: s.id, label: s.name })) },
          { k: "name", label: "Name" }, { k: "code", label: "Code" },
          { k: "description", label: "Description", type: "textarea" },
          { k: "sample_required", label: "Sample Required" },
          { k: "tat", label: "TAT (e.g. Same day)" },
          { k: "reference_range", label: "Reference Range" },
          { k: "price", label: "Price (₹)", type: "number" },
        ]}
        table="tests" onSaved={() => { setEdit(null); refresh(); }} />
    </Section>
  );
}

function TestProfiles() {
  const { data: items = [], refresh } = useTable("test_profiles", "tp");
  const { data: tests = [] } = useTable("tests", "t-for-tp");
  const [edit, setEdit] = useState<any | null>(null);
  const [items_, setItems_] = useState<string[]>([]);

  async function openEdit(it: any) {
    setEdit(it);
    if (it?.id) {
      const { data } = await supabase.from("test_profile_items").select("test_id").eq("profile_id", it.id);
      setItems_((data || []).map((x: any) => x.test_id));
    } else setItems_([]);
  }

  async function save(payload: any, id?: string) {
    let pid = id;
    if (pid) await supabase.from("test_profiles").update(payload).eq("id", pid);
    else { const { data, error } = await supabase.from("test_profiles").insert(payload).select("id").single(); if (error) throw error; pid = data.id; }
    await supabase.from("test_profile_items").delete().eq("profile_id", pid!);
    if (items_.length) await supabase.from("test_profile_items").insert(items_.map((tid) => ({ profile_id: pid!, test_id: tid })));
  }

  return (
    <Section onAdd={() => openEdit({})}>
      {items.map((it) => (
        <ItemRow key={it.id} title={it.name} sub={`₹${it.price ?? "—"}`} active={it.is_active}
          onEdit={() => openEdit(it)}
          onDelete={async () => { if (!confirm("Delete?")) return; await supabase.from("test_profiles").delete().eq("id", it.id); refresh(); }}
        />
      ))}
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit" : "Add"} Profile</DialogTitle></DialogHeader>
          {edit && <ProfileForm item={edit} tests={tests} selected={items_} setSelected={setItems_}
            onSave={async (p) => { try { await save(p, edit.id); toast.success("Saved"); setEdit(null); refresh(); } catch (e: any) { toast.error(e.message); } }} />}
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function ProfileForm({ item, tests, selected, setSelected, onSave }: any) {
  const [f, setF] = useState({ name: item.name || "", description: item.description || "", price: item.price ?? "", is_active: item.is_active ?? true, sort_order: item.sort_order ?? 10 });
  return (
    <div className="space-y-3">
      <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Price (₹)</Label><Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
      <div className="space-y-1.5">
        <Label>Included Tests</Label>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-2">
          {tests.map((t: any) => (
            <label key={t.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.includes(t.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, t.id] : selected.filter((x: string) => x !== t.id))} />
              {t.name}
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /><Label>Active</Label></div>
      <Button className="w-full" onClick={() => onSave({ name: f.name, description: f.description || null, price: f.price === "" ? null : Number(f.price), is_active: f.is_active, sort_order: f.sort_order })}>Save</Button>
    </div>
  );
}

function Packages() {
  const { data: items = [], refresh } = useTable("packages", "pk");
  const [edit, setEdit] = useState<any | null>(null);
  return (
    <Section onAdd={() => setEdit({})}>
      {items.map((it) => (
        <ItemRow key={it.id} title={it.name} sub={`₹${it.price ?? "—"}`} active={it.is_visible}
          onEdit={() => setEdit(it)}
          onDelete={async () => { if (!confirm("Delete?")) return; await supabase.from("packages").delete().eq("id", it.id); refresh(); }}
        />
      ))}
      <SimpleDialog open={edit !== null} onClose={() => setEdit(null)} title="Package" item={edit} activeKey="is_visible"
        fields={[
          { k: "name", label: "Name" },
          { k: "description", label: "Description", type: "textarea" },
          { k: "price", label: "Price (₹)", type: "number" },
        ]}
        table="packages" onSaved={() => { setEdit(null); refresh(); }} />
    </Section>
  );
}

function Section({ children, onAdd }: { children: React.ReactNode; onAdd: () => void }) {
  return (
    <div className="space-y-3 pt-4">
      <div className="flex justify-end"><Button onClick={onAdd}><Plus className="mr-1 h-4 w-4" /> Add</Button></div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function SimpleDialog({ open, onClose, title, item, fields, table, onSaved, activeKey = "is_active" }: any) {
  const [f, setF] = useState<any>({});
  const isEdit = item && item.id;

  function init() {
    const base: any = { sort_order: 10, [activeKey]: true };
    fields.forEach((fd: any) => (base[fd.k] = ""));
    setF(isEdit ? { ...base, ...item } : base);
  }

  async function save() {
    const payload: any = { [activeKey]: f[activeKey] ?? true, sort_order: f.sort_order ?? 10 };
    for (const fd of fields) {
      let v = f[fd.k];
      if (fd.type === "number") v = v === "" || v == null ? null : Number(v);
      else if (typeof v === "string" && v.trim() === "") v = fd.k === "name" || fd.k === "slug" || fd.k.endsWith("_id") ? v : null;
      payload[fd.k] = v;
    }
    if (fields.some((x: any) => x.k === "slug") && !payload.slug && payload.name) payload.slug = slugify(payload.name);
    const { error } = isEdit
      ? await supabase.from(table).update(payload).eq("id", item.id)
      : await supabase.from(table).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else init(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Edit" : "Add"} {title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {fields.map((fd: any) => (
            <div key={fd.k} className="space-y-1.5">
              <Label>{fd.label}</Label>
              {fd.type === "textarea" ? (
                <Textarea rows={2} value={f[fd.k] ?? ""} onChange={(e) => setF({ ...f, [fd.k]: e.target.value })} />
              ) : fd.type === "select" ? (
                <Select value={f[fd.k] ?? ""} onValueChange={(v) => setF({ ...f, [fd.k]: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {fd.options.map((o: any) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input type={fd.type || "text"} value={f[fd.k] ?? ""} onChange={(e) => {
                  const next = { ...f, [fd.k]: e.target.value };
                  if (fd.auto && f[fd.k] === slugify(f[fd.auto] || "")) next[fd.k] = e.target.value;
                  setF(next);
                }} onBlur={() => { if (fd.k === "slug" && !f.slug && f.name) setF({ ...f, slug: slugify(f.name) }); }} />
              )}
            </div>
          ))}
          <div className="flex items-center gap-2"><Switch checked={!!f[activeKey]} onCheckedChange={(v) => setF({ ...f, [activeKey]: v })} /><Label>{activeKey === "is_visible" ? "Visible" : "Active"}</Label></div>
          <Button className="w-full" onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
