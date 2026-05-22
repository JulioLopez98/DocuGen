create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_user_action_created_idx
on public.rate_limit_events(user_id, action, created_at desc);

create index if not exists rate_limit_events_workspace_action_created_idx
on public.rate_limit_events(workspace_id, action, created_at desc)
where workspace_id is not null;

create index if not exists rate_limit_events_cleanup_idx
on public.rate_limit_events(created_at);

alter table public.rate_limit_events enable row level security;

drop policy if exists "rate_limit_events_select_own_workspace_or_admin" on public.rate_limit_events;
create policy "rate_limit_events_select_own_workspace_or_admin" on public.rate_limit_events
for select using (
  user_id = auth.uid()
  or public.is_admin()
  or (workspace_id is not null and public.is_workspace_member(workspace_id))
);

drop policy if exists "rate_limit_events_insert_own" on public.rate_limit_events;
create policy "rate_limit_events_insert_own" on public.rate_limit_events
for insert with check (
  user_id = auth.uid()
  and (
    workspace_id is null
    or public.is_workspace_member(workspace_id)
  )
);

drop policy if exists "rate_limit_events_delete_admin" on public.rate_limit_events;
create policy "rate_limit_events_delete_admin" on public.rate_limit_events
for delete using (public.is_admin());
