create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'empresa')),
  role text not null default 'user' check (role in ('user', 'admin')),
  docs_this_month integer not null default 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_subscription_status text,
  stripe_current_period_end timestamptz,
  stripe_cancel_at_period_end boolean not null default false,
  referral_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'empresa')),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  can_create_documents boolean not null default true,
  can_upload_templates boolean not null default false,
  can_manage_templates boolean not null default false,
  can_invite_members boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  can_create_documents boolean not null default true,
  can_upload_templates boolean not null default false,
  can_manage_templates boolean not null default false,
  can_invite_members boolean not null default false,
  token_hash text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  doc_type text not null,
  doc_label text not null,
  content text not null,
  form_data jsonb not null default '{}',
  reference_template_id uuid references public.document_templates(id) on delete set null,
  reference_template_name text,
  template_usage_mode text check (template_usage_mode in ('structure_tone', 'structure', 'tone', 'light')),
  model_used text,
  tokens_input integer,
  tokens_output integer,
  created_at timestamptz not null default now()
);

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null,
  content text not null,
  change_source text not null default 'manual' check (change_source in ('original', 'manual', 'ai_improvement', 'restored')),
  change_summary text,
  ai_mode text,
  model_used text,
  tokens_input integer,
  tokens_output integer,
  created_at timestamptz not null default now(),
  unique (document_id, version_number)
);

create table if not exists public.generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

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

create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  intended_use text,
  tone text not null default 'formal' check (tone in ('formal', 'comercial', 'laboral_prudente', 'legal_prudente', 'email', 'carta', 'natural')),
  sector text,
  generated_document_id uuid references public.documents(id) on delete set null,
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'approved', 'rejected', 'converted')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_document_types (
  id uuid primary key default gen_random_uuid(),
  source_request_id uuid references public.document_requests(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  slug text not null unique,
  label text not null,
  description text not null,
  category text,
  status text not null default 'draft' check (status in ('draft', 'reviewing', 'approved', 'published', 'rejected')),
  required_plan text not null default 'pro' check (required_plan in ('free', 'pro', 'empresa')),
  prompt_brief text not null,
  suggested_fields jsonb not null default '[]',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_request_id)
);

