import { useQuery } from "@tanstack/react-query";
import { Phone, MessageCircle, MapPin } from "lucide-react";
import { fetchDiagnosticProfile, telLink, waLink, mapsLink } from "@/lib/site";

export function MobileCTA() {
  const { data: dp } = useQuery({ queryKey: ["dp"], queryFn: fetchDiagnosticProfile });
  if (!dp) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-3 divide-x divide-border">
        <a href={telLink(dp.phone)} className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-foreground">
          <Phone className="h-5 w-5 text-primary" /> Call
        </a>
        <a href={waLink(dp.whatsapp)} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-foreground">
          <MessageCircle className="h-5 w-5 text-primary" /> WhatsApp
        </a>
        <a href={mapsLink(dp)} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-foreground">
          <MapPin className="h-5 w-5 text-primary" /> Directions
        </a>
      </div>
    </div>
  );
}
