import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, Phone, X } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/medline-logo.png";
import { fetchDiagnosticProfile, telLink } from "@/lib/site";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { data: dp } = useQuery({ queryKey: ["dp"], queryFn: fetchDiagnosticProfile });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={dp?.logo_url || logo} alt="Medline Diagnostics logo" className="h-9 w-9" width={36} height={36} />
          <div className="leading-tight">
            <div className="font-display text-base font-bold text-foreground">Medline</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Diagnostics
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button asChild size="sm">
            <a href={telLink(dp?.phone)} className="gap-2">
              <Phone className="h-4 w-4" /> {dp?.phone || "Call"}
            </a>
          </Button>
        </div>

        <button
          className="rounded-md p-2 md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="flex flex-col p-3">
            {navItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="rounded-md px-3 py-3 text-base font-medium text-foreground/80 hover:bg-accent"
              >
                {n.label}
              </Link>
            ))}
            <Button asChild className="mt-2">
              <a href={telLink(dp?.phone)} className="gap-2">
                <Phone className="h-4 w-4" /> Call {dp?.phone}
              </a>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