create table if not exists public.brand_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text,
  cif text,
  address text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  name text not null,
  description text,
  category text,
  original_filename text not null,
  file_type text not null check (file_type in ('pdf', 'docx', 'doc')),
  mime_type text,
  file_size integer,
  storage_bucket text not null default 'document-templates',
  storage_path text not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'failed')),
  extracted_text text,
  extracted_metadata jsonb not null default '{}',
  summary text,
  notes text,
  error_message text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'converted', 'rewarded')),
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (referrer_id, referred_id)
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_plan_idx on public.profiles(plan);
create index if not exists profiles_stripe_customer_id_idx on public.profiles(stripe_customer_id);
create index if not exists profiles_stripe_subscription_id_idx on public.profiles(stripe_subscription_id);
create index if not exists documents_user_created_idx on public.documents(user_id, created_at desc);
create index if not exists documents_workspace_idx on public.documents(workspace_id);
create index if not exists documents_reference_template_idx on public.documents(reference_template_id);
create index if not exists document_versions_document_idx on public.document_versions(document_id, version_number desc);
create index if not exists document_versions_user_created_idx on public.document_versions(user_id, created_at desc);
create index if not exists generation_events_user_created_idx on public.generation_events(user_id, created_at desc);
create index if not exists rate_limit_events_user_action_created_idx on public.rate_limit_events(user_id, action, created_at desc);
create index if not exists rate_limit_events_workspace_action_created_idx on public.rate_limit_events(workspace_id, action, created_at desc)
where workspace_id is not null;
create index if not exists rate_limit_events_cleanup_idx on public.rate_limit_events(created_at);
create index if not exists security_events_created_idx on public.security_events(created_at desc);
create index if not exists security_events_severity_idx on public.security_events(severity, created_at desc);
create index if not exists security_events_user_idx on public.security_events(user_id, created_at desc);
create index if not exists security_events_workspace_idx on public.security_events(workspace_id, created_at desc)
where workspace_id is not null;
create index if not exists operational_alerts_status_created_idx on public.operational_alerts(status, created_at desc);
create index if not exists operational_alerts_severity_idx on public.operational_alerts(severity, created_at desc);
create unique index if not exists operational_alerts_open_dedupe_idx
on public.operational_alerts(dedupe_key)
where status in ('open', 'acknowledged');
create index if not exists api_error_events_created_idx on public.api_error_events(created_at desc);
create index if not exists api_error_events_provider_created_idx on public.api_error_events(provider, created_at desc);
create index if not exists api_error_events_severity_created_idx on public.api_error_events(severity, created_at desc);
create index if not exists api_error_events_route_created_idx on public.api_error_events(route, created_at desc);
create index if not exists document_requests_user_created_idx on public.document_requests(user_id, created_at desc);
create index if not exists document_requests_status_idx on public.document_requests(status);
create index if not exists document_requests_generated_document_idx on public.document_requests(generated_document_id);
create index if not exists community_document_types_status_idx on public.community_document_types(status);
create index if not exists community_document_types_source_request_idx on public.community_document_types(source_request_id);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);
create index if not exists workspace_invitations_workspace_status_idx on public.workspace_invitations(workspace_id, status, created_at desc);
create index if not exists workspace_invitations_email_status_idx on public.workspace_invitations(lower(email), status);
create unique index if not exists workspace_invitations_pending_unique_idx
on public.workspace_invitations(workspace_id, lower(email))
where status = 'pending';
create index if not exists workspace_audit_events_workspace_created_idx on public.workspace_audit_events(workspace_id, created_at desc);
create index if not exists workspace_audit_events_actor_idx on public.workspace_audit_events(actor_id, created_at desc);
create index if not exists workspace_notifications_user_created_idx on public.workspace_notifications(user_id, created_at desc);
create index if not exists workspace_notifications_user_unread_idx on public.workspace_notifications(user_id, read_at) where read_at is null;
create index if not exists workspace_notifications_workspace_idx on public.workspace_notifications(workspace_id, created_at desc);
create index if not exists document_templates_user_created_idx on public.document_templates(user_id, created_at desc);
create index if not exists document_templates_workspace_idx on public.document_templates(workspace_id);
create index if not exists document_templates_status_idx on public.document_templates(status);
create index if not exists document_templates_user_favorite_idx on public.document_templates(user_id, is_favorite desc, created_at desc);
create index if not exists chat_sessions_user_idx on public.chat_sessions(user_id);
create index if not exists chat_messages_session_idx on public.chat_messages(session_id, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists brand_settings_set_updated_at on public.brand_settings;
create trigger brand_settings_set_updated_at
before update on public.brand_settings
for each row execute function public.set_updated_at();

drop trigger if exists document_templates_set_updated_at on public.document_templates;
create trigger document_templates_set_updated_at
before update on public.document_templates
for each row execute function public.set_updated_at();

drop trigger if exists document_requests_set_updated_at on public.document_requests;
create trigger document_requests_set_updated_at
before update on public.document_requests
for each row execute function public.set_updated_at();

drop trigger if exists community_document_types_set_updated_at on public.community_document_types;
create trigger community_document_types_set_updated_at
before update on public.community_document_types
for each row execute function public.set_updated_at();

drop trigger if exists workspace_invitations_set_updated_at on public.workspace_invitations;
create trigger workspace_invitations_set_updated_at
before update on public.workspace_invitations
for each row execute function public.set_updated_at();

drop trigger if exists operational_alerts_set_updated_at on public.operational_alerts;
create trigger operational_alerts_set_updated_at
before update on public.operational_alerts
for each row execute function public.set_updated_at();

drop trigger if exists chat_sessions_set_updated_at on public.chat_sessions;
create trigger chat_sessions_set_updated_at
before update on public.chat_sessions
for each row execute function public.set_updated_at();

create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.profiles where referral_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_id uuid;
begin
  insert into public.profiles (id, email, referral_code)
  values (new.id, new.email, public.generate_referral_code())
  on conflict (id) do nothing;

  insert into public.workspaces (name, owner_id)
  values ('Workspace personal', new.id)
  returning id into workspace_id;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    can_create_documents,
    can_upload_templates,
    can_manage_templates,
    can_invite_members
  )
  values (workspace_id, new.id, 'admin', true, true, true, true)
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.reset_monthly_docs()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set docs_this_month = 0, updated_at = now();
$$;

