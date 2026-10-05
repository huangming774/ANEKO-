alter table public.posts
  add column if not exists image text not null default '';

alter table public.posts
  drop constraint if exists posts_category_check;

alter table public.posts
  add constraint posts_category_check
  -- 约束中的乱码取值（鍏憡/娲诲姩/鍒嗕韩/閫氱煡）是故意保留的，用于兼容历史上
  -- 被 GBK 误码写入的分类数据（与 src/app/api/posts 的 legacyCategory 映射对应）。
  -- 若未来清理乱码数据并收紧约束，需同步删除代码侧的 legacyCategory 与降级重试分支。
  check (category in ('公告', '活动', '分享', '通知', '鍏憡', '娲诲姩', '鍒嗕韩', '閫氱煡'));
