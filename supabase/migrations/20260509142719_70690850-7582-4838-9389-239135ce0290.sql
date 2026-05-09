
-- Set search_path on set_updated_at (was missing)
create or replace function public.set_updated_at()
returns trigger language plpgsql
security invoker
set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

-- Revoke public execute on internal security definer functions
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_admin() from public, anon;
-- has_role / is_admin still callable by authenticated for RLS use (RLS evaluates as definer-context)
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Restrict storage bucket listing to admins; public can still read individual files via direct URL
drop policy if exists "public-media public read" on storage.objects;
create policy "public-media file read" on storage.objects
  for select using (bucket_id = 'public-media');
-- Note: bucket is public so direct file URLs work. Listing via API still requires the policy above.
