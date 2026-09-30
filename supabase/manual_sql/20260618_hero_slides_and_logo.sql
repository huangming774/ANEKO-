alter table public.site_settings
  add column if not exists logo_url text not null default '';

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image text not null default '',
  href text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists hero_slides_set_updated_at on public.hero_slides;
create trigger hero_slides_set_updated_at
before update on public.hero_slides
for each row execute function public.set_updated_at();

alter table public.hero_slides enable row level security;

drop policy if exists "hero_slides_public_read" on public.hero_slides;
create policy "hero_slides_public_read" on public.hero_slides
for select using (is_active = true or public.is_admin());

drop policy if exists "hero_slides_admin_all" on public.hero_slides;
create policy "hero_slides_admin_all" on public.hero_slides
for all using (public.is_admin()) with check (public.is_admin());

grant select on public.hero_slides to anon, authenticated;
grant select, insert, update, delete on public.hero_slides to authenticated;
