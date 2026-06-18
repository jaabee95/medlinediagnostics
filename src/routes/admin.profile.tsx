import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchDiagnosticProfile } from "@/lib/site";
import { uploadPublicMedia } from "@/lib/admin-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({ meta: [{ title: "Diagnostic Profile — Admin" }] }),
  component: () => <AdminShell title="Diagnostic Profile"><ProfileForm /></AdminShell>,
});

function ProfileForm() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dp"], queryFn: fetchDiagnosticProfile });
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  function set<K extends string>(k: K, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    try { const url = await uploadPublicMedia(f, "branding"); set("logo_url", url); toast.success("Logo uploaded"); }
    catch (err: any) { toast.error(err.message); }
  }

  async function save() {
    if (!form.id) return;
    setBusy(true);
    const { id, created_at, updated_at, ...rest } = form;
    const { error } = await supabase.from("diagnostic_profile").update(rest).eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["dp"] });
  }

  if (!data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const field = (k: string, label: string, type = "text") => (
    <div className="space-y-1.5" key={k}>
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Centre Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field("name", "Name")}
          {field("tagline", "Tagline")}

          <div className="sm:col-span-2 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">{field("address_line1", "Address Line 1")}</div>
              <div className="sm:col-span-2">{field("address_line2", "Address Line 2")}</div>
              {field("area", "Area / Locality")}
              {field("city", "City")}
              {field("district", "District")}
              {field("state", "State")}
              {field("pincode", "Pincode")}
              <div className="sm:col-span-2">{field("map_url", "Google Maps URL (optional)")}</div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Legacy single-line address (fallback only)</Label>
                <Textarea rows={2} value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
                <p className="text-xs text-muted-foreground">Used only if structured fields above are blank. Leave empty once you've filled the fields.</p>
              </div>
            </div>
          </div>

          {field("phone", "Phone")}
          {field("whatsapp", "WhatsApp")}
          {field("email", "Email", "email")}
          {field("entity_type", "Entity Type")}
          {field("registration_no", "Registration No.")}
          {field("nabl_status", "NABL Status")}
          {field("nabl_reg_no", "NABL Reg No.")}
          {field("nabl_valid_until", "NABL Valid Until", "date")}
          <div className="sm:col-span-2 space-y-1.5">
            <Label>About Text</Label>
            <Textarea rows={4} value={form.about_text ?? ""} onChange={(e) => set("about_text", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Logo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {form.logo_url ? (
            <img src={form.logo_url} alt="Logo" className="h-24 w-24 rounded-md border bg-white object-contain p-2" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">No logo</div>
          )}
          <Input type="file" accept="image/*" onChange={onLogo} />
          <p className="text-xs text-muted-foreground">PNG or SVG, square works best.</p>
        </CardContent>
      </Card>

      <div className="lg:col-span-3 flex justify-end">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
      </div>
    </div>
  );
}
