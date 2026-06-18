import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import logo from "@/assets/medline-logo.png";
import { fetchDiagnosticProfile, formatAddressLines, mapsLink, telLink, waLink } from "@/lib/site";

export function SiteFooter() {
  const { data: dp } = useQuery({ queryKey: ["dp"], queryFn: fetchDiagnosticProfile });
  const addressLines = formatAddressLines(dp);

  return (
    <footer className="mt-16 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <img src={dp?.logo_url || logo} alt="" className="h-9 w-9" width={36} height={36} loading="lazy" />
            <div>
              <div className="font-display text-base font-bold">{dp?.name || "Medline Diagnostics"}</div>
              <div className="text-xs text-muted-foreground">{dp?.tagline}</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{dp?.about_text}</p>
          {dp?.nabl_status && (
            <div className="mt-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              NABL {dp.nabl_status}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="text-muted-foreground hover:text-primary">Home</Link></li>
            <li><Link to="/services" className="text-muted-foreground hover:text-primary">Services</Link></li>
            <li><Link to="/about" className="text-muted-foreground hover:text-primary">About Us</Link></li>
            <li><Link to="/contact" className="text-muted-foreground hover:text-primary">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">Reach Us</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {addressLines.length > 0 && (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="not-italic">
                  {addressLines.map((l, i) => <span key={i} className="block">{l}</span>)}
                </span>
              </li>
            )}
            {dp?.phone && (
              <li><a href={telLink(dp.phone)} className="flex gap-2 hover:text-primary"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {dp.phone}</a></li>
            )}
            {dp?.whatsapp && (
              <li><a href={waLink(dp.whatsapp)} target="_blank" rel="noreferrer" className="flex gap-2 hover:text-primary"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> WhatsApp</a></li>
            )}
            {dp?.email && (
              <li><a href={`mailto:${dp.email}`} className="flex gap-2 hover:text-primary"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {dp.email}</a></li>
            )}
            {dp && (
              <li><a href={mapsLink(dp)} target="_blank" rel="noreferrer" className="text-primary hover:underline">Get directions →</a></li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {dp?.name || "Medline Diagnostics"}. All rights reserved.
        {" · "}<Link to="/admin/login" className="hover:text-primary">Staff Login</Link>
      </div>
    </footer>
  );
}
