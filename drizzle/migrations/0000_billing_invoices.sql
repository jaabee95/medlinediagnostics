CREATE TABLE public.referrers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'other',
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  age integer,
  gender text,
  address text,
  default_referrer_id uuid references public.referrers(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_patients_phone ON public.patients (phone);

CREATE TABLE public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  patient_id uuid not null references public.patients(id),
  referrer_id uuid references public.referrers(id) on delete set null,
  status text not null default 'draft',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
CREATE INDEX idx_invoices_patient ON public.invoices (patient_id);
CREATE INDEX idx_invoices_referrer ON public.invoices (referrer_id);
CREATE INDEX idx_invoices_created ON public.invoices (created_at);

CREATE TABLE public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  item_type text not null,
  item_id uuid,
  name text not null,
  price numeric(12,2) not null default 0,
  quantity integer not null default 1,
  line_total numeric(12,2) not null default 0
);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items (invoice_id);

CREATE TABLE public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  method text not null default 'cash',
  paid_at timestamptz not null default now(),
  received_by uuid,
  notes text,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_payments_invoice ON public.payments (invoice_id);

CREATE SEQUENCE public.invoice_no_seq START 1;

CREATE OR REPLACE FUNCTION public.next_invoice_no()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'MED-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_no_seq')::text, 4, '0');
$$;

CREATE OR REPLACE FUNCTION public.can_access_billing(_need_edit boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR public.has_page_permission(auth.uid(), 'billing', _need_edit);
$$;

CREATE OR REPLACE FUNCTION public.can_access_referrers(_need_edit boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin() OR public.has_page_permission(auth.uid(), 'referrers', _need_edit);
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.referrers TO service_role;
GRANT ALL ON public.patients TO service_role;
GRANT ALL ON public.invoices TO service_role;
GRANT ALL ON public.invoice_items TO service_role;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.referrers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ref_select ON public.referrers FOR SELECT TO public USING (public.can_access_referrers(false));
CREATE POLICY ref_insert ON public.referrers FOR INSERT TO public WITH CHECK (public.can_access_referrers(true));
CREATE POLICY ref_update ON public.referrers FOR UPDATE TO public USING (public.can_access_referrers(true)) WITH CHECK (public.can_access_referrers(true));
CREATE POLICY ref_delete ON public.referrers FOR DELETE TO public USING (public.can_access_referrers(true));

CREATE POLICY pat_select ON public.patients FOR SELECT TO public USING (public.can_access_billing(false));
CREATE POLICY pat_insert ON public.patients FOR INSERT TO public WITH CHECK (public.can_access_billing(true));
CREATE POLICY pat_update ON public.patients FOR UPDATE TO public USING (public.can_access_billing(true)) WITH CHECK (public.can_access_billing(true));
CREATE POLICY pat_delete ON public.patients FOR DELETE TO public USING (public.can_access_billing(true));

CREATE POLICY inv_select ON public.invoices FOR SELECT TO public USING (public.can_access_billing(false));
CREATE POLICY inv_insert ON public.invoices FOR INSERT TO public WITH CHECK (public.can_access_billing(true));
CREATE POLICY inv_update ON public.invoices FOR UPDATE TO public USING (public.can_access_billing(true)) WITH CHECK (public.can_access_billing(true));
CREATE POLICY inv_delete ON public.invoices FOR DELETE TO public USING (public.can_access_billing(true));

CREATE POLICY ii_select ON public.invoice_items FOR SELECT TO public USING (public.can_access_billing(false));
CREATE POLICY ii_insert ON public.invoice_items FOR INSERT TO public WITH CHECK (public.can_access_billing(true));
CREATE POLICY ii_update ON public.invoice_items FOR UPDATE TO public USING (public.can_access_billing(true)) WITH CHECK (public.can_access_billing(true));
CREATE POLICY ii_delete ON public.invoice_items FOR DELETE TO public USING (public.can_access_billing(true));

CREATE POLICY pay_select ON public.payments FOR SELECT TO public USING (public.can_access_billing(false));
CREATE POLICY pay_insert ON public.payments FOR INSERT TO public WITH CHECK (public.can_access_billing(true));
CREATE POLICY pay_update ON public.payments FOR UPDATE TO public USING (public.can_access_billing(true)) WITH CHECK (public.can_access_billing(true));
CREATE POLICY pay_delete ON public.payments FOR DELETE TO public USING (public.can_access_billing(true));

CREATE TRIGGER trg_ref_updated BEFORE UPDATE ON public.referrers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_pat_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_inv_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
