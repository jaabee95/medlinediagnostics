ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cancelled_by uuid;
CREATE OR REPLACE FUNCTION public.can_access_billing(_need_edit boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active) AND (public.is_admin() OR public.has_page_permission(auth.uid(),'billing',_need_edit)); $$;
CREATE OR REPLACE FUNCTION public.can_access_referrers(_need_edit boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_active) AND (public.is_admin() OR public.has_page_permission(auth.uid(),'referrers',_need_edit) OR public.can_access_billing(_need_edit)); $$;
REVOKE ALL ON FUNCTION public.next_invoice_no() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_invoice_no() TO authenticated;
CREATE OR REPLACE FUNCTION public.save_billing_invoice(payload jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inv_id uuid; pat_id uuid; old_inv public.invoices; line jsonb; sub numeric:=0; disc numeric; paid numeric; qty integer; rate numeric; pname text; pphone text;
BEGIN
 IF NOT public.can_access_billing(true) THEN RAISE EXCEPTION 'Billing edit permission required'; END IF;
 IF jsonb_array_length(COALESCE(payload->'items','[]'::jsonb))=0 THEN RAISE EXCEPTION 'Add at least one item'; END IF;
 disc:=COALESCE((payload->>'discount')::numeric,0);
 IF disc<0 THEN RAISE EXCEPTION 'Discount cannot be negative'; END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(payload->'items') LOOP
 qty:=(line->>'quantity')::integer; rate:=(line->>'price')::numeric;
 IF qty IS NULL OR qty<1 OR rate IS NULL OR rate<0 OR COALESCE(line->>'name','')='' OR line->>'item_type' NOT IN ('test','test_profile','package') THEN RAISE EXCEPTION 'Invalid invoice item'; END IF;
 sub:=sub+round(rate*qty,2);
 END LOOP;
 IF disc>sub THEN RAISE EXCEPTION 'Discount exceeds subtotal'; END IF;
 inv_id:=NULLIF(payload->>'id','')::uuid;
 IF inv_id IS NOT NULL THEN
 SELECT * INTO old_inv FROM public.invoices WHERE id=inv_id FOR UPDATE;
 IF NOT FOUND OR old_inv.status='cancelled' THEN RAISE EXCEPTION 'Invoice unavailable or cancelled'; END IF;
 IF NOT (public.is_admin() OR public.has_page_permission(auth.uid(),'billing_modify',true)) THEN RAISE EXCEPTION 'Invoice modification permission required'; END IF;
 SELECT COALESCE(sum(amount),0) INTO paid FROM public.payments WHERE invoice_id=inv_id;
 IF sub-disc<paid THEN RAISE EXCEPTION 'Total cannot be less than payments already received'; END IF;
 END IF;
 pat_id:=NULLIF(payload->>'patient_id','')::uuid;
 IF pat_id IS NULL THEN
 pname:=trim(payload->'patient'->>'name'); pphone:=NULLIF(trim(payload->'patient'->>'phone'),'');
 IF COALESCE(pname,'')='' THEN RAISE EXCEPTION 'Patient name required'; END IF;
 IF pphone IS NOT NULL THEN SELECT id INTO pat_id FROM public.patients WHERE phone=pphone ORDER BY created_at LIMIT 1; END IF;
 IF pat_id IS NULL THEN INSERT INTO public.patients(name,phone,age,gender,default_referrer_id) VALUES(pname,pphone,NULLIF(payload->'patient'->>'age','')::integer,NULLIF(payload->'patient'->>'gender',''),NULLIF(payload->>'referrer_id','')::uuid) RETURNING id INTO pat_id; END IF;
 END IF;
 IF inv_id IS NULL THEN
 INSERT INTO public.invoices(invoice_no,patient_id,referrer_id,status,subtotal,discount,total,notes,created_by) VALUES(public.next_invoice_no(),pat_id,NULLIF(payload->>'referrer_id','')::uuid,'issued',sub,disc,sub-disc,NULLIF(payload->>'notes',''),auth.uid()) RETURNING id INTO inv_id;
 ELSE
 UPDATE public.invoices SET patient_id=pat_id,referrer_id=NULLIF(payload->>'referrer_id','')::uuid,subtotal=sub,discount=disc,total=sub-disc,notes=NULLIF(payload->>'notes','') WHERE id=inv_id;
 DELETE FROM public.invoice_items WHERE invoice_id=inv_id;
 END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(payload->'items') LOOP
 INSERT INTO public.invoice_items(invoice_id,item_type,item_id,name,price,quantity,line_total) VALUES(inv_id,line->>'item_type',NULLIF(line->>'item_id','')::uuid,line->>'name',(line->>'price')::numeric,(line->>'quantity')::integer,round((line->>'price')::numeric*(line->>'quantity')::integer,2));
 END LOOP;
 RETURN inv_id;
END; $$;
CREATE OR REPLACE FUNCTION public.record_billing_payment(_invoice_id uuid,_amount numeric,_method text,_notes text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inv public.invoices; paid numeric; result uuid;
BEGIN
 IF NOT public.can_access_billing(true) THEN RAISE EXCEPTION 'Billing edit permission required'; END IF;
 SELECT * INTO inv FROM public.invoices WHERE id=_invoice_id FOR UPDATE;
 IF NOT FOUND OR inv.status<>'issued' THEN RAISE EXCEPTION 'Invoice unavailable or cancelled'; END IF;
 SELECT COALESCE(sum(amount),0) INTO paid FROM public.payments WHERE invoice_id=_invoice_id;
 IF _amount IS NULL OR _amount<=0 OR _amount>inv.total-paid THEN RAISE EXCEPTION 'Payment must be positive and not exceed balance'; END IF;
 IF _method NOT IN ('cash','upi','card','insurance','other') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
 INSERT INTO public.payments(invoice_id,amount,method,received_by,notes) VALUES(_invoice_id,_amount,_method,auth.uid(),_notes) RETURNING id INTO result;
 RETURN result;
END; $$;
CREATE OR REPLACE FUNCTION public.cancel_billing_invoice(_invoice_id uuid,_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.can_access_billing(true) OR NOT (public.is_admin() OR public.has_page_permission(auth.uid(),'billing_cancel',true)) THEN RAISE EXCEPTION 'Invoice cancellation permission required'; END IF;
 IF char_length(trim(COALESCE(_reason,'')))<3 THEN RAISE EXCEPTION 'Cancellation reason required'; END IF;
 UPDATE public.invoices SET status='cancelled',cancellation_reason=trim(_reason),cancelled_by=auth.uid() WHERE id=_invoice_id AND status<>'cancelled';
 IF NOT FOUND THEN RAISE EXCEPTION 'Invoice unavailable or already cancelled'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.save_billing_invoice(jsonb),public.record_billing_payment(uuid,numeric,text,text),public.cancel_billing_invoice(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_billing_invoice(jsonb),public.record_billing_payment(uuid,numeric,text,text),public.cancel_billing_invoice(uuid,text) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.invoices,public.invoice_items,public.payments FROM authenticated;
COMMENT ON FUNCTION public.save_billing_invoice(jsonb) IS 'Atomic invoice and patient save with explicit billing and modification privileges; historical item snapshots persist.';