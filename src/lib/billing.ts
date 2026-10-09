import type { DiagnosticProfile } from "@/lib/site";
import { formatAddressLines } from "@/lib/site";

export type Referrer = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Patient = {
  id: string;
  name: string;
  phone: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  default_referrer_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  invoice_no: string;
  patient_id: string;
  referrer_id: string | null;
  status: "draft" | "issued" | "cancelled";
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItem = {
  id: string;
  invoice_id: string;
  item_type: "test" | "test_profile" | "package";
  item_id: string | null;
  name: string;
  price: number;
  quantity: number;
  line_total: number;
};

export type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  method: "cash" | "upi" | "card" | "insurance" | "other";
  paid_at: string;
  received_by: string | null;
  notes: string | null;
  created_at: string;
};

export const ITEM_TYPE_LABEL: Record<string, string> = {
  test: "Test",
  test_profile: "Profile",
  package: "Package",
};

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
] as const;

export function inr(v: number | string | null | undefined): string {
  const n = Number(v || 0);
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function paidAmount(invoiceId: string, payments: { invoice_id: string; amount: number }[]): number {
  return payments
    .filter((p) => p.invoice_id === invoiceId)
    .reduce((s, p) => s + Number(p.amount || 0), 0);
}

export function balanceOf(invoice: Invoice, payments: { invoice_id: string; amount: number }[]): number {
  return Math.max(0, Number(invoice.total || 0) - paidAmount(invoice.id, payments));
}

export type PayStatus = "unpaid" | "partial" | "paid" | "cancelled";

export function payStatus(invoice: Invoice, payments: { invoice_id: string; amount: number }[]): PayStatus {
  if (invoice.status === "cancelled") return "cancelled";
  const paid = paidAmount(invoice.id, payments);
  if (Number(invoice.total || 0) > 0 && paid >= Number(invoice.total)) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}

export const PAY_STATUS_LABEL: Record<PayStatus, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
  cancelled: "Cancelled",
};

/** Print stylesheet string for a chosen paper size. */
export function printCss(paper: "A4" | "A5"): string {
  return `@page { size: ${paper}; margin: ${paper === "A4" ? "12mm" : "8mm"}; }`;
}

export function letterheadLines(dp: Partial<DiagnosticProfile> | null): string[] {
  if (!dp) return [];
  return formatAddressLines(dp);
}
