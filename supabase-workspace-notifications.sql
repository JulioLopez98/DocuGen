create table if not exists public.workspace_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  audit_event_id uuid references public.workspace_audit_events(id) on delete cascade,
  notification_type text not null check (
    notification_type in (
      'document_created',
      'document_deleted',
      'documents_cleared',
      'template_uploaded',
      'template_processed',
      'template_updated',
      'template_deleted',
      'member_invited',
      'member_joined',
      'member_role_updated',
      'member_permissions_updated',
      'member_removed',
      'invitation_revoked'
    )
  ),
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists workspace_notifications_user_created_idx
on public.workspace_notifications(user_id, created_at desc);

create index if not exists workspace_notifications_user_unread_idx
on public.workspace_notifications(user_id, read_at)
where read_at is null;

create index if not exists workspace_notifications_workspace_idx
on public.workspace_notifications(workspace_id, created_at desc);

alter table public.workspace_notifications enable row level security;

drop policy if exists "workspace_notifications_select_own" on public.workspace_notifications;
create policy "workspace_notifications_select_own"
on public.workspace_notifications
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "workspace_notifications_update_own" on public.workspace_notifications;
create policy "workspace_notifications_update_own"
on public.workspace_notifications
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "workspace_notifications_insert_workspace_member_or_admin" on public.workspace_notifications;
create policy "workspace_notifications_insert_workspace_member_or_admin"
on public.workspace_notifications
for insert
with check (
  (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  or public.is_admin()
);
