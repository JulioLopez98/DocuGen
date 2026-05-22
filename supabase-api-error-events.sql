create table if not exists public.api_error_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  route text not null,
  provider text not null check (provider in ('openai', 'stripe', 'resend', 'supabase', 'app')),
  error_code text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  message text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists api_error_events_created_idx
on public.api_error_events(created_at desc);

create index if not exists api_error_events_provider_created_idx
on public.api_error_events(provider, created_at desc);

create index if not exists api_error_events_severity_created_idx
on public.api_error_events(severity, created_at desc);

create index if not exists api_error_events_route_created_idx
on public.api_error_events(route, created_at desc);

alter table public.api_error_events enable row level security;

drop policy if exists "api_error_events_select_admin" on public.api_error_events;
create policy "api_error_events_select_admin" on public.api_error_events
for select using (public.is_admin());

drop policy if exists "api_error_events_insert_own_or_admin" on public.api_error_events;
create policy "api_error_events_insert_own_or_admin" on public.api_error_events
for insert with check (
  public.is_admin()
  or user_id = auth.uid()
);

drop policy if exists "api_error_events_delete_admin" on public.api_error_events;
create policy "api_error_events_delete_admin" on public.api_error_events
for delete using (public.is_admin());
