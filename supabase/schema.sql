-- Run this in Supabase SQL editor

create table if not exists public.manga (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  alt_title text,
  description text not null,
  cover_url text,
  categories text[] not null default '{}',
  status text not null default 'ongoing',
  is_adult boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  manga_id uuid not null references public.manga(id) on delete cascade,
  chapter_number numeric(10,2) not null,
  title text not null,
  created_at timestamptz not null default now(),
  unique (manga_id, chapter_number)
);

create table if not exists public.chapter_pages (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  page_number int not null,
  image_url text not null,
  created_at timestamptz not null default now(),
  unique (chapter_id, page_number)
);

create table if not exists public.manga_detail_images (
  id uuid primary key default gen_random_uuid(),
  manga_id uuid not null references public.manga(id) on delete cascade,
  sort_order int not null,
  image_url text not null,
  created_at timestamptz not null default now(),
  unique (manga_id, sort_order)
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- ผู้อ่านสมัครผ่านเว็บ (/register) จะอยู่ใน auth.users เท่านั้น — ยังไม่ใช่แอดมิน
-- เพิ่มสิทธิ์แอดมิน (หลังผู้ใช้สมัครแล้ว) ใน SQL Editor:
--   select id, email from auth.users where email = 'ผู้ใช้@example.com';
--   insert into public.admin_users (user_id, email, role)
--   values ('<uuid จาก auth.users>', 'ผู้ใช้@example.com', 'admin')
--   on conflict (user_id) do update set role = excluded.role, email = excluded.email;

alter table public.manga enable row level security;
alter table public.chapters enable row level security;
alter table public.chapter_pages enable row level security;
alter table public.manga_detail_images enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "public read manga" on public.manga;
create policy "public read manga" on public.manga for select using (true);
drop policy if exists "public read chapters" on public.chapters;
create policy "public read chapters" on public.chapters for select using (true);
drop policy if exists "public read chapter_pages" on public.chapter_pages;
create policy "public read chapter_pages" on public.chapter_pages for select using (true);
drop policy if exists "public read manga_detail_images" on public.manga_detail_images;
create policy "public read manga_detail_images" on public.manga_detail_images for select using (true);
drop policy if exists "read own admin role" on public.admin_users;
create policy "read own admin role" on public.admin_users
for select using (auth.uid() = user_id);

drop policy if exists "auth write manga" on public.manga;
create policy "auth write manga" on public.manga
for all using (
  exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
);
drop policy if exists "auth write chapters" on public.chapters;
create policy "auth write chapters" on public.chapters
for all using (
  exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
);
drop policy if exists "auth write chapter_pages" on public.chapter_pages;
create policy "auth write chapter_pages" on public.chapter_pages
for all using (
  exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
);
drop policy if exists "auth write manga_detail_images" on public.manga_detail_images;
create policy "auth write manga_detail_images" on public.manga_detail_images
for all using (
  exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
);

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('chapters', 'chapters', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('manga-details', 'manga-details', true)
on conflict (id) do nothing;

drop policy if exists "public read covers" on storage.objects;
create policy "public read covers" on storage.objects
for select using (bucket_id = 'covers');

drop policy if exists "auth upload covers" on storage.objects;
create policy "auth upload covers" on storage.objects
for insert with check (
  bucket_id = 'covers' and exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
);

drop policy if exists "public read chapters bucket" on storage.objects;
create policy "public read chapters bucket" on storage.objects
for select using (bucket_id = 'chapters');

drop policy if exists "auth upload chapters" on storage.objects;
create policy "auth upload chapters" on storage.objects
for insert with check (
  bucket_id = 'chapters' and exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
);

drop policy if exists "public read manga-details bucket" on storage.objects;
create policy "public read manga-details bucket" on storage.objects
for select using (bucket_id = 'manga-details');

drop policy if exists "auth upload manga-details" on storage.objects;
create policy "auth upload manga-details" on storage.objects
for insert with check (
  bucket_id = 'manga-details' and exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
);

-- ข้อความบนหน้าเว็บ (แก้ได้จากแอดมิน)
create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "public read site_settings" on public.site_settings;
create policy "public read site_settings" on public.site_settings
for select using (true);

drop policy if exists "admin write site_settings" on public.site_settings;
create policy "admin write site_settings" on public.site_settings
for all using (
  exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'admin'
  )
);

insert into public.site_settings (key, value) values
  ('home_brand_title', 'YAKSHA'),
  ('home_tagline_primary', 'ยักษาแปร'),
  ('home_tagline_secondary', 'อัปเดตมังฮวา มังงะ นิยาย และการ์ตูน'),
  ('footer_disclaimer', 'เนื้อหาในเว็บไซต์นี้มีจุดประสงค์เพื่อความบันเทิง และอาจไม่เหมาะสมสำหรับเยาวชน ผู้ชมที่มีอายุต่ำกว่า 18 ปีควรได้รับคำแนะนำ'),
  ('footer_copyright', '© Yaksha ยักษาแปร')
on conflict (key) do nothing;

-- เรียงหน้าแรก: เรื่องที่เพิ่ม/อัปเดตล่าสุดอยู่บนสุด (อัปเดต updated_at เมื่อมีตอนใหม่หรือแก้ข้อมูลเรื่อง)
alter table public.manga add column if not exists updated_at timestamptz not null default now();

update public.manga m
set updated_at = greatest(
  m.created_at,
  coalesce((select max(c.created_at) from public.chapters c where c.manga_id = m.id), m.created_at)
);

create or replace function public.set_manga_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists manga_set_updated_at on public.manga;
create trigger manga_set_updated_at
  before update on public.manga
  for each row
  execute function public.set_manga_row_updated_at();

create or replace function public.bump_manga_updated_at_from_chapter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.manga set updated_at = now() where id = new.manga_id;
  return new;
end;
$$;

drop trigger if exists chapters_bump_manga_updated_at on public.chapters;
create trigger chapters_bump_manga_updated_at
  after insert or update on public.chapters
  for each row
  execute function public.bump_manga_updated_at_from_chapter();
