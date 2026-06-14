import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical, Stethoscope, Images, Inbox, ArrowRight, Star, CheckCircle2, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Medline" }] }),
  component: () => <AdminShell title="Dashboard"><Dashboard /></AdminShell>,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const [tests, doctors, slides, allEnq, pendingReviews] = await Promise.all([
        supabase.from("tests").select("id", { count: "exact", head: true }),
        supabase.from("doctors").select("id", { count: "exact", head: true }),
        supabase.from("slides").select("id", { count: "exact", head: true }),
        supabase.from("enquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
      ]);
      const enq = allEnq.data || [];
      const newE = enq.filter((e: any) => e.status === "new");
      const resolved = enq.filter((e: any) => e.status === "resolved");

      // Last 14 days chart
      const days: { d: string; new: number; resolved: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const dt = new Date();
        dt.setDate(dt.getDate() - i);
        const key = dt.toISOString().slice(0, 10);
        days.push({
          d: dt.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          new: enq.filter((e: any) => e.created_at.slice(0, 10) === key).length,
          resolved: enq.filter((e: any) => e.resolved_at && e.resolved_at.slice(0, 10) === key).length,
        });
      }

      return {
        tests: tests.count || 0,
        doctors: doctors.count || 0,
        slides: slides.count || 0,
        totalEnq: enq.length,
        newEnq: newE.length,
        resolvedEnq: resolved.length,
        pendingReviews: pendingReviews.count || 0,
        recent: enq.slice(0, 5),
        days,
      };
    },
  });

  const cards = [
    { label: "Tests",           value: data?.tests ?? "—",          icon: FlaskConical, to: "/admin/services" },
    { label: "Doctors",         value: data?.doctors ?? "—",        icon: Stethoscope,  to: "/admin/doctors" },
    { label: "Slides",          value: data?.slides ?? "—",         icon: Images,       to: "/admin/slides" },
    { label: "Pending Reviews", value: data?.pendingReviews ?? "—", icon: Star,         to: "/admin/reviews" },
  ];
  const enqCards = [
    { label: "Total Enquiries",    value: data?.totalEnq ?? "—",    icon: Inbox,        tone: "text-foreground" },
    { label: "New Enquiries",      value: data?.newEnq ?? "—",      icon: Clock,        tone: "text-primary" },
    { label: "Resolved Enquiries", value: data?.resolvedEnq ?? "—", icon: CheckCircle2, tone: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
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

      <div className="grid gap-4 sm:grid-cols-3">
        {enqCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
                <div className={`mt-1 text-3xl font-bold ${c.tone}`}>{c.value}</div>
              </div>
              <c.icon className={`h-8 w-8 ${c.tone}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Enquiries — last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.days || []}>
                <XAxis dataKey="d" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="new" fill="hsl(var(--primary))" name="New" radius={[3, 3, 0, 0]} />
                <Bar dataKey="resolved" fill="#10b981" name="Resolved" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Enquiries</CardTitle>
          <Link to="/admin/enquiries" className="inline-flex items-center text-sm text-primary hover:underline">
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {(data?.recent || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No enquiries yet.</p>
          ) : (
            <ul className="divide-y">
              {data!.recent.map((e: any) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{e.name} · {e.phone}</div>
                    <div className="truncate text-muted-foreground">{e.message}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                    e.status === "new" ? "bg-primary/10 text-primary" : "bg-emerald-100 text-emerald-700"
                  }`}>{e.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
