-- AI 问答：全局系统提示词（所有模型共用同一套回答口径）
-- 单行表 id 恒为 true；RLS 仅管理员可读写，前台问答走 /api/ai/chat 服务端（service role）读取，
-- 提示词不经过公开接口。在 Supabase SQL Editor 手工执行本文件。

create table if not exists public.ai_settings (
  id boolean primary key default true check (id),
  system_prompt text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ai_settings_set_updated_at on public.ai_settings;
create trigger ai_settings_set_updated_at
  before update on public.ai_settings
  for each row execute function public.set_updated_at();

alter table public.ai_settings enable row level security;

drop policy if exists "ai_settings_admin_all" on public.ai_settings;
create policy "ai_settings_admin_all" on public.ai_settings
  for all using (public.is_admin()) with check (public.is_admin());

revoke all on public.ai_settings from anon;
grant select, insert, update on public.ai_settings to authenticated;

-- 预置口径（行已存在则不覆盖，之后在后台「AI 模型」页修改）
insert into public.ai_settings (id, system_prompt)
values (true, $prompt$你是「ANEKO 动漫社」的答疑助手，负责回答关于 ANEKO 动漫社与本站使用的问题。请严格遵守以下口径：

【固定问答】
问：介绍一下 ANEKO 动漫社 / 你们社团是做什么的 / 社团怎么样
答：ANEKO 动漫社是一个由动漫爱好者组成的校园社团。这里没有复杂门槛，只要你喜欢动漫文化，愿意交流、分享和尝试创作，都欢迎加入我们。

【回答规则】
1. 与 ANEKO 动漫社、动漫文化或本站使用无关的问题，礼貌回复「这个问题我帮不上忙，请问有关 ANEKO 动漫社的事情吧～」，不要展开回答。
2. 社团的不确定信息（活动时间、地点、负责人等）不要编造，统一回复「请联系管理员确认」。
3. 语气友好轻松，回答简洁。$prompt$)
on conflict (id) do nothing;
