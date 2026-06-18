import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchDiagnosticProfile, telLink, waLink, GENERAL_WA_MESSAGE } from "@/lib/site";
import { ContactInline, ContactStickyMobile } from "@/components/site/ContactBar";

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
  const { data = { groups: [], subs: [], tests: [], packages: [], packageItems: [], profiles: [], profileItems: [] } } = useQuery({
    queryKey: ["services-all"],
    queryFn: async () => {
      const [g, s, t, p, pi, tp, tpi] = await Promise.all([
        supabase.from("main_groups").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("sub_groups").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("tests").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("packages").select("*").eq("is_visible", true).order("sort_order"),
        supabase.from("package_items").select("*"),
        supabase.from("test_profiles").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("test_profile_items").select("*"),
      ]);
      return {
        groups: g.data || [], subs: s.data || [], tests: t.data || [], packages: p.data || [],
        packageItems: pi.data || [], profiles: tp.data || [], profileItems: tpi.data || [],
      };
    },
  });

  const term = q.trim().toLowerCase();
  const matches = (s: string | null) => !term || (s || "").toLowerCase().includes(term);

  // Build ordered list of tab targets: groups first, then packages
  const tabs: { id: string; label: string }[] = [
    ...data.groups.map((g: any) => ({ id: g.slug, label: g.name })),
    ...(data.packages.length > 0 ? [{ id: "packages", label: "Health Checkup Packages" }] : []),
  ];

  // Active tab tracking
  const [activeId, setActiveId] = useState<string | null>(null);
  const suppressSpyUntil = useRef(0);

  // Default to first tab on load
  useEffect(() => {
    if (!activeId && tabs.length) setActiveId(tabs[0].id);
  }, [tabs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll spy via IntersectionObserver
  useEffect(() => {
    if (!tabs.length) return;
    const sections = tabs
      .map((t) => document.getElementById(t.id))
      .filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < suppressSpyUntil.current) return;
        // Pick the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = (visible[0].target as HTMLElement).id;
          setActiveId(id);
        }
      },
      { rootMargin: "-140px 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [tabs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    setActiveId(id);
    suppressSpyUntil.current = Date.now() + 900;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    }
  }

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

      {/* Sticky category tabs + global contact (desktop) */}
      {tabs.length > 0 && (
        <nav className="sticky top-16 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
            <div className="flex flex-1 gap-2 overflow-x-auto">
              {tabs.map((t) => {
                const isActive = activeId === t.id;
                return (
                  <a
                    key={t.id}
                    href={`#${t.id}`}
                    onClick={(e) => handleTabClick(e, t.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground/80 hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {t.label}
                  </a>
                );
              })}
            </div>
            <ContactInline className="hidden md:flex" />
          </div>
        </nav>
      )}

      <div className="mx-auto max-w-7xl px-4 py-12 pb-28 md:pb-12 space-y-12">

        {data.groups.map((g) => (
          <section key={g.id} id={g.slug} className="scroll-mt-36">
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
          <section id="packages" className="scroll-mt-36">
            <h2 className="text-2xl font-bold md:text-3xl">Health Checkup Packages</h2>
            <p className="mt-1 text-muted-foreground">Curated bundles of tests and profiles at a discounted price.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {data.packages.map((p) => {
                const items = data.packageItems.filter((x: any) => x.package_id === p.id);
                const profiles = items.filter((x: any) => x.item_type === "profile")
                  .map((x: any) => data.profiles.find((pr: any) => pr.id === x.item_id))
                  .filter(Boolean);
                const tests = items.filter((x: any) => x.item_type === "test")
                  .map((x: any) => data.tests.find((t: any) => t.id === x.item_id))
                  .filter(Boolean);
                return (
                  <article key={p.id} className="rounded-2xl border border-border bg-gradient-soft p-6 shadow-card">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    {p.description && <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>}

                    {(profiles.length > 0 || tests.length > 0) && (
                      <div className="mt-4 space-y-3 text-sm">
                        {profiles.map((pr: any) => {
                          const profileTests = data.profileItems
                            .filter((x: any) => x.profile_id === pr.id)
                            .map((x: any) => data.tests.find((t: any) => t.id === x.test_id))
                            .filter(Boolean);
                          return (
                            <details key={pr.id} className="rounded-lg bg-card/60 p-3">
                              <summary className="cursor-pointer font-medium">
                                {pr.name}{" "}
                                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase text-primary">Profile · {profileTests.length} tests</span>
                              </summary>
                              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                                {profileTests.map((t: any) => <li key={t.id}>{t.name}</li>)}
                              </ul>
                            </details>
                          );
                        })}
                        {tests.length > 0 && (
                          <div className="rounded-lg bg-card/60 p-3">
                            <div className="font-medium">Individual tests included</div>
                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                              {tests.map((t: any) => <li key={t.id}>{t.name}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                      {p.price != null && <span className="text-2xl font-bold text-primary">₹{Number(p.price).toLocaleString("en-IN")}</span>}
                      <Button asChild>
                        <a href={waLink(dp?.whatsapp, GENERAL_WA_MESSAGE)} target="_blank" rel="noreferrer">Enquire</a>
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Mobile sticky contact bar (page-scoped) */}
      <ContactStickyMobile />
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
