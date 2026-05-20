create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_invitations_workspace_status_idx
on public.workspace_invitations(workspace_id, status, created_at desc);

create index if not exists workspace_invitations_email_status_idx
on public.workspace_invitations(lower(email), status);

create unique index if not exists workspace_invitations_pending_unique_idx
on public.workspace_invitations(workspace_id, lower(email))
where status = 'pending';

drop trigger if exists workspace_invitations_set_updated_at on public.workspace_invitations;
create trigger workspace_invitations_set_updated_at
before update on public.workspace_invitations
for each row execute function public.set_updated_at();

alter table public.workspace_invitations enable row level security;

drop policy if exists "workspace_invitations_select_workspace_admin_or_invited" on public.workspace_invitations;
create policy "workspace_invitations_select_workspace_admin_or_invited" on public.workspace_invitations
for select using (
  public.is_workspace_admin(workspace_id)
  or public.is_admin()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and lower(profiles.email) = lower(workspace_invitations.email)
  )
);

drop policy if exists "workspace_invitations_insert_workspace_admin" on public.workspace_invitations;
create policy "workspace_invitations_insert_workspace_admin" on public.workspace_invitations
for insert with check (public.is_workspace_admin(workspace_id) or public.is_admin());

drop policy if exists "workspace_invitations_update_workspace_admin_or_invited" on public.workspace_invitations;
create policy "workspace_invitations_update_workspace_admin_or_invited" on public.workspace_invitations
for update using (
  public.is_workspace_admin(workspace_id)
  or public.is_admin()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and lower(profiles.email) = lower(workspace_invitations.email)
  )
)
with check (
  public.is_workspace_admin(workspace_id)
  or public.is_admin()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
    and lower(profiles.email) = lower(workspace_invitations.email)
  )
);

drop policy if exists "workspace_invitations_delete_workspace_admin" on public.workspace_invitations;
create policy "workspace_invitations_delete_workspace_admin" on public.workspace_invitations
for delete using (public.is_workspace_admin(workspace_id) or public.is_admin());