create or replace function public.cleanup_operational_logs(
  generation_events_days integer default 30,
  rate_limit_events_days integer default 30,
  security_events_days integer default 90,
  api_error_events_days integer default 90,
  resolved_alerts_days integer default 365
)
returns table (
  generation_events_deleted integer,
  rate_limit_events_deleted integer,
  security_events_deleted integer,
  api_error_events_deleted integer,
  operational_alerts_deleted integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  generation_deleted integer := 0;
  rate_deleted integer := 0;
  security_deleted integer := 0;
  api_deleted integer := 0;
  alerts_deleted integer := 0;
begin
  delete from public.generation_events
  where created_at < now() - make_interval(days => greatest(generation_events_days, 1));
  get diagnostics generation_deleted = row_count;

  delete from public.rate_limit_events
  where created_at < now() - make_interval(days => greatest(rate_limit_events_days, 1));
  get diagnostics rate_deleted = row_count;

  delete from public.security_events
  where created_at < now() - make_interval(days => greatest(security_events_days, 1));
  get diagnostics security_deleted = row_count;

  delete from public.api_error_events
  where created_at < now() - make_interval(days => greatest(api_error_events_days, 1));
  get diagnostics api_deleted = row_count;

  delete from public.operational_alerts
  where status = 'resolved'
  and coalesce(resolved_at, updated_at, created_at) < now() - make_interval(days => greatest(resolved_alerts_days, 1));
  get diagnostics alerts_deleted = row_count;

  return query select generation_deleted, rate_deleted, security_deleted, api_deleted, alerts_deleted;
end;
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

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.workspace_audit_events enable row level security;
alter table public.workspace_notifications enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.generation_events enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.security_events enable row level security;
alter table public.operational_alerts enable row level security;
alter table public.api_error_events enable row level security;
alter table public.document_requests enable row level security;
alter table public.community_document_types enable row level security;
alter table public.brand_settings enable row level security;
alter table public.document_templates enable row level security;
alter table public.referrals enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "workspaces_select_member_or_admin" on public.workspaces;
create policy "workspaces_select_member_or_admin" on public.workspaces
for select using (owner_id = auth.uid() or public.is_workspace_member(id) or public.is_admin());

drop policy if exists "workspaces_insert_owner" on public.workspaces;
create policy "workspaces_insert_owner" on public.workspaces
for insert with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "workspaces_update_admin" on public.workspaces;
create policy "workspaces_update_admin" on public.workspaces
for update using (owner_id = auth.uid() or public.is_workspace_admin(id) or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "workspace_members_select_member_or_admin" on public.workspace_members;
create policy "workspace_members_select_member_or_admin" on public.workspace_members
for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id) or public.is_admin());

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

drop policy if exists "workspace_audit_events_select_member_or_admin" on public.workspace_audit_events;
create policy "workspace_audit_events_select_member_or_admin" on public.workspace_audit_events
for select using (public.is_workspace_member(workspace_id) or public.is_admin());

drop policy if exists "workspace_audit_events_insert_workspace_member_or_admin" on public.workspace_audit_events;
create policy "workspace_audit_events_insert_workspace_member_or_admin" on public.workspace_audit_events
for insert with check (public.is_admin());

