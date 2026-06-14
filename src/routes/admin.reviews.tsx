import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Star, Trash2, CheckCircle2, XCircle, Pin, PinOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "Reviews — Admin" }] }),
  component: () => <AdminShell title="Reviews"><Reviews /></AdminShell>,
});

function Reviews() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "approved" | "all">("pending");

  const { data: items = [] } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => (await supabase.from("reviews").select("*").order("created_at", { ascending: false })).data || [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  const filtered = items.filter((r: any) =>
    tab === "all" ? true : tab === "pending" ? !r.is_approved : r.is_approved
  );

  async function update(id: string, patch: any) {
    const { error } = await supabase.from("reviews").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({items.filter((r: any) => !r.is_approved).length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({items.filter((r: any) => r.is_approved).length})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-3">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No reviews here yet.</p>}
        {filtered.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
              {r.photo_url && (
                <img src={r.photo_url} alt={r.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.name}</span>
                  <span className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  {r.is_approved && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Approved</span>}
                  {r.is_featured && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Featured</span>}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{r.message}</p>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                {!r.is_approved ? (
                  <Button size="sm" onClick={() => update(r.id, { is_approved: true })}>
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />Approve
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => update(r.id, { is_approved: false, is_featured: false })}>
                    <XCircle className="mr-1 h-3.5 w-3.5" />Unapprove
                  </Button>
                )}
                {r.is_approved && (
                  <Button size="sm" variant={r.is_featured ? "secondary" : "outline"} onClick={() => update(r.id, { is_featured: !r.is_featured })}>
                    {r.is_featured ? <><PinOff className="mr-1 h-3.5 w-3.5" />Unfeature</> : <><Pin className="mr-1 h-3.5 w-3.5" />Feature on home</>}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
