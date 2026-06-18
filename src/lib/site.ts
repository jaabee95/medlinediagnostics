import { supabase } from "@/integrations/supabase/client";

export type DiagnosticProfile = {
  id: string;
  name: string;
  tagline: string | null;
  address: string | null;
  address_line1: string | null;
  address_line2: string | null;
  area: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
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

export const GENERAL_WA_MESSAGE =
  "Hello Medline Diagnostics. I would like to know more about your diagnostic services.";

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
export function waLink(wa?: string | null, msg = GENERAL_WA_MESSAGE) {
  if (!wa) return "#";
  const num = wa.replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}
export function mapsLink(p: { map_url?: string | null; address?: string | null } & Partial<DiagnosticProfile>) {
  if (p.map_url) return p.map_url;
  const addr = formatAddress(p as any) || p.address;
  if (addr) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  return "#";
}

/** Single-line formatted address built from structured fields, with legacy fallback. */
export function formatAddress(p?: Partial<DiagnosticProfile> | null): string {
  if (!p) return "";
  const parts = [
    p.address_line1,
    p.address_line2,
    p.area,
    p.city,
    p.district,
    [p.state, p.pincode].filter(Boolean).join(" - "),
  ]
    .map((x) => (x || "").trim())
    .filter(Boolean);
  if (parts.length) return parts.join(", ");
  return (p.address || "").trim();
}

/** Multi-line address (array of lines) for stacked display. */
export function formatAddressLines(p?: Partial<DiagnosticProfile> | null): string[] {
  if (!p) return [];
  const structured = [
    p.address_line1,
    p.address_line2,
    [p.area, p.city].filter(Boolean).join(", "),
    [p.district, p.state, p.pincode].filter(Boolean).join(" "),
  ]
    .map((x) => (x || "").trim())
    .filter(Boolean);
  if (structured.length) return structured;
  return p.address ? [p.address] : [];
}
