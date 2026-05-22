create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  event_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  route text,
  summary text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists security_events_created_idx
on public.security_events(created_at desc);

create index if not exists security_events_severity_idx
on public.security_events(severity, created_at desc);

create index if not exists security_events_user_idx
on public.security_events(user_id, created_at desc);

create index if not exists security_events_workspace_idx
on public.security_events(workspace_id, created_at desc)
where workspace_id is not null;

alter table public.security_events enable row level security;

drop policy if exists "security_events_select_admin" on public.security_events;
create policy "security_events_select_admin" on public.security_events
for select using (public.is_admin());

drop policy if exists "security_events_insert_own_or_admin" on public.security_events;
create policy "security_events_insert_own_or_admin" on public.security_events
for insert with check (
  public.is_admin()
  or user_id = auth.uid()
);

drop policy if exists "security_events_delete_admin" on public.security_events;
create policy "security_events_delete_admin" on public.security_events
for delete using (public.is_admin());
