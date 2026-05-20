drop policy if exists "document_versions_select_own_or_admin" on public.document_versions;
create policy "document_versions_select_own_or_admin" on public.document_versions
for select using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.documents
    where documents.id = document_versions.document_id
    and public.is_workspace_member(documents.workspace_id)
  )
);

drop policy if exists "document_templates_update_own_or_admin" on public.document_templates;
create policy "document_templates_update_own_or_admin" on public.document_templates
for update using (user_id = auth.uid() or public.is_workspace_admin(workspace_id) or public.is_admin())
with check (user_id = auth.uid() or public.is_workspace_admin(workspace_id) or public.is_admin());

drop policy if exists "document_templates_delete_own_or_admin" on public.document_templates;
create policy "document_templates_delete_own_or_admin" on public.document_templates
for delete using (user_id = auth.uid() or public.is_workspace_admin(workspace_id) or public.is_admin());
