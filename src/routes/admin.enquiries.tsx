import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Mail, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/enquiries")({
  head: () => ({ meta: [{ title: "Enquiries — Admin" }] }),
  component: () => <AdminShell title="Enquiries"><Enquiries /></AdminShell>,
});

function Enquiries() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["admin-enquiries"],
    queryFn: async () => (await supabase.from("enquiries").select("*").order("created_at", { ascending: false })).data || [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-enquiries"] });

  async function mark(id: string, status: string) {
    await supabase.from("enquiries").update({ status }).eq("id", id);
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this enquiry?")) return;
    const { error } = await supabase.from("enquiries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-sm text-muted-foreground">No enquiries yet.</p>}
      {items.map((e) => (
        <Card key={e.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{e.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${e.status === "new" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{e.status}</span>
                <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-sm">
                <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Phone className="h-3 w-3" />{e.phone}</a>
                {e.email && <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Mail className="h-3 w-3" />{e.email}</a>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{e.message}</p>
            </div>
            <div className="flex gap-2">
              {e.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => mark(e.id, "resolved")}><Check className="mr-1 h-3 w-3" />Resolve</Button>}
              <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
