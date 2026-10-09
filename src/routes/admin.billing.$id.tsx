import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Ban, Pencil, Plus, Printer, Search, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/permissions";
import { fetchDiagnosticProfile, formatAddressLines, telLink } from "@/lib/site";
import {
  inr, ITEM_TYPE_LABEL, PAYMENT_METHODS,
  type Invoice, type Patient, type Payment, type Referrer,
} from "@/lib/billing";
import { toast } from "sonner";
import { billingTotals, mayChangeInvoice } from "@/lib/billing-rules";

export const Route = createFileRoute("/admin/billing/$id")({
  head: () => ({ meta: [{ title: "Invoice — Admin — Medline Diagnostics" }, { name: "description", content: "Invoice — Admin — Medline Diagnostics. Private staff workspace." }, { property: "og:title", content: "Invoice — Admin — Medline Diagnostics" }, { property: "og:description", content: "Invoice — Admin — Medline Diagnostics. Private staff workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: InvoicePage,
});

function InvoicePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  if (id === "new") {
    return <InvoiceEditor id="new" onDone={(invId) => navigate({ to: "/admin/billing/$id", params: { id: invId } })} />;
  }
  return <InvoiceDetail id={id} />;
}

/* ============================ DETAIL ============================ */

function InvoiceDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  const access = useAccess(uid);
  const canEdit = access.can("billing", "edit");
  const canModify = mayChangeInvoice(access.isAdmin, canEdit, access.can("billing_modify", "edit"));
  const canCancel = mayChangeInvoice(access.isAdmin, canEdit, access.can("billing_cancel", "edit"));

  const [editing, setEditing] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [paper, setPaper] = useState<"A4" | "A5">("A4");

  const { data: dp } = useQuery({ queryKey: ["dp"], queryFn: fetchDiagnosticProfile });

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const [inv, pay, itemRows] = await Promise.all([
        supabase.from("invoices").select("*, patient:patients(*), referrer:referrers(*)").eq("id", id).maybeSingle(),
        supabase.from("payments").select("*").eq("invoice_id", id).order("paid_at"),
        supabase.from("invoice_items").select("*").eq("invoice_id", id).order("id"),
      ]);
      if (inv.error) throw inv.error;
      if (pay.error) throw pay.error;
      if (itemRows.error) throw itemRows.error;
      return {
        invoice: inv.data as (Invoice & { patient: Patient | null; referrer: Referrer | null }) | null,
        payments: (pay.data || []) as Payment[],
        items: itemRows.data || [],
      };
    },
  });

  // Inject @page rule for chosen paper size
  useEffect(() => {
    let el = document.getElementById("invoice-print-style") as HTMLStyleElement | null;
    if (!el) { el = document.createElement("style"); el.id = "invoice-print-style"; document.head.appendChild(el); }
    el.textContent = `@page { size: ${paper}; margin: ${paper === "A4" ? "12mm" : "8mm"}; }`;
  }, [paper]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading invoice…</p>;
  const invoice = data?.invoice;
  const payments = data?.payments || [];
  if (!invoice) return <p className="text-sm text-muted-foreground">Invoice not found.</p>;

  const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const balance = Math.max(0, Number(invoice.total) - paid);


  return editing ? (
    <InvoiceEditor
      id={id}
      onDone={() => { setEditing(false); qc.invalidateQueries({ queryKey: ["invoice", id] }); }}
      onCancel={() => setEditing(false)}
    />
  ) : (
    <div className="space-y-4">
      {/* Toolbar (hidden when printing) */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/billing"><ArrowLeft className="mr-1 h-4 w-4" /> All invoices</Link>
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Paper</span>
          <Select value={paper} onValueChange={(v) => setPaper(v as "A4" | "A5")}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4</SelectItem>
              <SelectItem value="A5">A5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Print</Button>
        {invoice.status !== "cancelled" && canEdit && (
          <>
            {canModify && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="mr-1 h-4 w-4" /> Edit</Button>}
            <Button size="sm" onClick={() => setPayOpen(true)} disabled={balance <= 0}>Record Payment</Button>
            {canCancel && <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                const reason = prompt("Reason for cancellation (payments remain recorded):");
                if (!reason) return;
                const { error } = await supabase.rpc("cancel_billing_invoice", { _invoice_id: id, _reason: reason });
                if (error) return toast.error(error.message);
                toast.success("Invoice cancelled");
                qc.invalidateQueries({ queryKey: ["billing-invoices"] });
                qc.invalidateQueries({ queryKey: ["billing-summary"] });
                qc.invalidateQueries({ queryKey: ["referrers-crm"] });
                qc.invalidateQueries({ queryKey: ["invoice", id] });
              }}
            >
              <Ban className="mr-1 h-4 w-4" /> Cancel Invoice
            </Button>}
          </>
        )}
      </div>

      {invoice.status === "cancelled" && (
        <div className="no-print rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">This invoice is cancelled.</div>
      )}

      {/* Printable invoice */}
      <PrintableInvoice invoice={invoice} items={data?.items || []} payments={payments} dp={dp} paid={paid} balance={balance} />

      {/* Payment history */}
      <Card className="no-print">
        <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-medium">{inr(p.amount)}</span>
                    <span className="ml-2 uppercase text-xs text-muted-foreground">{p.method}</span>
                    {p.notes && <span className="ml-2 text-muted-foreground">— {p.notes}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(p.paid_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PaymentDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        invoiceId={id}
        balance={balance}
        uid={uid}
        onSaved={() => { setPayOpen(false); qc.invalidateQueries({ queryKey: ["invoice", id] }); qc.invalidateQueries({ queryKey: ["billing-invoices"] }); qc.invalidateQueries({ queryKey: ["billing-summary"] }); qc.invalidateQueries({ queryKey: ["referrers-crm"] }); }}
      />
    </div>
  );
}

function PrintableInvoice({ invoice, items, payments, dp, paid, balance }: any) {
  const addrLines = formatAddressLines(dp);
  return (
    <div className="print-area rounded-lg border bg-card p-4 text-card-foreground sm:p-6">
      {/* Letterhead */}
      <div className="flex items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          {dp?.logo_url && <img src={dp.logo_url} alt="" className="h-14 w-14 object-contain" />}
          <div>
            <div className="text-base font-bold sm:text-xl">{dp?.name || "Medline Diagnostics"}</div>
            {dp?.tagline && <div className="text-xs text-muted-foreground">{dp.tagline}</div>}
            {addrLines.map((l: string, i: number) => <div key={i} className="text-xs text-muted-foreground">{l}</div>)}
            {dp?.phone && <div className="mt-0.5 text-xs">Phone: {dp.phone}{dp.whatsapp ? ` · WhatsApp: ${dp.whatsapp}` : ""}</div>}
            {dp?.email && <div className="text-xs">Email: {dp.email}</div>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold uppercase tracking-wide">Invoice</div>
          <div className="text-sm font-semibold">{invoice.invoice_no}</div>
          <div className="text-xs text-muted-foreground">{new Date(invoice.created_at).toLocaleDateString()}</div>
          {invoice.status === "cancelled" && <div className="mt-1 inline-block rounded bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">CANCELLED</div>}
        </div>
      </div>

      {/* Patient & referrer */}
      <div className="grid grid-cols-2 gap-4 py-4 text-sm">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Patient</div>
          <div className="font-medium">{invoice.patient?.name}</div>
          {invoice.patient?.phone && <div className="text-xs text-muted-foreground">{invoice.patient.phone}</div>}
          {invoice.patient?.age && <div className="text-xs text-muted-foreground">Age: {invoice.patient.age}{invoice.patient?.gender ? ` · ${invoice.patient.gender}` : ""}</div>}
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Referral</div>
          <div className="font-medium">{invoice.referrer?.name || "Walk-in"}</div>
          {invoice.referrer?.phone && <div className="text-xs text-muted-foreground">{invoice.referrer.phone}</div>}
        </div>
      </div>

      {/* Items */}
      <table className="w-full border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Description</th>
            <th className="py-2 pr-2">Type</th>
            <th className="py-2 pr-2 text-right">Qty</th>
            <th className="py-2 pr-2 text-right">Rate</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i} className="border-b">
              <td className="py-2 pr-2 text-xs">{i + 1}</td>
              <td className="py-2 pr-2 break-words">{it.name}</td>
              <td className="py-2 pr-2 text-xs text-muted-foreground">{ITEM_TYPE_LABEL[it.item_type] || it.item_type}</td>
              <td className="py-2 pr-2 text-right">{it.quantity}</td>
              <td className="py-2 pr-2 text-right">{inr(it.price)}</td>
              <td className="py-2 text-right font-medium">{inr(it.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-56 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{inr(invoice.subtotal)}</span></div>
          {Number(invoice.discount) > 0 && <div className="flex justify-between"><span>Discount</span><span>-{inr(invoice.discount)}</span></div>}
          <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Total</span><span>{inr(invoice.total)}</span></div>
          <div className="flex justify-between"><span>Amount paid</span><span>{inr(paid)}</span></div>
          <div className="flex justify-between font-semibold"><span>Balance due</span><span>{inr(balance)}</span></div>
        </div>
      </div>

      {invoice.notes && <p className="mt-4 text-xs text-muted-foreground">Notes: {invoice.notes}</p>}
      <p className="mt-6 border-t pt-3 text-center text-xs text-muted-foreground">
        Thank you for choosing {dp?.name || "Medline Diagnostics"}. This is a computer-generated invoice.
      </p>
    </div>
  );
}

function PaymentDialog({ open, onClose, invoiceId, balance, uid, onSaved }: {
  open: boolean; onClose: () => void; invoiceId: string; balance: number; uid: string | null; onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setAmount(String(balance)); setMethod("cash"); setNotes(""); } }, [open, balance]);

  async function save() {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setBusy(true);
    const { error } = await supabase.rpc("record_billing_payment", {
      _invoice_id: invoiceId, _amount: amt, _method: method, _notes: notes.trim() || undefined,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Payment recorded");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Amount (balance {inr(balance)})</Label>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></div>
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save payment"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ EDITOR ============================ */

type DraftItem = { item_type: "test" | "test_profile" | "package"; item_id: string | null; name: string; price: number; quantity: number };

function InvoiceEditor({ id, onDone, onCancel }: { id: string; onDone: (invoiceId: string) => void; onCancel?: () => void }) {
  const qc = useQueryClient();
  const isEdit = id !== "new";
  const [editorUid, setEditorUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEditorUid(data.user?.id ?? null)); }, []);
  const editorAccess = useAccess(editorUid);
  const [loaded, setLoaded] = useState(!isEdit);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientLabel, setPatientLabel] = useState("");
  const [useNewPatient, setUseNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", phone: "", age: "", gender: "" });
  const [patientTerm, setPatientTerm] = useState("");
  const [referrerId, setReferrerId] = useState("");
  const [refTerm, setRefTerm] = useState("");
  const [quickRefOpen, setQuickRefOpen] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [itemTerm, setItemTerm] = useState("");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // Catalogue (tests, profiles, packages)
  const { data: catalog } = useQuery({
    queryKey: ["billing-catalog"],
    queryFn: async () => {
      const [t, tp, p] = await Promise.all([
        supabase.from("tests").select("id,name,code,price").eq("is_active", true).order("name"),
        supabase.from("test_profiles").select("id,name,price").eq("is_active", true).order("name"),
        supabase.from("packages").select("id,name,price").eq("is_visible", true).order("name"),
      ]);
      return { tests: t.data || [], profiles: tp.data || [], packages: p.data || [] };
    },
  });

  const { data: referrers = [] } = useQuery({
    queryKey: ["billing-referrers"],
    queryFn: async () => (await supabase.from("referrers").select("*").order("name")).data || [],
  });

  // Patient search
  const { data: patientHits = [] } = useQuery({
    queryKey: ["patient-search", patientTerm],
    enabled: patientTerm.trim().length >= 2 && !patientId && !useNewPatient,
    queryFn: async () => {
      const term = `%${patientTerm.trim()}%`;
      const { data, error } = await supabase
        .from("patients")
        .select("id,name,phone")
        .or(`name.ilike.${term.replace(/[,().]/g, "")},phone.ilike.${term.replace(/[,().]/g, "")}`)
        .limit(8);
      if (error) return [];
      return data || [];
    },
  });

  // Load existing invoice
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const [invRes, itemsRes] = await Promise.all([
        supabase.from("invoices").select("*, patient:patients(name,phone)").eq("id", id).maybeSingle(),
        supabase.from("invoice_items").select("*").eq("invoice_id", id),
      ]);
      const inv = invRes.data as any;
      if (inv) {
        setPatientId(inv.patient_id);
        setPatientLabel(inv.patient ? `${inv.patient.name}${inv.patient.phone ? " · " + inv.patient.phone : ""}` : "");
        setReferrerId(inv.referrer_id || "");
        setDiscount(String(Number(inv.discount || 0)));
        setNotes(inv.notes || "");
      }
      setItems((itemsRes.data || []).map((it: any) => ({
        item_type: it.item_type, item_id: it.item_id, name: it.name, price: Number(it.price), quantity: it.quantity,
      })));
      setLoaded(true);
    })();
  }, [id, isEdit]);

  const results = useMemo(() => {
    const term = itemTerm.trim().toLowerCase();
    if (!term || !catalog) return [];
    const out: { item_type: DraftItem["item_type"]; item_id: string; name: string; price: number }[] = [];
    for (const t of catalog.tests) if (`${t.name} ${t.code || ""}`.toLowerCase().includes(term)) out.push({ item_type: "test", item_id: t.id, name: t.name, price: Number(t.price || 0) });
    for (const p of catalog.profiles) if (p.name.toLowerCase().includes(term)) out.push({ item_type: "test_profile", item_id: p.id, name: p.name, price: Number(p.price || 0) });
    for (const p of catalog.packages) if (p.name.toLowerCase().includes(term)) out.push({ item_type: "package", item_id: p.id, name: p.name, price: Number(p.price || 0) });
    return out.slice(0, 12);
  }, [itemTerm, catalog]);

  const subtotal = items.reduce((s, it) => s + Math.round(Number(it.price) * it.quantity * 100) / 100, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));

  function addItem(r: { item_type: DraftItem["item_type"]; item_id: string; name: string; price: number }) {
    setItems((prev) => {
      const existing = prev.find((x) => x.item_type === r.item_type && x.item_id === r.item_id);
      if (existing) return prev.map((x) => (x === existing ? { ...x, quantity: x.quantity + 1 } : x));
      return [...prev, { ...r, quantity: 1 }];
    });
    setItemTerm("");
  }

  async function save() {
    setBusy(true);
    try {
      if (!patientId && !newPatient.name.trim()) throw new Error("Select a patient or enter patient details");
      billingTotals(items, Number(discount || 0));
      const { data: invoiceId, error } = await supabase.rpc("save_billing_invoice", {
        payload: {
          id: isEdit ? id : null, patient_id: patientId,
          patient: { ...newPatient }, referrer_id: referrerId || null,
          items, discount: Number(discount || 0), notes: notes.trim(),
        },
      });
      if (error) throw error;
      if (!invoiceId) throw new Error("Invoice was not saved");
      toast.success("Invoice saved");
      await qc.invalidateQueries({ queryKey: ["billing-invoices"] });
      await qc.invalidateQueries({ queryKey: ["billing-summary"] });
      await qc.invalidateQueries({ queryKey: ["referrers-crm"] });
      onDone(invoiceId);
    } catch (e: any) {
      toast.error(e.message || "Failed to save invoice");
    } finally {
      setBusy(false);
    }
  }

  if (!editorAccess.isLoaded) return <p className="text-sm text-muted-foreground">Checking access…</p>;
  if (!editorAccess.can("billing", "edit") || (isEdit && !editorAccess.can("billing_modify", "edit"))) return <p>Invoice edit access is not granted.</p>;
  if (!loaded) return <p className="text-sm text-muted-foreground">Loading invoice…</p>;

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">{isEdit ? "Edit Invoice" : "New Invoice"}</h2>
        <Button variant="ghost" size="sm" onClick={onCancel || (() => history.back())}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
      </div>

      {/* Patient */}
      <Card>
        <CardHeader><CardTitle className="text-base">Patient</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {patientId && !useNewPatient ? (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="font-medium">{patientLabel || "Selected patient"}</span>
              <Button size="sm" variant="ghost" onClick={() => { setPatientId(null); setPatientLabel(""); setPatientTerm(""); }}>Change</Button>
            </div>
          ) : useNewPatient ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Name *</Label><Input value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Age</Label><Input type="number" value={newPatient.age} onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={newPatient.gender || "none"} onValueChange={(v) => setNewPatient({ ...newPatient, gender: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setUseNewPatient(false)}>Search existing patient instead</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input value={patientTerm} onChange={(e) => setPatientTerm(e.target.value)} placeholder="Search patient by name or phone (min 2 chars)…" className="border-0 px-0 shadow-none focus-visible:ring-0" />
              </div>
              {patientHits.length > 0 && (
                <div className="rounded-lg border">
                  {patientHits.map((p: any) => (
                    <Button variant="ghost"
                      key={p.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => { setPatientId(p.id); setPatientLabel(`${p.name}${p.phone ? " · " + p.phone : ""}`); setPatientTerm(""); }}
                    >
                      <span>{p.name}</span><span className="text-xs text-muted-foreground">{p.phone}</span>
                    </Button>
                  ))}
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => setUseNewPatient(true)}><UserPlus className="mr-1 h-4 w-4" /> New patient</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral */}
      <Card>
        <CardHeader><CardTitle className="text-base">Referral source</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Input aria-label="Search referrers" className="w-full sm:w-56" placeholder="Search referrers" value={refTerm} onChange={(e) => setRefTerm(e.target.value)} />
          <Select value={referrerId || "walkin"} onValueChange={(v) => setReferrerId(v === "walkin" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="walkin">Walk-in</SelectItem>
              {(referrers as Referrer[]).filter((r) => (r.is_active || r.id === referrerId) && (r.id === referrerId || r.name.toLowerCase().includes(refTerm.toLowerCase()))).map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name} ({r.type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setQuickRefOpen(true)}><Plus className="mr-1 h-4 w-4" /> Quick add referrer</Button>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader><CardTitle className="text-base">Tests, profiles & packages</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input value={itemTerm} onChange={(e) => setItemTerm(e.target.value)} placeholder="Search catalogue (e.g. CBC, ultrasound)…" className="border-0 px-0 shadow-none focus-visible:ring-0" />
          </div>
          {results.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-lg border">
              {results.map((r, i) => (
                <Button variant="ghost"
                  key={`${r.item_type}-${r.item_id}-${i}`}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => addItem(r)}
                >
                  <span>{r.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{ITEM_TYPE_LABEL[r.item_type]}</span>
                    <span className="font-medium">{inr(r.price)}</span>
                  </span>
                </Button>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{ITEM_TYPE_LABEL[it.item_type]} · {inr(it.price)} each</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button aria-label="Change quantity" size="icon" variant="ghost" onClick={() => setItems(items.map((x, xi) => xi === i ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}>−</Button>
                    <span className="w-6 text-center text-sm">{it.quantity}</span>
                    <Button aria-label="Change quantity" size="icon" variant="ghost" onClick={() => setItems(items.map((x, xi) => xi === i ? { ...x, quantity: x.quantity + 1 } : x))}>+</Button>
                  </div>
                  <div className="w-20 text-right text-sm font-semibold">{inr(Number(it.price) * it.quantity)}</div>
                  <Button size="icon" variant="ghost" aria-label="Remove item" onClick={() => setItems(items.filter((_, xi) => xi !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals & notes */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Discount (₹)</Label><Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></div>
          </div>
          <div className="flex justify-end gap-6 border-t pt-3 text-sm">
            <div>Subtotal: <span className="font-semibold">{inr(subtotal)}</span></div>
            <div>Total: <span className="text-lg font-bold text-primary">{inr(total)}</span></div>
          </div>
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Saving…" : isEdit ? "Save changes" : "Create invoice"}</Button>
        </CardContent>
      </Card>

      <QuickReferrerDialog
        open={quickRefOpen}
        onClose={() => setQuickRefOpen(false)}
        onCreated={(r) => { setReferrerId(r.id); setQuickRefOpen(false); }}
      />
    </div>
  );
}

function QuickReferrerDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (r: Referrer) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", type: "doctor", phone: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setForm({ name: "", type: "doctor", phone: "" }); }, [open]);

  async function save() {
    if (!form.name.trim()) return toast.error("Name required");
    setBusy(true);
    const { data, error } = await supabase.from("referrers").insert({
      name: form.name.trim(), type: form.type, phone: form.phone.trim() || null, is_active: true,
    }).select("*").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["billing-referrers"] });
    onCreated(data as Referrer);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Quick add referrer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["doctor", "clinic", "hospital", "organization", "other"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? "Saving…" : "Add referrer"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
