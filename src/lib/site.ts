import { supabase } from "@/integrations/supabase/client";

export type DiagnosticProfile = {
  id: string;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  logo_url: string | null;
  map_url: string | null;
  map_lat: number | null;
  map_lng: number | null;
  entity_type: string | null;
  registration_no: string | null;
  nabl_status: string | null;
  nabl_reg_no: string | null;
  nabl_valid_until: string | null;
  about_text: string | null;
};

export async function fetchDiagnosticProfile(): Promise<DiagnosticProfile | null> {
  const { data, error } = await supabase
    .from("diagnostic_profile")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as DiagnosticProfile | null;
}

export function telLink(phone?: string | null) {
  if (!phone) return "#";
  return `tel:${phone.replace(/\s+/g, "")}`;
}
export function waLink(wa?: string | null, msg = "Hi, I'd like to know more about your services.") {
  if (!wa) return "#";
  const num = wa.replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}
export function mapsLink(p: { map_url?: string | null; address?: string | null }) {
  if (p.map_url) return p.map_url;
  if (p.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`;
  return "#";
}
