drop policy if exists "community_document_types_select_admin_or_published" on public.community_document_types;
create policy "community_document_types_select_admin_or_published" on public.community_document_types
for select using (status in ('approved', 'published') or public.is_admin());
