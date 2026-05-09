import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Phone, MessageCircle, MapPin, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fetchDiagnosticProfile, telLink, waLink, mapsLink } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Medline Diagnostics, Trichy" },
      { name: "description", content: "Visit Medline Diagnostics in Ponnagar, Trichy. Call, WhatsApp or send an enquiry." },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone").max(20),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Tell us a bit more").max(1000),
});

function ContactPage() {
  const { data: dp } = useQuery({ queryKey: ["dp"], queryFn: fetchDiagnosticProfile });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: fd.get("name"), phone: fd.get("phone"),
      email: fd.get("email") || "", message: fd.get("message"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.from("enquiries").insert({
      name: parsed.data.name, phone: parsed.data.phone,
      email: parsed.data.email || null, message: parsed.data.message,
    });
    setSubmitting(false);
    if (error) { toast.error("Couldn't send. Please try again."); return; }
    toast.success("Thanks! We'll get back to you shortly.");
    (e.target as HTMLFormElement).reset();
  }

  return (
    <SiteLayout>
      <section className="bg-gradient-soft">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Contact</p>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">We're here to help</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Walk in, call, WhatsApp, or drop us an enquiry.</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-2">
        <div className="space-y-4">
          <Tile icon={MapPin} title="Visit" text={dp?.address} action={dp ? { href: mapsLink(dp), label: "Get directions" } : undefined} />
          <Tile icon={Phone} title="Call" text={dp?.phone} action={dp?.phone ? { href: telLink(dp.phone), label: "Tap to call" } : undefined} />
          <Tile icon={MessageCircle} title="WhatsApp" text={dp?.whatsapp} action={dp?.whatsapp ? { href: waLink(dp.whatsapp), label: "Open WhatsApp" } : undefined} />
          <Tile icon={Mail} title="Email" text={dp?.email} action={dp?.email ? { href: `mailto:${dp.email}`, label: "Send email" } : undefined} />

          {dp?.address && (
            <iframe
              title="Map"
              className="h-64 w-full rounded-2xl border border-border"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(dp.address)}&output=embed`}
            />
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-xl font-semibold">Send us an enquiry</h2>
          <div className="space-y-1.5"><Label htmlFor="name">Your name</Label><Input id="name" name="name" required maxLength={100} /></div>
          <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" type="tel" required maxLength={20} /></div>
          <div className="space-y-1.5"><Label htmlFor="email">Email (optional)</Label><Input id="email" name="email" type="email" maxLength={255} /></div>
          <div className="space-y-1.5"><Label htmlFor="message">Message</Label><Textarea id="message" name="message" required rows={4} maxLength={1000} /></div>
          <Button type="submit" disabled={submitting} className="w-full gap-2"><Send className="h-4 w-4" />{submitting ? "Sending..." : "Send Enquiry"}</Button>
        </form>
      </div>
    </SiteLayout>
  );
}

function Tile({ icon: Icon, title, text, action }: any) {
  if (!text) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-0.5 font-medium">{text}</p>
          {action && <a href={action.href} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">{action.label} →</a>}
        </div>
      </div>
    </div>
  );
}
