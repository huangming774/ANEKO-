-- 后台设置页「开放入社报名」开关。关闭后隐藏前台报名表单，并阻止 API/RLS 写入。
alter table public.site_settings
  add column if not exists join_application_enabled boolean not null default true;

drop policy if exists "join_applications_insert_public" on public.join_applications;
create policy "join_applications_insert_public" on public.join_applications
for insert
to anon, authenticated
with check (exists (
  select 1
  from public.site_settings
  where id = true and join_application_enabled = true
));
