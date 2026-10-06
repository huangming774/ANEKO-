-- AI 问答：联网搜索参数透传 + 思考强度（按模型可配置）
-- search_params   用户在前台开启「联网」时合并进上游请求体的 JSON（如 {"web_search": true}）；null = 不支持联网
-- reasoning_style 思考强度参数风格：'reasoning_effort'（OpenAI/DeepSeek/多数聚合）|
--                 'thinking_budget'（通义 enable_thinking + thinking_budget）|
--                 'thinking_claude'（Claude thinking.budget_tokens）；null = 不支持思考强度
-- 在 Supabase SQL Editor 手工执行本文件（与其余 manual_sql 一致）。

alter table public.ai_models
  add column if not exists search_params jsonb,
  add column if not exists reasoning_style text;
