alter table public.posts
  add column if not exists image text not null default '';

alter table public.posts
  drop constraint if exists posts_category_check;

alter table public.posts
  add constraint posts_category_check
  check (category in ('公告', '活动', '分享', '通知', '鍏憡', '娲诲姩', '鍒嗕韩', '閫氱煡'));
