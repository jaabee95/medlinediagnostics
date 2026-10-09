import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, IndianRupee, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/permissions";
import { inr } from "@/lib/billing";
import { Card, CardContent } from "@/components/ui/card";

/** Dashboard billing summary — only renders for users with Billing view access. */
export function BillingSummary() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);
  const access = useAccess(uid);

  const { data } = useQuery({
    enabled: access.isLoaded && access.can("billing"),
    queryKey: ["billing-summary"],
    queryFn: async () => {
      const [inv, pay] = await Promise.all([
        supabase.from("invoices").select("id,total,status,created_at"),
        supabase.from("payments").select("invoice_id,amount,paid_at"),
      ]);
      const invoices = inv.data || [];
      const payments = pay.data || [];
      const today = new Date().toISOString().slice(0, 10);
      const invoicesToday = invoices.filter((i: any) => i.created_at.slice(0, 10) === today).length;
      const paidToday = payments
        .filter((p: any) => p.paid_at.slice(0, 10) === today)
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const paidMap = new Map<string, number>();
      for (const p of payments) paidMap.set(p.invoice_id, (paidMap.get(p.invoice_id) || 0) + Number(p.amount || 0));
      const outstanding = invoices
        .filter((i: any) => i.status === "issued")
        .reduce((s: number, i: any) => s + Math.max(0, Number(i.total || 0) - (paidMap.get(i.id) || 0)), 0);
      return { invoicesToday, paidToday, outstanding };
    },
  });

  if (!access.can("billing")) return null;

  const cards = [
    { label: "Invoices Today", value: data ? String(data.invoicesToday) : "—", icon: FileText },
    { label: "Collected Today", value: data ? inr(data.paidToday) : "—", icon: IndianRupee },
    { label: "Outstanding", value: data ? inr(data.outstanding) : "—", icon: Wallet },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <Link key={c.label} to="/admin/billing">
          <Card className="transition-shadow hover:shadow-elegant">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
                <div className="mt-1 text-3xl font-bold">{c.value}</div>
              </div>
              <c.icon className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
