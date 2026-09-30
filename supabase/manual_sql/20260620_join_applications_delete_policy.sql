drop policy if exists "join_applications_admin_delete" on public.join_applications;
create policy "join_applications_admin_delete" on public.join_applications
for delete using (public.is_admin());
