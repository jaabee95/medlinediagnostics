
-- 1) Enquiries: remarks + resolution metadata
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS remarks text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) Add 'staff' to app_role enum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'staff' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'staff';
  END IF;
END $$;

-- 3) Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message text NOT NULL,
  photo_url text,
  is_approved boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_public_read" ON public.reviews
  FOR SELECT USING (is_approved OR public.is_admin());

CREATE POLICY "reviews_public_insert" ON public.reviews
  FOR INSERT WITH CHECK (
    is_approved = false AND is_featured = false
    AND char_length(name) BETWEEN 1 AND 100
    AND char_length(message) BETWEEN 3 AND 2000
    AND rating BETWEEN 1 AND 5
  );

CREATE POLICY "reviews_admin_update" ON public.reviews
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "reviews_admin_delete" ON public.reviews
  FOR DELETE USING (public.is_admin());

CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Per-page user permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_key text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, page_key)
);

GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perms_self_read" ON public.user_permissions
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "perms_admin_write" ON public.user_permissions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_user_permissions_updated BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Helper to check page permission (admin always true)
CREATE OR REPLACE FUNCTION public.has_page_permission(_user_id uuid, _page text, _need_edit boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_id = _user_id
        AND page_key = _page
        AND (can_view OR (_need_edit AND can_edit))
        AND (NOT _need_edit OR can_edit)
    );
$$;