drop policy if exists "workspace_notifications_select_own" on public.workspace_notifications;
create policy "workspace_notifications_select_own" on public.workspace_notifications
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "workspace_notifications_update_own" on public.workspace_notifications;
create policy "workspace_notifications_update_own" on public.workspace_notifications
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "workspace_notifications_insert_workspace_member_or_admin" on public.workspace_notifications;
create policy "workspace_notifications_insert_workspace_member_or_admin" on public.workspace_notifications
for insert with check (public.is_admin());

drop policy if exists "documents_select_own_workspace_or_admin" on public.documents;
create policy "documents_select_own_workspace_or_admin" on public.documents
for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id) or public.is_admin());

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

drop policy if exists "documents_update_own_or_admin" on public.documents;
create policy "documents_update_own_or_admin" on public.documents
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "documents_delete_own_or_admin" on public.documents;
create policy "documents_delete_own_or_admin" on public.documents
for delete using (user_id = auth.uid() or public.is_admin());

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

drop policy if exists "document_versions_insert_own_or_admin" on public.document_versions;
create policy "document_versions_insert_own_or_admin" on public.document_versions
for insert with check (
  (
    user_id = auth.uid()
    and exists (
      select 1
      from public.documents
      where documents.id = document_versions.document_id
      and documents.user_id = auth.uid()
    )
  )
  or public.is_admin()
);

drop policy if exists "document_versions_delete_admin" on public.document_versions;
create policy "document_versions_delete_admin" on public.document_versions
for delete using (public.is_admin());

drop policy if exists "generation_events_select_own_or_admin" on public.generation_events;
create policy "generation_events_select_own_or_admin" on public.generation_events
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "generation_events_insert_own" on public.generation_events;
create policy "generation_events_insert_own" on public.generation_events
for insert with check (user_id = auth.uid());

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

drop policy if exists "document_requests_select_own_or_admin" on public.document_requests;
create policy "document_requests_select_own_or_admin" on public.document_requests
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "document_requests_insert_own" on public.document_requests;
create policy "document_requests_insert_own" on public.document_requests
for insert with check (user_id = auth.uid());

drop policy if exists "document_requests_update_own_or_admin" on public.document_requests;
create policy "document_requests_update_own_or_admin" on public.document_requests
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "document_requests_delete_admin" on public.document_requests;
create policy "document_requests_delete_admin" on public.document_requests
for delete using (public.is_admin());

drop policy if exists "community_document_types_select_admin_or_published" on public.community_document_types;
create policy "community_document_types_select_admin_or_published" on public.community_document_types
for select using (status in ('approved', 'published') or public.is_admin());

drop policy if exists "community_document_types_insert_admin" on public.community_document_types;
create policy "community_document_types_insert_admin" on public.community_document_types
for insert with check (public.is_admin());

drop policy if exists "community_document_types_update_admin" on public.community_document_types;
create policy "community_document_types_update_admin" on public.community_document_types
for update using (public.is_admin())
with check (public.is_admin());

drop policy if exists "community_document_types_delete_admin" on public.community_document_types;
create policy "community_document_types_delete_admin" on public.community_document_types
for delete using (public.is_admin());

drop policy if exists "brand_settings_select_own_or_admin" on public.brand_settings;
create policy "brand_settings_select_own_or_admin" on public.brand_settings
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "brand_settings_insert_own" on public.brand_settings;
create policy "brand_settings_insert_own" on public.brand_settings
for insert with check (user_id = auth.uid());

drop policy if exists "brand_settings_update_own_or_admin" on public.brand_settings;
create policy "brand_settings_update_own_or_admin" on public.brand_settings
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "document_templates_select_own_workspace_or_admin" on public.document_templates;
create policy "document_templates_select_own_workspace_or_admin" on public.document_templates
for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id) or public.is_admin());

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

drop policy if exists "referrals_select_related_or_admin" on public.referrals;
create policy "referrals_select_related_or_admin" on public.referrals
for select using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());

drop policy if exists "referrals_insert_referrer" on public.referrals;
create policy "referrals_insert_referrer" on public.referrals
for insert with check (referrer_id = auth.uid() or public.is_admin());

