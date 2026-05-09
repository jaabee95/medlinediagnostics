
-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'editor');
create type public.package_item_type as enum ('test', 'profile');

-- ============ HELPER ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  must_change_password boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin');
$$;

-- ============ DIAGNOSTIC PROFILE ============
create table public.diagnostic_profile (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  address text,
  phone text,
  whatsapp text,
  email text,
  logo_url text,
  map_url text,
  map_lat numeric,
  map_lng numeric,
  entity_type text,
  registration_no text,
  nabl_status text,
  nabl_reg_no text,
  nabl_valid_until date,
  about_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_dp_updated before update on public.diagnostic_profile
  for each row execute function public.set_updated_at();

-- ============ SLIDES ============
create table public.slides (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  heading text,
  subtext text,
  link_url text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_slides_updated before update on public.slides
  for each row execute function public.set_updated_at();

-- ============ SERVICES HIERARCHY ============
create table public.main_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  icon text,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_mg_updated before update on public.main_groups
  for each row execute function public.set_updated_at();

create table public.sub_groups (
  id uuid primary key default gen_random_uuid(),
  main_group_id uuid not null references public.main_groups(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(main_group_id, slug)
);
create trigger trg_sg_updated before update on public.sub_groups
  for each row execute function public.set_updated_at();

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  sub_group_id uuid not null references public.sub_groups(id) on delete cascade,
  code text,
  name text not null,
  description text,
  sample_required text,
  tat text,
  reference_range text,
  price numeric(10,2),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_tests_updated before update on public.tests
  for each row execute function public.set_updated_at();

create table public.test_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_tp_updated before update on public.test_profiles
  for each row execute function public.set_updated_at();

create table public.test_profile_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.test_profiles(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  unique(profile_id, test_id)
);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2),
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_pkg_updated before update on public.packages
  for each row execute function public.set_updated_at();

create table public.package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  item_type public.package_item_type not null,
  item_id uuid not null
);

-- ============ DOCTORS ============
create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  reg_no text,
  qualification text,
  specialization text,
  photo_url text,
  description text,
  show_on_home boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_doc_updated before update on public.doctors
  for each row execute function public.set_updated_at();

-- ============ ENQUIRIES ============
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.diagnostic_profile enable row level security;
alter table public.slides enable row level security;
alter table public.main_groups enable row level security;
alter table public.sub_groups enable row level security;
alter table public.tests enable row level security;
alter table public.test_profiles enable row level security;
alter table public.test_profile_items enable row level security;
alter table public.packages enable row level security;
alter table public.package_items enable row level security;
alter table public.doctors enable row level security;
alter table public.enquiries enable row level security;

-- profiles: user can view/update own; admins all
create policy "profiles_self_select" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id or public.is_admin());
create policy "profiles_admin_insert" on public.profiles for insert with check (public.is_admin() or auth.uid() = id);
create policy "profiles_admin_delete" on public.profiles for delete using (public.is_admin());

-- user_roles: only admins read/write
create policy "roles_admin_all" on public.user_roles for all using (public.is_admin()) with check (public.is_admin());
create policy "roles_self_read" on public.user_roles for select using (user_id = auth.uid());

-- helper macro: public read where active, admin write
-- diagnostic_profile (single record, public read all)
create policy "dp_public_read" on public.diagnostic_profile for select using (true);
create policy "dp_admin_write" on public.diagnostic_profile for all using (public.is_admin()) with check (public.is_admin());

-- slides
create policy "slides_public_read" on public.slides for select using (is_active or public.is_admin());
create policy "slides_admin_write" on public.slides for all using (public.is_admin()) with check (public.is_admin());

-- main_groups
create policy "mg_public_read" on public.main_groups for select using (is_active or public.is_admin());
create policy "mg_admin_write" on public.main_groups for all using (public.is_admin()) with check (public.is_admin());

-- sub_groups
create policy "sg_public_read" on public.sub_groups for select using (is_active or public.is_admin());
create policy "sg_admin_write" on public.sub_groups for all using (public.is_admin()) with check (public.is_admin());

-- tests
create policy "tests_public_read" on public.tests for select using (is_active or public.is_admin());
create policy "tests_admin_write" on public.tests for all using (public.is_admin()) with check (public.is_admin());

-- test_profiles
create policy "tp_public_read" on public.test_profiles for select using (is_active or public.is_admin());
create policy "tp_admin_write" on public.test_profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "tpi_public_read" on public.test_profile_items for select using (true);
create policy "tpi_admin_write" on public.test_profile_items for all using (public.is_admin()) with check (public.is_admin());

-- packages
create policy "pkg_public_read" on public.packages for select using (is_visible or public.is_admin());
create policy "pkg_admin_write" on public.packages for all using (public.is_admin()) with check (public.is_admin());

create policy "pi_public_read" on public.package_items for select using (true);
create policy "pi_admin_write" on public.package_items for all using (public.is_admin()) with check (public.is_admin());

-- doctors
create policy "doc_public_read" on public.doctors for select using (is_active or public.is_admin());
create policy "doc_admin_write" on public.doctors for all using (public.is_admin()) with check (public.is_admin());

-- enquiries: anyone can insert, only admins can read/update/delete
create policy "enq_public_insert" on public.enquiries for insert with check (true);
create policy "enq_admin_read" on public.enquiries for select using (public.is_admin());
create policy "enq_admin_update" on public.enquiries for update using (public.is_admin());
create policy "enq_admin_delete" on public.enquiries for delete using (public.is_admin());

-- ============ TRIGGER for new auth user -> profiles row ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ STORAGE BUCKET ============
insert into storage.buckets (id, name, public)
values ('public-media', 'public-media', true)
on conflict (id) do nothing;

create policy "public-media public read" on storage.objects
  for select using (bucket_id = 'public-media');
create policy "public-media admin write" on storage.objects
  for insert with check (bucket_id = 'public-media' and public.is_admin());
create policy "public-media admin update" on storage.objects
  for update using (bucket_id = 'public-media' and public.is_admin());
create policy "public-media admin delete" on storage.objects
  for delete using (bucket_id = 'public-media' and public.is_admin());
