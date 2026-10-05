-- 活动签到：限时定位打卡（checkin_activities 活动 + checkins 签到记录）
-- 两表 RLS 均仅管理员（含 select）并 revoke anon：坐标属位置隐私，
-- 匿名签到/公开读一律走 /api/checkin-activities/* 服务端（service role）显式列投影。
-- 在 Supabase SQL Editor 手工执行本文件。

create table if not exists public.checkin_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checkin_activities_window_ck check (ends_at > starts_at),
  constraint checkin_activities_title_ck check (char_length(btrim(title)) between 1 and 80)
);

drop trigger if exists checkin_activities_set_updated_at on public.checkin_activities;
create trigger checkin_activities_set_updated_at
  before update on public.checkin_activities
  for each row execute function public.set_updated_at();

-- 签到记录：一次签到一行，不可变（无 updated_at）
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.checkin_activities(id) on delete cascade,
  cn text not null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  created_at timestamptz not null default now(),
  constraint checkins_cn_ck check (char_length(btrim(cn)) between 1 and 32),
  constraint checkins_lat_ck check (latitude >= -90 and latitude <= 90),
  constraint checkins_lng_ck check (longitude >= -180 and longitude <= 180)
);

-- 同一活动同一 CN 只能签一次：大小写不敏感 + 去空白，防变体刷屏
create unique index if not exists checkins_activity_cn_uk
  on public.checkins (activity_id, lower(btrim(cn)));

create index if not exists checkins_activity_created_idx
  on public.checkins (activity_id, created_at desc);

alter table public.checkin_activities enable row level security;
alter table public.checkins enable row level security;

drop policy if exists "checkin_activities_admin_all" on public.checkin_activities;
create policy "checkin_activities_admin_all" on public.checkin_activities
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "checkins_admin_all" on public.checkins;
create policy "checkins_admin_all" on public.checkins
  for all using (public.is_admin()) with check (public.is_admin());

revoke all on public.checkin_activities from anon;
revoke all on public.checkins from anon;
grant select, insert, update, delete on public.checkin_activities to authenticated;
grant select, insert, update, delete on public.checkins to authenticated;
