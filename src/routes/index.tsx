import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ShieldCheck, Clock4, Stethoscope, Microscope, ScanLine, HeartPulse,
  ClipboardCheck, Phone, MessageCircle, ChevronRight, ArrowRight,
  Award, Users, FlaskConical, Activity, Quote, BadgeCheck, Wallet, Sparkles, Star,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchDiagnosticProfile, telLink, waLink } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Medline Diagnostics — Trusted Pathology & Imaging in Trichy" },
      {
        name: "description",
        content:
          "Walk-in diagnostic centre in Ponnagar, Trichy offering blood tests, ultrasound, X-Ray, CT, ECHO, TMT, PFT and health checkup packages.",
      },
    ],
  }),
  component: HomePage,
});

const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  flask: Microscope, scan: ScanLine, "heart-pulse": HeartPulse, "clipboard-check": ClipboardCheck,
};

function HomePage() {
  const { data: dp } = useQuery({ queryKey: ["dp"], queryFn: fetchDiagnosticProfile });
  const { data: slides = [] } = useQuery({
    queryKey: ["slides", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("slides").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error; return data;
    },
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["mg", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("main_groups").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error; return data;
    },
  });
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", "home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("doctors").select("*").eq("show_on_home", true).eq("is_active", true).order("sort_order");
      if (error) throw error; return data;
    },
  });
  const { data: packages = [] } = useQuery({
    queryKey: ["packages", "home"],
    queryFn: async () => {
      const { data, error } = await supabase.from("packages").select("*").eq("is_visible", true).order("sort_order").limit(3);
      if (error) throw error; return data;
    },
  });

  return (
    <SiteLayout>
      <Hero slides={slides} />

      <TrustBar />

      <StatsStrip />

      {/* Services snapshot */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Our Services</p>
            <h2 className="mt-1 text-3xl font-bold md:text-4xl">Comprehensive diagnostics under one roof</h2>
          </div>
          <Link to="/services" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline md:inline-flex">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((g) => {
            const Icon = ICON[g.icon || ""] || Stethoscope;
            return (
              <Link
                key={g.id}
                to="/services"
                hash={g.slug}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{g.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
                <div className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                  Explore <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <WhyChooseUs />

      {/* Packages teaser */}
      {packages.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Health Packages</p>
              <h2 className="mt-1 text-3xl font-bold md:text-4xl">Preventive checkups, thoughtfully bundled</h2>
            </div>
            <Link to="/services" hash="packages" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline md:inline-flex">
              See all packages <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {packages.map((p) => (
              <article key={p.id} className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10" />
                <Sparkles className="relative h-6 w-6 text-primary" />
                <h3 className="relative mt-4 text-lg font-semibold">{p.name}</h3>
                {p.description && <p className="relative mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>}
                <div className="relative mt-5 flex items-center justify-between">
                  {p.price != null && <span className="text-2xl font-bold text-primary">₹{Number(p.price).toLocaleString("en-IN")}</span>}
                  <Button asChild size="sm">
                    <a href={waLink(dp?.whatsapp, `I'm interested in the ${p.name} package.`)} target="_blank" rel="noreferrer">Enquire</a>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}


      {/* Doctors */}
      {doctors.length > 0 && (
        <section className="bg-secondary/40 py-14">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Our Specialists</p>
              <h2 className="mt-1 text-3xl font-bold md:text-4xl">Experienced consultants you can trust</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((d) => (
                <article key={d.id} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="flex items-start gap-4">
                    {d.photo_url && (
                      <img src={d.photo_url} alt={d.name} className="h-20 w-20 rounded-full object-cover" loading="lazy" width={80} height={80} />
                    )}
                    <div>
                      <h3 className="font-semibold">{d.name}</h3>
                      <p className="text-sm text-muted-foreground">{d.qualification}</p>
                      <p className="text-xs font-medium text-primary">{d.specialization}</p>
                    </div>
                  </div>
                  {d.description && <p className="mt-4 text-sm text-muted-foreground">{d.description}</p>}
                  {d.reg_no && <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">Reg No: {d.reg_no}</p>}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <Testimonials />

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="overflow-hidden rounded-3xl bg-gradient-hero p-8 text-primary-foreground shadow-elegant md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl">Need a test or scan today?</h2>
              <p className="mt-2 max-w-2xl text-primary-foreground/80">
                Walk in or call us — most reports are ready the same day. We accept doctor referrals and direct walk-ins.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <a href={telLink(dp?.phone)} className="gap-2"><Phone className="h-5 w-5" /> Call Now</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <a href={waLink(dp?.whatsapp)} target="_blank" rel="noreferrer" className="gap-2"><MessageCircle className="h-5 w-5" /> WhatsApp</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Hero({ slides }: { slides: any[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);
  if (slides.length === 0) return null;
  return (
    <section className="relative isolate overflow-hidden">
      <div className="relative h-[78vh] min-h-[480px] max-h-[720px] w-full">
        {slides.map((s, idx) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${idx === i ? "opacity-100" : "opacity-0"}`}
          >
            <img src={s.image_url} alt={s.heading || ""} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/75 via-foreground/50 to-transparent" />
          </div>
        ))}
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4">
          <div className="max-w-2xl text-background">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" /> Trusted in Trichy
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-white md:text-6xl">
              {slides[i]?.heading || "Modern Diagnostics, Caring Hands"}
            </h1>
            {slides[i]?.subtext && (
              <p className="mt-4 max-w-xl text-lg text-white/90">{slides[i].subtext}</p>
            )}
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/services">Browse Services</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link to="/contact">Visit Us</Link>
              </Button>
            </div>
          </div>
        </div>
        {slides.length > 1 && (
          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-white" : "w-3 bg-white/50"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TrustBar() {
  const items = [
    { icon: ShieldCheck, label: "NABL Aspirant", sub: "Quality first" },
    { icon: Clock4, label: "Same-Day Reports", sub: "For most routine tests" },
    { icon: Stethoscope, label: "Doctor Referrals", sub: "Walk-ins welcome" },
    { icon: HeartPulse, label: "Cardiac & Pulmonary", sub: "ECHO, TMT, PFT" },
  ];
  return (
    <section className="border-y border-border/60 bg-background">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4">
        {items.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">{label}</div>
              <div className="text-xs text-muted-foreground">{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsStrip() {
  const items = [
    { icon: Award, value: "15+", label: "Years of service" },
    { icon: FlaskConical, value: "500+", label: "Tests & scans" },
    { icon: Users, value: "1L+", label: "Patients served" },
    { icon: Activity, value: "24×7", label: "Emergency support" },
  ];
  return (
    <section className="bg-gradient-soft">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
        {items.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex flex-col items-center text-center">
            <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <div className="font-display text-3xl font-bold text-foreground">{value}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyChooseUs() {
  const items = [
    { icon: BadgeCheck, title: "Accuracy you can trust", body: "Calibrated equipment, internal QC and trained technicians on every shift." },
    { icon: Clock4, title: "Fast turnaround", body: "Most pathology reports within 4–6 hours; imaging same day." },
    { icon: Wallet, title: "Transparent pricing", body: "Clear rates with no hidden charges. Health package discounts available." },
    { icon: Stethoscope, title: "Doctor-friendly", body: "Direct hotline for referring physicians and structured digital reports." },
  ];
  return (
    <section className="border-y border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Why Medline</p>
          <h2 className="mt-1 text-3xl font-bold md:text-4xl">Care that's accurate, prompt and personal</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <Icon className="h-7 w-7 text-primary" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const fallback = [
    { id: "f1", name: "Revathi S.", message: "Got my entire master health checkup done in under 3 hours. Staff were warm and the report was clearly explained.", rating: 5, photo_url: null },
    { id: "f2", name: "Dr. Karthik R.", message: "Reliable reports with quick TAT. I refer my patients confidently for ECHO and TMT.", rating: 5, photo_url: null },
    { id: "f3", name: "Anand P.", message: "Prices were reasonable and they shared the report on WhatsApp the same evening. Recommended.", rating: 5, photo_url: null },
  ];

  const { data: featured = [] } = useQuery({
    queryKey: ["reviews", "featured"],
    queryFn: async () => {
      // featured first; fall back to approved
      const { data: f } = await supabase.from("reviews").select("*").eq("is_approved", true).eq("is_featured", true).order("created_at", { ascending: false }).limit(6);
      if (f && f.length) return f;
      const { data: a } = await supabase.from("reviews").select("*").eq("is_approved", true).order("created_at", { ascending: false }).limit(6);
      return a || [];
    },
  });

  const items: any[] = featured.length ? featured : fallback;

  return (
    <section className="bg-secondary/40 py-14">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">What people say</p>
            <h2 className="mt-1 text-3xl font-bold md:text-4xl">Trusted by patients and physicians across Trichy</h2>
          </div>
          <Button asChild variant="outline"><Link to="/reviews">Write a review</Link></Button>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((t: any) => (
            <figure key={t.id} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < (t.rating ?? 5) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed text-foreground/85">"{t.message}"</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                    {t.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">Patient review</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
