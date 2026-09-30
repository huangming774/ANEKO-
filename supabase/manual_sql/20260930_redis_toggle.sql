-- 后台设置页「启用 Redis 缓存」开关（默认关闭）
-- 配合 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 环境变量使用；
-- 未配置环境变量时开关无效（自动降级为直连数据库）。

alter table public.site_settings
  add column if not exists redis_enabled boolean not null default false;
