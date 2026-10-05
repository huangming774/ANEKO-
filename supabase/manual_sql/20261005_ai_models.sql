-- AI 问答：多模型配置表（兼容 OpenAI API 格式的上游服务）
-- api_key 为服务端密钥：RLS 全部仅管理员（含 select），并 revoke anon，
-- 防止公开的 anon key 直接查出密钥；公开访问只经 /api/ai/models 的列投影。
-- 在 Supabase SQL Editor 手工执行本文件。

create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  api_base_url text not null,
  api_key text not null,
  model_id text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ai_models_set_updated_at on public.ai_models;
create trigger ai_models_set_updated_at
  before update on public.ai_models
  for each row execute function public.set_updated_at();

alter table public.ai_models enable row level security;

drop policy if exists "ai_models_admin_all" on public.ai_models;
create policy "ai_models_admin_all" on public.ai_models
  for all using (public.is_admin()) with check (public.is_admin());

revoke all on public.ai_models from anon;
grant select, insert, update, delete on public.ai_models to authenticated;
