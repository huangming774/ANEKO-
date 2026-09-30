create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  cover text not null default '',
  source_type text not null check (source_type in ('upload', 'bilibili')),
  source_url text not null default '',
  r2_key text not null default '',
  bilibili_bvid text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at
before update on public.videos
for each row execute function public.set_updated_at();

alter table public.videos enable row level security;

drop policy if exists "videos_public_read" on public.videos;
create policy "videos_public_read" on public.videos
for select using (is_active = true or public.is_admin());

drop policy if exists "videos_admin_all" on public.videos;
create policy "videos_admin_all" on public.videos
for all using (public.is_admin()) with check (public.is_admin());

grant select on public.videos to anon, authenticated;
grant select, insert, update, delete on public.videos to authenticated;
