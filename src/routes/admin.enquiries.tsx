import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Mail, Trash2, Check, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/enquiries")({
  head: () => ({ meta: [{ title: "Enquiries — Admin" }] }),
  component: () => <AdminShell title="Enquiries"><Enquiries /></AdminShell>,
});

function Enquiries() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "new" | "resolved">("new");
  const [draftRemarks, setDraftRemarks] = useState<Record<string, string>>({});

  const { data: items = [] } = useQuery({
    queryKey: ["admin-enquiries"],
    queryFn: async () => (await supabase.from("enquiries").select("*").order("created_at", { ascending: false })).data || [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-enquiries"] });

  const counts = {
    all: items.length,
    new: items.filter((e: any) => e.status === "new").length,
    resolved: items.filter((e: any) => e.status === "resolved").length,
  };

  const filtered = items.filter((e: any) =>
    tab === "all" ? true : tab === "new" ? e.status === "new" : e.status === "resolved"
  );

  async function resolve(e: any) {
    const remarks = (draftRemarks[e.id] ?? e.remarks ?? "").trim();
    if (remarks.length < 3) return toast.error("Please add remarks before resolving (min 3 chars)");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("enquiries")
      .update({ status: "resolved", remarks, resolved_at: new Date().toISOString(), resolved_by: user?.id ?? null })
      .eq("id", e.id);
    if (error) return toast.error(error.message);
    refresh();
  }
  async function saveRemarks(e: any) {
    const remarks = (draftRemarks[e.id] ?? "").trim();
    const { error } = await supabase.from("enquiries").update({ remarks }).eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Remarks saved");
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this enquiry?")) return;
    const { error } = await supabase.from("enquiries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  function exportCsv() {
    const cols = ["created_at", "name", "phone", "email", "status", "message", "remarks", "resolved_at"];
    const head = cols.join(",");
    const rows = filtered.map((e: any) =>
      cols.map((c) => `"${String(e[c] ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`).join(",")
    );
    const blob = new Blob([head + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enquiries-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="new">New ({counts.new})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1 h-4 w-4" />Export CSV
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No enquiries here.</p>}
        {filtered.map((e: any) => (
          <Card key={e.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{e.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${e.status === "new" ? "bg-primary/10 text-primary" : "bg-emerald-100 text-emerald-700"}`}>{e.status}</span>
                    <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm">
                    <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Phone className="h-3 w-3" />{e.phone}</a>
                    {e.email && <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Mail className="h-3 w-3" />{e.email}</a>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{e.message}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <label className="text-xs font-medium text-muted-foreground">
                  Remarks {e.status === "new" && <span className="text-destructive">(required to resolve)</span>}
                </label>
                <Textarea
                  rows={2}
                  placeholder="Add internal notes — what was discussed, follow-up, outcome…"
                  defaultValue={e.remarks ?? ""}
                  onChange={(ev) => setDraftRemarks((d) => ({ ...d, [e.id]: ev.target.value }))}
                />
                {e.resolved_at && (
                  <p className="text-xs text-muted-foreground">Resolved on {new Date(e.resolved_at).toLocaleString()}</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => saveRemarks(e)}>Save remarks</Button>
                  {e.status === "new" && (
                    <Button size="sm" onClick={() => resolve(e)}><Check className="mr-1 h-3 w-3" />Resolve</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
