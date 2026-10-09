# Billing & Invoices (Phase 2, Module 1)

Staff-only billing inside the admin panel. Admin/staff create invoices by pulling tests, profiles, and packages from the existing catalogue, record payments collected at the counter (Cash / UPI / Card / Insurance), and track credit given to referrers (CRM-style). No online payment collection, no GST lines. Not exposed to the public site.

## Database (1 migration)

New tables, all with RLS + GRANTs in the same migration:

- `referrers` — external people/organizations who send patients: name, type (doctor / clinic / hospital / organization / other), phone, email, address, notes, is_active. CRM list for credit tracking.
- `patients` — name, phone (unique for lookup), age, gender, address, default_referrer_id (nullable), notes. Reused across invoices; matched by phone on quick-add.
- `invoices` — invoice_no (auto: `MED-YYYY-NNNN` via Postgres sequence + function), patient_id, referrer_id (null = walk-in), status (draft / issued / cancelled), discount amount, subtotal, total, notes, created_by (uuid, no FK to auth.users), created_at/updated_at.
- `invoice_items` — invoice_id, item_type (test / test_profile / package), item_id, name + price snapshot (copied at invoice time so later catalogue edits don't change old invoices), quantity, line_total.
- `payments` — invoice_id, amount, method (cash / upi / card / insurance / other), paid_at, received_by (uuid), notes.

`patients.default_referrer_id` and `invoices.referrer_id` reference `public.referrers(id)`; `invoice_items`/`payments` reference their invoice with ON DELETE CASCADE.

RLS: billing pages are gated by the existing permission system. Policies use
`is_admin() OR has_page_permission(auth.uid(), 'billing', <true for writes, false for reads>)` — so admins see everything, and staff only get in when the admin grants them the Billing page in Users → Permissions. Same pattern for all five tables (referrers/patients need the same gate). Explicit GRANTs to authenticated + service_role included.

## Admin pages (3 new routes + nav)

1. **`/admin/billing`** — invoice list: search by invoice no / patient name / phone, filter by status and date range, columns for patient, referrer, total, paid, balance, status. "New Invoice" button.
2. **`/admin/billing/new` (+ edit)** — invoice editor:
   - Patient: search existing by phone/name, or quick-create inline.
   - Referral: "Walk-in" by default, or pick a referrer (searchable), or quick-create one — every invoice maps a referral source.
   - Items: searchable picker pulling live from `tests`, `test_profiles`, and `packages`; add rows, edit qty, line totals auto.
   - Discount, running subtotal/total, save → status "issued".
3. **`/admin/billing/:id`** — invoice detail: items, totals, payment history, "Record Payment" (amount, method, notes), payment list, Cancel invoice, and **Print** with paper-size choice (A4 / A5) in a clean letterhead layout (clinic name, logo, address, phone from Diagnostic Profile) via a print stylesheet.

4. **Referrers CRM — `/admin/referrers`** — list of referrers with outstanding credit (sum of unpaid invoice balances per referrer), add/edit/ deactivate. This is how "credit now, collect later" stays visible.

## Permissions & nav

- Add `billing` and `referrers` keys to `ADMIN_PAGES` in `src/lib/permissions.ts` (paths `/admin/billing`, `/admin/referrers`). Admins get them automatically; admin can grant view/edit per staff user in the existing Users module. All billing routes check `can(page)` and hide if unauthorized.
- AdminShell sidebar picks these up automatically.

## Small extras

- Dashboard (`/admin`) gains a billing summary card: today's invoices, today's collections, total outstanding (only if the signed-in user can view billing).
- Save the billing rules (staff-only, record-payments-only, no GST, referral model, A4/A5 print) to project memory so future modules follow them.

## Files

- `supabase/migrations/<new>` — tables, grants, RLS, invoice-number function
- `src/routes/admin.billing.tsx`, `src/routes/admin.billing-new.tsx` (or dialog), `src/routes/admin.billing-id.tsx` (detail + print), `src/routes/admin.referrers.tsx`
- `src/lib/permissions.ts` — new page keys
- `src/routes/admin.index.tsx` — billing summary card
- `src/lib/billing.ts` — shared types/helpers (formatting, balance calc)

## Out of scope (later phases)

Online payment links, GST/tax lines, report generation module, public-facing billing.

## Risks

- Low. Entirely additive: new tables and new admin routes; no existing table or page changes except the nav/dashboard additions.
- Old invoices are protected from catalogue edits via name/price snapshots on `invoice_items`.
- Print layout uses the browser's print dialog — verified in preview via Chromium print emulation.
