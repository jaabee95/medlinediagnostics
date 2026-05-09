import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, MapPin, Building2 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { fetchDiagnosticProfile } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Medline Diagnostics, Trichy" },
      { name: "description", content: "Learn about Medline Diagnostics (P) Ltd in Ponnagar, Trichy — our mission, NABL status, and commitment to accurate, affordable diagnostics." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: dp } = useQuery({ queryKey: ["dp"], queryFn: fetchDiagnosticProfile });
  return (
    <SiteLayout>
      <section className="bg-gradient-soft">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">About Us</p>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">{dp?.name}</h1>
          {dp?.tagline && <p className="mt-3 text-lg text-muted-foreground">{dp.tagline}</p>}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-base leading-relaxed text-foreground/85">{dp?.about_text}</p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Card icon={ShieldCheck} title="NABL Status" value={dp?.nabl_status || "—"} sub={dp?.nabl_reg_no ? `Reg ${dp.nabl_reg_no}` : "Quality assured"} />
          <Card icon={Building2} title="Entity Type" value={dp?.entity_type || "—"} sub={dp?.registration_no || "Registered diagnostics centre"} />
          <Card icon={MapPin} title="Location" value="Ponnagar, Trichy" sub={dp?.address || ""} />
        </div>
      </section>
    </SiteLayout>
  );
}

function Card({ icon: Icon, title, value, sub }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <Icon className="h-6 w-6 text-primary" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
