import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/permissions";
import { inr, payStatus, PAY_STATUS_LABEL, type Invoice } from "@/lib/billing";

export const Route = createFileRoute("/admin/billing/")({
  head: () => ({ meta: [{ title: "Invoices — Medline Diagnostics Admin" }, { name: "description", content: "Invoices — Medline Diagnostics Admin. Private staff workspace." }, { property: "og:title", content: "Invoices — Medline Diagnostics Admin" }, { property: "og:description", content: "Invoices — Medline Diagnostics Admin. Private staff workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: InvoiceList,
});

type Row = Invoice & { patient: { name: string; phone: string | null } | null; referrer: { name: string } | null };

function InvoiceList() {
  const [tab, setTab] = useState<string>("all");
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  const access = useAccess(uid);

  const { data } = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: async () => {
      const [inv, pay] = await Promise.all([
        supabase
          .from("invoices")
          .select("*, patient:patients(name,phone), referrer:referrers(name)")
          .order("created_at", { ascending: false }),
        supabase.from("payments").select("invoice_id,amount"),
      ]);
      if (inv.error) throw inv.error;
      if (pay.error) throw pay.error;
      return { invoices: (inv.data || []) as Row[], payments: pay.data || [] };
    },
  });

  const invoices = data?.invoices || [];
  const payments = data?.payments || [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return invoices.filter((i) => {
      const day = i.created_at.slice(0, 10);
      if ((fromDate && day < fromDate) || (toDate && day > toDate)) return false;
      if (tab !== "all") {
        const st = payStatus(i, payments);
        if (st !== tab) return false;
      }
      if (!term) return true;
      const blob = `${i.invoice_no} ${i.patient?.name || ""} ${i.patient?.phone || ""} ${i.referrer?.name || ""}`.toLowerCase();
      return blob.includes(term);
    });
  }, [invoices, payments, tab, q, fromDate, toDate]);

  const statusBadge = (st: string) => {
    switch (st) {
      case "paid": return "bg-success/10 text-success";
      case "partial": return "bg-accent text-accent-foreground";
      case "cancelled": return "bg-destructive/10 text-destructive";
      default: return "bg-primary/10 text-primary";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v)}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
            <TabsTrigger value="partial">Partial</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
        {access.can("billing", "edit") && <Button asChild>
          <Link to="/admin/billing/$id" params={{ id: "new" }}><Plus className="mr-1 h-4 w-4" /> New Invoice</Link>
        </Button>}
      </div>

      <div className="flex max-w-md items-center gap-2 rounded-full border border-border bg-background px-4 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search invoice no, patient, phone, referrer…"
          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="space-y-1 text-xs">From date<Input aria-label="From date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
        <label className="space-y-1 text-xs">To date<Input aria-label="To date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <ReceiptText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No invoices found. Create the first one.</p>
            </CardContent>
          </Card>
        )}
        {filtered.map((i) => {
          const st = payStatus(i, payments);
          const paid = payments.filter((p: any) => p.invoice_id === i.id).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
          const balance = Math.max(0, Number(i.total) - paid);
          return (
            <Link key={i.id} to="/admin/billing/$id" params={{ id: i.id }} className="block">
              <Card className="transition-shadow hover:shadow-elegant">
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{i.invoice_no}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge(st)}`}>{PAY_STATUS_LABEL[st]}</span>
                    </div>
                    <div className="mt-0.5 text-sm">
                      {i.patient?.name || "—"} {i.patient?.phone ? `· ${i.patient.phone}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(i.created_at).toLocaleDateString()} · Referrer: {i.referrer?.name || "Walk-in"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{inr(i.total)}</div>
                    <div className="text-xs text-muted-foreground">Paid {inr(paid)} · Balance {inr(balance)}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
