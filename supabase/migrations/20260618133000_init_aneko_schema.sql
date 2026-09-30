create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  avatar text not null default '🐱',
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  image text not null default '',
  author_id uuid references public.profiles(id) on delete set null,
  category text not null default '公告' check (category in ('公告', '活动', '分享', '通知')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  pinned boolean not null default false,
  views integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  image text not null default '',
  start_date date not null,
  end_date date not null,
  start_time time not null,
  end_time time not null,
  location text not null default '',
  type text not null check (type in ('screening', 'cosplay', 'exhibition', 'lecture', 'workshop', 'competition')),
  status text not null default 'upcoming' check (status in ('upcoming', 'ongoing', 'ended')),
  max_participants integer not null default 0,
  current_participants integer not null default 0,
  organizer text not null default '',
  tags text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.event_applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  phone text not null default '',
  qq text not null default '',
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  story text not null default '',
  image text not null default '',
  category text not null check (category in ('illustration', 'photography', 'cosplay', 'video', 'craft')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  author_id uuid references public.profiles(id) on delete set null,
  likes integer not null default 0,
  comments integer not null default 0,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_likes (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (work_id, user_id)
);

create table if not exists public.join_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  student_id text not null,
  grade text not null,
  major text not null default '',
  phone text not null,
  qq text not null,
  departments text[] not null default '{}',
  intro text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  club_name text not null default 'ANEKO动漫社',
  club_description text not null default '',
  logo_url text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  site_title text not null default 'ANEKO动漫社',
  site_description text not null default 'ANEKO动漫社官方网站',
  announcement_banner boolean not null default true,
  open_registration boolean not null default true,
  email_notification boolean not null default true,
  new_member_notification boolean not null default true,
  new_work_notification boolean not null default true,
  activity_reminder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

insert into public.site_settings (id)
values (true)
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.protect_profile_role_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
    and not public.is_admin()
    and (new.role is distinct from old.role or new.status is distinct from old.status)
  then
    raise exception 'Only admins can change profile role or status';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role_status on public.profiles;
create trigger profiles_protect_role_status
before update on public.profiles
for each row execute function public.protect_profile_role_status();

create or replace function public.bump_event_registration_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.events
    set current_participants = current_participants + 1
    where id = new.event_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.events
    set current_participants = greatest(current_participants - 1, 0)
    where id = old.event_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_event_registration_insert on public.event_registrations;
create trigger on_event_registration_insert
after insert on public.event_registrations
for each row execute function public.bump_event_registration_count();

drop trigger if exists on_event_registration_delete on public.event_registrations;
create trigger on_event_registration_delete
after delete on public.event_registrations
for each row execute function public.bump_event_registration_count();

create or replace function public.bump_work_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.works
    set likes = likes + 1
    where id = new.work_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.works
    set likes = greatest(likes - 1, 0)
    where id = old.work_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_work_like_insert on public.work_likes;
create trigger on_work_like_insert
after insert on public.work_likes
for each row execute function public.bump_work_like_count();

drop trigger if exists on_work_like_delete on public.work_likes;
create trigger on_work_like_delete
after delete on public.work_likes
for each row execute function public.bump_work_like_count();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts for each row execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();

drop trigger if exists works_set_updated_at on public.works;
create trigger works_set_updated_at before update on public.works for each row execute function public.set_updated_at();

drop trigger if exists join_applications_set_updated_at on public.join_applications;
create trigger join_applications_set_updated_at before update on public.join_applications for each row execute function public.set_updated_at();

drop trigger if exists event_applications_set_updated_at on public.event_applications;
create trigger event_applications_set_updated_at before update on public.event_applications for each row execute function public.set_updated_at();

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

drop trigger if exists hero_slides_set_updated_at on public.hero_slides;
create trigger hero_slides_set_updated_at before update on public.hero_slides for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_applications enable row level security;
alter table public.works enable row level security;
alter table public.work_likes enable row level security;
alter table public.join_applications enable row level security;
alter table public.site_settings enable row level security;
alter table public.hero_slides enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists "posts_public_read" on public.posts;
create policy "posts_public_read" on public.posts for select using (status = 'published' or public.is_admin());

drop policy if exists "posts_admin_all" on public.posts;
create policy "posts_admin_all" on public.posts for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events for select using (true);

drop policy if exists "events_admin_all" on public.events;
create policy "events_admin_all" on public.events for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "event_registrations_own_read" on public.event_registrations;
create policy "event_registrations_own_read" on public.event_registrations for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "event_registrations_insert_own" on public.event_registrations;
create policy "event_registrations_insert_own" on public.event_registrations for insert with check (user_id = auth.uid());

drop policy if exists "event_registrations_delete_own_or_admin" on public.event_registrations;
create policy "event_registrations_delete_own_or_admin" on public.event_registrations for delete using (user_id = auth.uid() or public.is_admin());

drop policy if exists "event_applications_insert_public" on public.event_applications;
create policy "event_applications_insert_public" on public.event_applications
for insert
to anon, authenticated
with check (true);

drop policy if exists "event_applications_admin_read" on public.event_applications;
create policy "event_applications_admin_read" on public.event_applications for select using (public.is_admin());

drop policy if exists "event_applications_admin_update" on public.event_applications;
create policy "event_applications_admin_update" on public.event_applications for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "works_public_read" on public.works;
create policy "works_public_read" on public.works for select using (status = 'approved' or author_id = auth.uid() or public.is_admin());

drop policy if exists "works_insert_own" on public.works;
create policy "works_insert_own" on public.works for insert with check (author_id = auth.uid());

drop policy if exists "works_update_own_pending_or_admin" on public.works;
create policy "works_update_own_pending_or_admin" on public.works for update using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());

drop policy if exists "works_delete_own_or_admin" on public.works;
create policy "works_delete_own_or_admin" on public.works for delete using (author_id = auth.uid() or public.is_admin());

drop policy if exists "work_likes_own_read" on public.work_likes;
create policy "work_likes_own_read" on public.work_likes for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "work_likes_insert_own" on public.work_likes;
create policy "work_likes_insert_own" on public.work_likes for insert with check (user_id = auth.uid());

drop policy if exists "work_likes_delete_own" on public.work_likes;
create policy "work_likes_delete_own" on public.work_likes for delete using (user_id = auth.uid());

drop policy if exists "join_applications_insert_public" on public.join_applications;
create policy "join_applications_insert_public" on public.join_applications
for insert
to anon, authenticated
with check (true);

drop policy if exists "join_applications_admin_read" on public.join_applications;
create policy "join_applications_admin_read" on public.join_applications for select using (public.is_admin());

drop policy if exists "join_applications_admin_update" on public.join_applications;
create policy "join_applications_admin_update" on public.join_applications for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "join_applications_admin_delete" on public.join_applications;
create policy "join_applications_admin_delete" on public.join_applications for delete using (public.is_admin());

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings for select using (true);

drop policy if exists "site_settings_admin_update" on public.site_settings;
create policy "site_settings_admin_update" on public.site_settings for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "hero_slides_public_read" on public.hero_slides;
create policy "hero_slides_public_read" on public.hero_slides for select using (is_active = true or public.is_admin());

drop policy if exists "hero_slides_admin_all" on public.hero_slides;
create policy "hero_slides_admin_all" on public.hero_slides for all using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.posts, public.events, public.works, public.site_settings, public.hero_slides to anon, authenticated;
grant insert on public.join_applications to anon, authenticated;
grant insert on public.event_applications to anon, authenticated;
grant select, insert, update, delete on public.posts, public.events, public.works, public.work_likes, public.event_registrations, public.event_applications, public.join_applications, public.site_settings, public.hero_slides to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- After the first user registers, promote them once in Supabase SQL Editor:
-- update public.profiles set role = 'admin' where email = 'your-email@example.com';
