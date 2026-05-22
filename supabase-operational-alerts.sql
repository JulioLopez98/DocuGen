create table if not exists public.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  source_event_id uuid references public.security_events(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  alert_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  dedupe_key text not null,
  title text not null,
  description text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create index if not exists operational_alerts_status_created_idx
on public.operational_alerts(status, created_at desc);

create index if not exists operational_alerts_severity_idx
on public.operational_alerts(severity, created_at desc);

create unique index if not exists operational_alerts_open_dedupe_idx
on public.operational_alerts(dedupe_key)
where status in ('open', 'acknowledged');

drop trigger if exists operational_alerts_set_updated_at on public.operational_alerts;
create trigger operational_alerts_set_updated_at
before update on public.operational_alerts
for each row execute function public.set_updated_at();

alter table public.operational_alerts enable row level security;

drop policy if exists "operational_alerts_select_admin" on public.operational_alerts;
create policy "operational_alerts_select_admin" on public.operational_alerts
for select using (public.is_admin());

drop policy if exists "operational_alerts_insert_own_or_admin" on public.operational_alerts;
create policy "operational_alerts_insert_own_or_admin" on public.operational_alerts
for insert with check (
  public.is_admin()
  or user_id = auth.uid()
);

drop policy if exists "operational_alerts_update_admin" on public.operational_alerts;
create policy "operational_alerts_update_admin" on public.operational_alerts
for update using (public.is_admin())
with check (public.is_admin());

drop policy if exists "operational_alerts_delete_admin" on public.operational_alerts;
create policy "operational_alerts_delete_admin" on public.operational_alerts
for delete using (public.is_admin());
