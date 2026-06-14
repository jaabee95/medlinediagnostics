import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck, MapPin, Building2, Target, Eye, HeartHandshake,
  BadgeCheck, Clock4, Users, FlaskConical, Microscope, Award,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { fetchDiagnosticProfile, mapsLink } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Medline Diagnostics, Trichy" },
      { name: "description", content: "Medline Diagnostics (P) Ltd in Ponnagar, Trichy — our mission, vision, NABL-aspirant quality systems and commitment to accurate, affordable diagnostics." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { data: dp } = useQuery({ queryKey: ["dp"], queryFn: fetchDiagnosticProfile });
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-soft">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">About Us</p>
          <h1 className="mt-2 font-display text-4xl font-bold md:text-5xl">{dp?.name || "Medline Diagnostics"}</h1>
          {dp?.tagline && <p className="mt-3 text-lg text-muted-foreground">{dp.tagline}</p>}
        </div>
      </section>

      {/* About text + stats */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="text-2xl font-bold">Who we are</h2>
            <p className="mt-4 text-base leading-relaxed text-foreground/85">
              {dp?.about_text || "Medline Diagnostics is a full-service diagnostic centre serving Trichy with pathology, imaging, cardiac and pulmonary testing under one roof."}
            </p>
          </div>
          <aside className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <ul className="space-y-4 text-sm">
              <Item icon={Award} label="Years of trusted service" value="15+" />
              <Item icon={FlaskConical} label="Tests & scans offered" value="500+" />
              <Item icon={Users} label="Patients served" value="1,00,000+" />
              <Item icon={Microscope} label="Specialised departments" value="6" />
            </ul>
          </aside>
        </div>
      </section>

      {/* Mission / Vision / Values */}
      <section className="bg-secondary/40 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-3">
            <Pillar icon={Target} title="Our Mission" body="Make accurate diagnostics accessible and affordable to every family in Trichy, with reports they can act on the same day." />
            <Pillar icon={Eye} title="Our Vision" body="Be the most trusted diagnostic partner in central Tamil Nadu — known for precision, warmth and unwavering ethics." />
            <Pillar icon={HeartHandshake} title="Our Values" body="Patient-first care, transparent pricing, scientific rigour, and respect for every person who walks through our door." />
          </div>
        </div>
      </section>

      {/* Quality commitments */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Quality first</p>
          <h2 className="mt-1 text-3xl font-bold md:text-4xl">Our commitments to you</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Commit icon={BadgeCheck} title="NABL-aspirant lab" body="Internal QC twice daily, external EQAS participation and calibrated analysers." />
          <Commit icon={Clock4} title="Same-day reports" body="Routine pathology in 4–6 hours; imaging on the same visit." />
          <Commit icon={ShieldCheck} title="Privacy & dignity" body="Separate sample collection bays and confidential digital reporting." />
          <Commit icon={HeartHandshake} title="Affordable care" body="Transparent rate card, package discounts and senior-citizen concessions." />
        </div>
      </section>

      {/* Profile cards */}
      <section className="mx-auto max-w-5xl px-4 pb-12">
        <div className="grid gap-6 md:grid-cols-3">
          <Card icon={ShieldCheck} title="NABL Status" value={dp?.nabl_status || "Aspirant"} sub={dp?.nabl_reg_no ? `Reg ${dp.nabl_reg_no}` : "Quality assured"} />
          <Card icon={Building2} title="Entity" value={dp?.entity_type || "Private Limited"} sub={dp?.registration_no || "Registered diagnostics centre"} />
          <Card icon={MapPin} title="Location" value="Ponnagar, Trichy" sub={dp?.address || ""} />
        </div>
      </section>

      {/* Map */}
      {dp && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <div className="overflow-hidden rounded-2xl border border-border shadow-card">
            <iframe
              title="Medline Diagnostics location"
              src={`https://www.google.com/maps?q=${encodeURIComponent(dp.address || "Ponnagar Trichy")}&output=embed`}
              className="h-80 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <div className="mt-3 text-right">
            <a className="text-sm font-medium text-primary hover:underline" href={mapsLink(dp)} target="_blank" rel="noreferrer">
              Open in Google Maps →
            </a>
          </div>
        </section>
      )}
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

function Pillar({ icon: Icon, title, body }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-card">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Commit({ icon: Icon, title, body }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elegant">
      <Icon className="h-7 w-7 text-primary" />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Item({ icon: Icon, label, value }: any) {
  return (
    <li className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-base font-semibold leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </li>
  );
}
