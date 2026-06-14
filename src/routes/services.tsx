import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Phone, MessageCircle, Search } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fetchDiagnosticProfile, telLink, waLink } from "@/lib/site";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services & Tests — Medline Diagnostics, Trichy" },
      { name: "description", content: "Browse pathology, imaging, cardiac and pulmonary tests with TAT, sample requirements and prices at Medline Diagnostics, Trichy." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const [q, setQ] = useState("");
  const { data: dp } = useQuery({ queryKey: ["dp"], queryFn: fetchDiagnosticProfile });
  const { data = { groups: [], subs: [], tests: [], packages: [] } } = useQuery({
    queryKey: ["services-all"],
    queryFn: async () => {
      const [g, s, t, p] = await Promise.all([
        supabase.from("main_groups").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("sub_groups").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("tests").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("packages").select("*").eq("is_visible", true).order("sort_order"),
      ]);
      return { groups: g.data || [], subs: s.data || [], tests: t.data || [], packages: p.data || [] };
    },
  });

  const term = q.trim().toLowerCase();
  const matches = (s: string | null) => !term || (s || "").toLowerCase().includes(term);

  return (
    <SiteLayout>
      <section className="bg-gradient-soft">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Services</p>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">Tests, scans & packages</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Browse our complete catalogue. Walk in or call <a className="font-medium text-primary" href={telLink(dp?.phone)}>{dp?.phone}</a> for any query.
          </p>
          <div className="mt-6 flex max-w-md items-center gap-2 rounded-full border border-border bg-background px-4 py-2 shadow-card">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tests (e.g. CBC, ultrasound)"
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
      </section>

      {/* Sticky category tabs */}
      {data.groups.length > 0 && (
        <nav className="sticky top-16 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3">
            {data.groups.map((g) => (
              <a
                key={g.id}
                href={`#${g.slug}`}
                className="whitespace-nowrap rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
              >
                {g.name}
              </a>
            ))}
            {data.packages.length > 0 && (
              <a href="#packages" className="whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">
                Packages
              </a>
            )}
          </div>
        </nav>
      )}

      <div className="mx-auto max-w-7xl px-4 py-12 space-y-12">

        {data.groups.map((g) => (
          <section key={g.id} id={g.slug} className="scroll-mt-24">
            <h2 className="text-2xl font-bold md:text-3xl">{g.name}</h2>
            {g.description && <p className="mt-1 text-muted-foreground">{g.description}</p>}
            <div className="mt-6 space-y-8">
              {data.subs.filter((s) => s.main_group_id === g.id).map((sub) => {
                const list = data.tests.filter((t) => t.sub_group_id === sub.id && (matches(t.name) || matches(t.code)));
                if (term && list.length === 0) return null;
                return (
                  <div key={sub.id}>
                    <h3 className="mb-3 text-lg font-semibold text-foreground/90">{sub.name}</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {list.map((t) => (
                        <article key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/40">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold">{t.name}</h4>
                              {t.code && <p className="text-xs text-muted-foreground">{t.code}</p>}
                            </div>
                            {t.price != null && <div className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">₹{Number(t.price).toLocaleString("en-IN")}</div>}
                          </div>
                          {t.description && <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>}
                          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            {t.sample_required && <Detail label="Sample" value={t.sample_required} />}
                            {t.tat && <Detail label="Report TAT" value={t.tat} />}
                            {t.reference_range && <Detail label="Reference" value={t.reference_range} />}
                          </dl>
                          <div className="mt-3 flex gap-2">
                            <Button asChild size="sm" variant="outline" className="flex-1">
                              <a href={telLink(dp?.phone)}><Phone className="mr-1 h-3.5 w-3.5" />Call</a>
                            </Button>
                            <Button asChild size="sm" className="flex-1">
                              <a href={waLink(dp?.whatsapp, `Hi, I'd like to book ${t.name}.`)} target="_blank" rel="noreferrer">
                                <MessageCircle className="mr-1 h-3.5 w-3.5" />WhatsApp
                              </a>
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {data.packages.length > 0 && (
          <section id="packages" className="scroll-mt-24">
            <h2 className="text-2xl font-bold md:text-3xl">Health Checkup Packages</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {data.packages.map((p) => (
                <article key={p.id} className="rounded-2xl border border-border bg-gradient-soft p-6 shadow-card">
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  {p.description && <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>}
                  <div className="mt-4 flex items-center justify-between">
                    {p.price != null && <span className="text-2xl font-bold text-primary">₹{Number(p.price).toLocaleString("en-IN")}</span>}
                    <Button asChild>
                      <a href={waLink(dp?.whatsapp, `I'm interested in the ${p.name} package.`)} target="_blank" rel="noreferrer">Enquire</a>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground/90">{value}</dd>
    </div>
  );
}
