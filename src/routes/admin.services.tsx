import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { Plus, Pencil, Trash2, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { buildTemplateWorkbook, downloadWorkbook, parseImportFile, validateRows, type ValidatedRow } from "@/lib/tests-excel";

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
  const { data: mains = [] } = useTable("main_groups", "mg-for-t");
  const [edit, setEdit] = useState<any | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [q, setQ] = useState("");

  function exportAll() {
    const wb = buildTemplateWorkbook({ tests: items, mains, subs });
    downloadWorkbook(wb, `tests-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
  function downloadTemplate() {
    const wb = buildTemplateWorkbook({ tests: items.slice(0, 3), mains, subs });
    downloadWorkbook(wb, `tests-template.xlsx`);
  }

  const filtered = q.trim()
    ? items.filter((t) => `${t.name} ${t.code ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    : items;

  return (
    <div className="space-y-3 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder="Search tests…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}><FileSpreadsheet className="mr-1 h-4 w-4" />Template</Button>
          <Button variant="outline" size="sm" onClick={exportAll}><Download className="mr-1 h-4 w-4" />Export</Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="mr-1 h-4 w-4" />Import</Button>
          <Button size="sm" onClick={() => setEdit({})}><Plus className="mr-1 h-4 w-4" />Add Test</Button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{filtered.length} of {items.length} tests</div>
      <div className="grid gap-2">
        {filtered.map((it: any) => (
          <ItemRow key={it.id} title={`${it.name}${it.code ? ` (${it.code})` : ""}`} sub={`${subs.find((s: any) => s.id === it.sub_group_id)?.name || ""} · TAT: ${it.tat || "—"} · ₹${it.price ?? "—"}`} active={it.is_active}
            onEdit={() => setEdit(it)}
            onDelete={async () => { if (!confirm("Delete?")) return; const { error } = await supabase.from("tests").delete().eq("id", it.id); error ? toast.error(error.message) : refresh(); }}
          />
        ))}
      </div>
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
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onDone={refresh} mains={mains} subs={subs} tests={items} />
    </div>
  );
}

function ImportDialog({ open, onClose, onDone, mains, subs, tests }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => { if (!open) { setFile(null); setRows([]); } }, [open]);

  async function onPick(f: File | null) {
    setFile(f);
    setRows([]);
    if (!f) return;
    setParsing(true);
    try {
      const raw = await parseImportFile(f);
      const validated = validateRows(raw, {
        mains: mains.map((m: any) => ({ id: m.id, name: m.name })),
        subs: subs.map((s: any) => ({ id: s.id, name: s.name, main_group_id: s.main_group_id })),
        existingTests: tests.map((t: any) => ({ id: t.id, code: t.code })),
      });
      setRows(validated);
    } catch (e: any) { toast.error(e.message); }
    finally { setParsing(false); }
  }

  const counts = {
    new: rows.filter((r) => r.status === "new").length,
    update: rows.filter((r) => r.status === "update").length,
    error: rows.filter((r) => r.status === "error").length,
  };

  async function runImport() {
    const valid = rows.filter((r) => r.status !== "error" && r.parsed);
    if (!valid.length) return toast.error("Nothing to import");
    setImporting(true);
    let inserted = 0, updated = 0, failed = 0;
    for (const r of valid) {
      const p = r.parsed!;
      const payload = {
        code: p.code, name: p.name, sub_group_id: p.sub_group_id,
        description: p.description, sample_required: p.sample_required,
        tat: p.tat, reference_range: p.reference_range,
        price: p.price, sort_order: p.sort_order, is_active: p.is_active,
      };
      if (r.status === "update" && p.id) {
        const { error } = await supabase.from("tests").update(payload).eq("id", p.id);
        if (error) failed++; else updated++;
      } else {
        const { error } = await supabase.from("tests").insert(payload);
        if (error) failed++; else inserted++;
      }
    }
    setImporting(false);
    toast.success(`Imported: ${inserted} new, ${updated} updated${failed ? `, ${failed} failed` : ""}`);
    onDone();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Import tests from Excel</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload an .xlsx file with columns: code, name, main_group, sub_group, description, sample_required, tat, reference_range, price, sort_order, is_active.
            Rows matching an existing <strong>code</strong> will be updated; new codes inserted.
          </p>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground hover:border-primary/40">
            <Upload className="h-4 w-4" />
            {file ? file.name : "Choose .xlsx file"}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => onPick(e.target.files?.[0] || null)} />
          </label>

          {parsing && <p className="text-sm">Parsing…</p>}

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">✅ {counts.new} new</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">✏️ {counts.update} update</span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">❌ {counts.error} errors</span>
              </div>

              <div className="max-h-72 overflow-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Code</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Sub Group</th>
                      <th className="p-2 text-left">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.index} className={r.status === "error" ? "bg-red-50" : ""}>
                        <td className="p-2">{r.index + 2}</td>
                        <td className="p-2">{r.status === "new" ? "✅ new" : r.status === "update" ? "✏️ update" : "❌ error"}</td>
                        <td className="p-2">{r.raw.code}</td>
                        <td className="p-2">{r.raw.name}</td>
                        <td className="p-2">{r.raw.sub_group}</td>
                        <td className="p-2 text-red-700">{r.errors.join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}><X className="mr-1 h-4 w-4" />Cancel</Button>
                <Button onClick={runImport} disabled={importing || counts.new + counts.update === 0}>
                  {importing ? "Importing…" : `Import ${counts.new + counts.update} row(s)`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
            onSave={async (p: any) => { try { await save(p, edit.id); toast.success("Saved"); setEdit(null); refresh(); } catch (e: any) { toast.error(e.message); } }} />}
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function ProfileForm({ item, tests, selected, setSelected, onSave }: any) {
  const [f, setF] = useState({ name: item.name || "", description: item.description || "", price: item.price ?? "", is_active: item.is_active ?? true, sort_order: item.sort_order ?? 10 });
  const [q, setQ] = useState("");
  const filtered = q ? tests.filter((t: any) => t.name.toLowerCase().includes(q.toLowerCase())) : tests;
  return (
    <div className="space-y-3">
      <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Price (₹)</Label><Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
      <div className="space-y-1.5">
        <Label>Included Tests ({selected.length} selected)</Label>
        <Input placeholder="Search tests…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-48 space-y-1 overflow-y-auto rounded border p-2">
          {filtered.map((t: any) => (
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
  const { data: tests = [] } = useTable("tests", "t-for-pk");
  const { data: profiles = [] } = useTable("test_profiles", "tp-for-pk");
  const [edit, setEdit] = useState<any | null>(null);
  const [pkgItems, setPkgItems] = useState<{ item_type: "test" | "profile"; item_id: string }[]>([]);

  async function openEdit(it: any) {
    setEdit(it);
    if (it?.id) {
      const { data } = await supabase.from("package_items").select("item_type,item_id").eq("package_id", it.id);
      setPkgItems((data || []) as any);
    } else setPkgItems([]);
  }

  async function save(payload: any, id?: string) {
    let pid = id;
    if (pid) await supabase.from("packages").update(payload).eq("id", pid);
    else { const { data, error } = await supabase.from("packages").insert(payload).select("id").single(); if (error) throw error; pid = data.id; }
    await supabase.from("package_items").delete().eq("package_id", pid!);
    if (pkgItems.length) {
      await supabase.from("package_items").insert(pkgItems.map((x) => ({ package_id: pid!, item_type: x.item_type, item_id: x.item_id })));
    }
  }

  return (
    <Section onAdd={() => openEdit({})}>
      {items.map((it) => (
        <ItemRow key={it.id} title={it.name} sub={`₹${it.price ?? "—"}`} active={it.is_visible}
          onEdit={() => openEdit(it)}
          onDelete={async () => { if (!confirm("Delete?")) return; await supabase.from("packages").delete().eq("id", it.id); refresh(); }}
        />
      ))}
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit" : "Add"} Package</DialogTitle></DialogHeader>
          {edit && <PackageForm
            item={edit}
            tests={tests}
            profiles={profiles}
            pkgItems={pkgItems}
            setPkgItems={setPkgItems}
            onSave={async (p: any) => { try { await save(p, edit.id); toast.success("Saved"); setEdit(null); refresh(); } catch (e: any) { toast.error(e.message); } }}
          />}
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function PackageForm({ item, tests, profiles, pkgItems, setPkgItems, onSave }: any) {
  const [f, setF] = useState({
    name: item.name || "",
    description: item.description || "",
    price: item.price ?? "",
    is_visible: item.is_visible ?? true,
    sort_order: item.sort_order ?? 10,
  });
  const [addType, setAddType] = useState<"test" | "profile">("profile");
  const [addId, setAddId] = useState("");
  const [q, setQ] = useState("");

  const source = addType === "test" ? tests : profiles;
  const filtered = q ? source.filter((x: any) => x.name.toLowerCase().includes(q.toLowerCase())) : source;
  const idLabel = (x: { item_type: string; item_id: string }) => {
    const list = x.item_type === "test" ? tests : profiles;
    return list.find((y: any) => y.id === x.item_id)?.name || "(missing)";
  };

  function addItem() {
    if (!addId) return;
    if (pkgItems.some((x: any) => x.item_id === addId && x.item_type === addType)) return;
    setPkgItems([...pkgItems, { item_type: addType, item_id: addId }]);
    setAddId("");
    setQ("");
  }
  function removeItem(i: number) {
    setPkgItems(pkgItems.filter((_: any, idx: number) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5"><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Price (₹)</Label><Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>

      <div className="space-y-1.5">
        <Label>Included items ({pkgItems.length})</Label>
        <div className="space-y-1 rounded border p-2">
          {pkgItems.length === 0 && <p className="text-xs text-muted-foreground">No items added yet.</p>}
          {pkgItems.map((x: any, i: number) => (
            <div key={`${x.item_type}-${x.item_id}`} className="flex items-center justify-between rounded bg-muted/30 px-2 py-1 text-sm">
              <span>
                <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] uppercase ${x.item_type === "profile" ? "bg-primary/10 text-primary" : "bg-muted"}`}>{x.item_type}</span>
                {idLabel(x)}
              </span>
              <Button size="icon" variant="ghost" onClick={() => removeItem(i)}><X className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={addType} onValueChange={(v) => { setAddType(v as any); setAddId(""); }}>
            <SelectTrigger className="sm:w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="profile">Profile</SelectItem>
              <SelectItem value="test">Test</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder={`Search ${addType}s…`} value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
        </div>
        {q && (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded border p-2">
            {filtered.map((x: any) => (
              <button
                type="button"
                key={x.id}
                onClick={() => { setAddId(x.id); setPkgItems([...pkgItems, { item_type: addType, item_id: x.id }]); setQ(""); }}
                className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
              >
                {x.name} {x.price != null && <span className="text-xs text-muted-foreground">₹{x.price}</span>}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground">No matches.</p>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2"><Switch checked={f.is_visible} onCheckedChange={(v) => setF({ ...f, is_visible: v })} /><Label>Visible on website</Label></div>
      <Button className="w-full" onClick={() => onSave({ name: f.name, description: f.description || null, price: f.price === "" ? null : Number(f.price), is_visible: f.is_visible, sort_order: f.sort_order })}>Save</Button>
    </div>
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

  useEffect(() => {
    if (!open) return;
    const base: any = { sort_order: 10, [activeKey]: true };
    fields.forEach((fd: any) => (base[fd.k] = ""));
    setF(isEdit ? { ...base, ...item } : base);
  }, [open, item?.id]);

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
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
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
