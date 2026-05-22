create or replace function public.reset_monthly_docs()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set docs_this_month = 0, updated_at = now();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.has_paid_plan(required_plan text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and (
      role = 'admin'
      or ($1 = 'pro' and plan in ('pro', 'empresa'))
      or ($1 = 'empresa' and plan = 'empresa')
    )
  );
$$;

create or replace function public.has_workspace_permission(target_workspace_id uuid, permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace_id
    and user_id = auth.uid()
    and (
      role = 'admin'
      or (permission = 'create_documents' and can_create_documents)
      or (permission = 'upload_templates' and can_upload_templates)
      or (permission = 'manage_templates' and can_manage_templates)
      or (permission = 'invite_members' and can_invite_members)
    )
  );
$$;

drop policy if exists "workspace_members_insert_workspace_admin" on public.workspace_members;
create policy "workspace_members_insert_workspace_admin" on public.workspace_members
for insert with check (
  public.is_admin()
  or (public.has_paid_plan('empresa') and public.is_workspace_admin(workspace_id))
);

drop policy if exists "workspace_members_update_workspace_admin" on public.workspace_members;
create policy "workspace_members_update_workspace_admin" on public.workspace_members
for update using (
  public.is_admin()
  or (public.has_paid_plan('empresa') and public.is_workspace_admin(workspace_id))
)
with check (
  public.is_admin()
  or (public.has_paid_plan('empresa') and public.is_workspace_admin(workspace_id))
);

drop policy if exists "workspace_invitations_insert_workspace_admin" on public.workspace_invitations;
create policy "workspace_invitations_insert_workspace_admin" on public.workspace_invitations
for insert with check (
  public.is_admin()
  or (
    public.has_paid_plan('empresa')
    and public.has_workspace_permission(workspace_id, 'invite_members')
  )
);

drop policy if exists "workspace_invitations_update_workspace_admin_or_invited" on public.workspace_invitations;
create policy "workspace_invitations_update_workspace_admin_or_invited" on public.workspace_invitations
for update using (
  public.is_admin()
  or (
    public.has_paid_plan('empresa')
    and public.has_workspace_permission(workspace_id, 'invite_members')
  )
)
with check (
  public.is_admin()
  or (
    public.has_paid_plan('empresa')
    and public.has_workspace_permission(workspace_id, 'invite_members')
  )
);

drop policy if exists "workspace_invitations_delete_workspace_admin" on public.workspace_invitations;
create policy "workspace_invitations_delete_workspace_admin" on public.workspace_invitations
for delete using (
  public.is_admin()
  or (
    public.has_paid_plan('empresa')
    and public.has_workspace_permission(workspace_id, 'invite_members')
  )
);

drop policy if exists "workspace_audit_events_insert_workspace_member_or_admin" on public.workspace_audit_events;
create policy "workspace_audit_events_insert_workspace_member_or_admin" on public.workspace_audit_events
for insert with check (public.is_admin());

drop policy if exists "workspace_notifications_insert_workspace_member_or_admin" on public.workspace_notifications;
create policy "workspace_notifications_insert_workspace_member_or_admin" on public.workspace_notifications
for insert with check (public.is_admin());

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
for insert with check (
  user_id = auth.uid()
  and (
    workspace_id is null
    or (
      public.has_paid_plan('empresa')
      and public.has_workspace_permission(workspace_id, 'create_documents')
    )
  )
);

drop policy if exists "document_templates_insert_paid_own" on public.document_templates;
create policy "document_templates_insert_paid_own" on public.document_templates
for insert with check (
  user_id = auth.uid()
  and (
    (workspace_id is null and public.has_paid_plan('pro'))
    or (
      workspace_id is not null
      and public.has_paid_plan('empresa')
      and public.has_workspace_permission(workspace_id, 'upload_templates')
    )
  )
);

drop policy if exists "document_templates_update_own_or_admin" on public.document_templates;
create policy "document_templates_update_own_or_admin" on public.document_templates
for update using (
  public.is_admin()
  or (workspace_id is null and user_id = auth.uid())
  or (
    workspace_id is not null
    and public.has_paid_plan('empresa')
    and public.has_workspace_permission(workspace_id, 'manage_templates')
  )
)
with check (
  public.is_admin()
  or (workspace_id is null and user_id = auth.uid())
  or (
    workspace_id is not null
    and public.has_paid_plan('empresa')
    and public.has_workspace_permission(workspace_id, 'manage_templates')
  )
);

drop policy if exists "document_templates_delete_own_or_admin" on public.document_templates;
create policy "document_templates_delete_own_or_admin" on public.document_templates
for delete using (
  public.is_admin()
  or (workspace_id is null and user_id = auth.uid())
  or (
    workspace_id is not null
    and public.has_paid_plan('empresa')
    and public.has_workspace_permission(workspace_id, 'manage_templates')
  )
);

drop policy if exists "brand_logos_user_upload" on storage.objects;
create policy "brand_logos_user_upload" on storage.objects
for insert with check (
  bucket_id = 'brand-logos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "brand_logos_user_update" on storage.objects;
create policy "brand_logos_user_update" on storage.objects
for update using (
  bucket_id = 'brand-logos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'brand-logos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "brand_logos_user_delete" on storage.objects;
create policy "brand_logos_user_delete" on storage.objects
for delete using (
  bucket_id = 'brand-logos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
