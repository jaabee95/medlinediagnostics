import { useQuery } from "@tanstack/react-query";
import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchDiagnosticProfile, telLink, waLink, GENERAL_WA_MESSAGE } from "@/lib/site";

/** Inline contact buttons (desktop, beside category nav). */
export function ContactInline({ className = "" }: { className?: string }) {
  const { data: dp } = useQuery({ queryKey: ["dp"], queryFn: fetchDiagnosticProfile });
  if (!dp) return null;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button asChild size="sm" variant="outline">
        <a href={telLink(dp.phone)} className="gap-1.5"><Phone className="h-4 w-4" /> Call</a>
      </Button>
      <Button asChild size="sm">
        <a href={waLink(dp.whatsapp, GENERAL_WA_MESSAGE)} target="_blank" rel="noreferrer" className="gap-1.5">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      </Button>
    </div>
  );
}

/** Sticky bottom contact bar for mobile (page-scoped, replaces global MobileCTA on the page that uses it). */
export function ContactStickyMobile() {
  const { data: dp } = useQuery({ queryKey: ["dp"], queryFn: fetchDiagnosticProfile });
  if (!dp) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 p-2">
        <Button asChild variant="outline" className="gap-2">
          <a href={telLink(dp.phone)}><Phone className="h-4 w-4" /> Call</a>
        </Button>
        <Button asChild className="gap-2">
          <a href={waLink(dp.whatsapp, GENERAL_WA_MESSAGE)} target="_blank" rel="noreferrer">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
