create table if not exists public.workspace_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (
    event_type in (
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
  target_type text,
  target_id uuid,
  summary text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists workspace_audit_events_workspace_created_idx
on public.workspace_audit_events(workspace_id, created_at desc);

create index if not exists workspace_audit_events_actor_idx
on public.workspace_audit_events(actor_id, created_at desc);

alter table public.workspace_audit_events enable row level security;

drop policy if exists "workspace_audit_events_select_member_or_admin" on public.workspace_audit_events;
create policy "workspace_audit_events_select_member_or_admin" on public.workspace_audit_events
for select using (public.is_workspace_member(workspace_id) or public.is_admin());

drop policy if exists "workspace_audit_events_insert_workspace_member_or_admin" on public.workspace_audit_events;
create policy "workspace_audit_events_insert_workspace_member_or_admin" on public.workspace_audit_events
for insert with check (public.is_workspace_member(workspace_id) or public.is_admin());
