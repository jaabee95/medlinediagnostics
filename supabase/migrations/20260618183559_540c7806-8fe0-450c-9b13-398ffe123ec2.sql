
-- 1. Storage: drop broad SELECT on public-media to prevent listing.
-- Public CDN reads of individual files still work because the bucket is public.
DROP POLICY IF EXISTS "public-media file read" ON storage.objects;

-- 2. Revoke EXECUTE on trigger-only SECURITY DEFINER functions from client roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;

-- 3. Tighten the public enquiries INSERT policy: keep it public (contact form needs it)
--    but enforce basic length/shape validation instead of WITH CHECK (true).
DROP POLICY IF EXISTS enq_public_insert ON public.enquiries;
CREATE POLICY enq_public_insert ON public.enquiries
  FOR INSERT
  WITH CHECK (
    char_length(coalesce(name, '')) BETWEEN 1 AND 100
    AND char_length(coalesce(message, '')) BETWEEN 1 AND 2000
    AND (phone IS NULL OR char_length(phone) <= 32)
    AND (email IS NULL OR char_length(email) <= 200)
  );

-- 4. diagnostic_profile: dp_public_read USING (true) is intentional.
--    All columns (name, address, phone, email, map, NABL info, social) are
--    public business contact information shown on the website. No change.
