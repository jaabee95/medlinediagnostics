import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical, Stethoscope, Images, Inbox, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Medline" }] }),
  component: () => <AdminShell title="Dashboard"><Dashboard /></AdminShell>,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const [tests, doctors, slides, enq] = await Promise.all([
        supabase.from("tests").select("id", { count: "exact", head: true }),
        supabase.from("doctors").select("id", { count: "exact", head: true }),
        supabase.from("slides").select("id", { count: "exact", head: true }),
        supabase.from("enquiries").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      return {
        tests: tests.count || 0,
        doctors: doctors.count || 0,
        slides: slides.count || 0,
        newEnquiries: (enq.data || []).filter((e) => e.status === "new").length,
        recent: enq.data || [],
      };
    },
  });

  const cards = [
    { label: "Tests", value: data?.tests ?? "—", icon: FlaskConical, to: "/admin/services" },
    { label: "Doctors", value: data?.doctors ?? "—", icon: Stethoscope, to: "/admin/doctors" },
    { label: "Slides", value: data?.slides ?? "—", icon: Images, to: "/admin/slides" },
    { label: "New Enquiries", value: data?.newEnquiries ?? "—", icon: Inbox, to: "/admin/enquiries" },
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
                    e.status === "new" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
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