drop policy if exists "referrals_update_admin" on public.referrals;
create policy "referrals_update_admin" on public.referrals
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "chat_sessions_select_own_or_admin" on public.chat_sessions;
create policy "chat_sessions_select_own_or_admin" on public.chat_sessions
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "chat_sessions_insert_own" on public.chat_sessions;
create policy "chat_sessions_insert_own" on public.chat_sessions
for insert with check (user_id = auth.uid());

drop policy if exists "chat_sessions_update_own_or_admin" on public.chat_sessions;
create policy "chat_sessions_update_own_or_admin" on public.chat_sessions
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "chat_messages_select_session_owner_or_admin" on public.chat_messages;
create policy "chat_messages_select_session_owner_or_admin" on public.chat_messages
for select using (
  exists (select 1 from public.chat_sessions where id = session_id and user_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "chat_messages_insert_session_owner" on public.chat_messages;
create policy "chat_messages_insert_session_owner" on public.chat_messages
for insert with check (
  exists (select 1 from public.chat_sessions where id = session_id and user_id = auth.uid())
);

insert into storage.buckets (id, name, public)
values ('brand-logos', 'brand-logos', true)
on conflict (id) do nothing;

drop policy if exists "brand_logos_public_read" on storage.objects;
create policy "brand_logos_public_read" on storage.objects
for select using (bucket_id = 'brand-logos');

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

insert into storage.buckets (id, name, public)
values ('document-templates', 'document-templates', false)
on conflict (id) do update set public = false;

drop policy if exists "document_templates_storage_select_own_or_admin" on storage.objects;
create policy "document_templates_storage_select_own_or_admin" on storage.objects
for select using (
  bucket_id = 'document-templates'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "document_templates_storage_insert_paid_own" on storage.objects;
create policy "document_templates_storage_insert_paid_own" on storage.objects
for insert with check (
  bucket_id = 'document-templates'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and plan in ('pro', 'empresa')
  )
);

drop policy if exists "document_templates_storage_update_own_or_admin" on storage.objects;
create policy "document_templates_storage_update_own_or_admin" on storage.objects
for update using (
  bucket_id = 'document-templates'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
)
with check (
  bucket_id = 'document-templates'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "document_templates_storage_delete_own_or_admin" on storage.objects;
create policy "document_templates_storage_delete_own_or_admin" on storage.objects
for delete using (
  bucket_id = 'document-templates'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

-- Promo / gift codes for manual Pro or Empresa access
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plan text not null check (plan in ('pro', 'empresa')),
  active boolean not null default true,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  times_redeemed integer not null default 0 check (times_redeemed >= 0),
  expires_at timestamptz,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promo_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_granted text not null check (plan_granted in ('pro', 'empresa')),
  redeemed_at timestamptz not null default now(),
  unique(promo_code_id, user_id)
);

create index if not exists promo_codes_code_idx on public.promo_codes(code);
create index if not exists promo_codes_active_idx on public.promo_codes(active);
create index if not exists promo_code_redemptions_user_id_idx on public.promo_code_redemptions(user_id);
create index if not exists promo_code_redemptions_promo_code_id_idx on public.promo_code_redemptions(promo_code_id);

drop trigger if exists promo_codes_set_updated_at on public.promo_codes;
create trigger promo_codes_set_updated_at
before update on public.promo_codes
for each row execute function public.set_updated_at();

alter table public.promo_codes enable row level security;
alter table public.promo_code_redemptions enable row level security;

drop policy if exists "promo_codes_admin_all" on public.promo_codes;
create policy "promo_codes_admin_all" on public.promo_codes
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "promo_code_redemptions_select_own_or_admin" on public.promo_code_redemptions;
create policy "promo_code_redemptions_select_own_or_admin" on public.promo_code_redemptions
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "promo_code_redemptions_admin_all" on public.promo_code_redemptions;
create policy "promo_code_redemptions_admin_all" on public.promo_code_redemptions
for all using (public.is_admin()) with check (public.is_admin());
