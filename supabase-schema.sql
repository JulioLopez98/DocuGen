create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'empresa')),
  role text not null default 'user' check (role in ('user', 'admin')),
  docs_this_month integer not null default 0,
  stripe_customer_id text,
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
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

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
create index if not exists documents_user_created_idx on public.documents(user_id, created_at desc);
create index if not exists documents_workspace_idx on public.documents(workspace_id);
create index if not exists documents_reference_template_idx on public.documents(reference_template_id);
create index if not exists document_versions_document_idx on public.document_versions(document_id, version_number desc);
create index if not exists document_versions_user_created_idx on public.document_versions(user_id, created_at desc);
create index if not exists generation_events_user_created_idx on public.generation_events(user_id, created_at desc);
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

  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace_id, new.id, 'admin')
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
as $$
  update public.profiles set docs_this_month = 0, updated_at = now();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
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
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.generation_events enable row level security;
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
for insert with check (public.is_workspace_admin(workspace_id) or public.is_admin());

drop policy if exists "workspace_members_update_workspace_admin" on public.workspace_members;
create policy "workspace_members_update_workspace_admin" on public.workspace_members
for update using (public.is_workspace_admin(workspace_id) or public.is_admin())
with check (public.is_workspace_admin(workspace_id) or public.is_admin());

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

drop policy if exists "documents_select_own_workspace_or_admin" on public.documents;
create policy "documents_select_own_workspace_or_admin" on public.documents
for select using (user_id = auth.uid() or public.is_workspace_member(workspace_id) or public.is_admin());

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
for insert with check (user_id = auth.uid() and (workspace_id is null or public.is_workspace_member(workspace_id)));

drop policy if exists "documents_update_own_or_admin" on public.documents;
create policy "documents_update_own_or_admin" on public.documents
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "documents_delete_own_or_admin" on public.documents;
create policy "documents_delete_own_or_admin" on public.documents
for delete using (user_id = auth.uid() or public.is_admin());

drop policy if exists "document_versions_select_own_or_admin" on public.document_versions;
create policy "document_versions_select_own_or_admin" on public.document_versions
for select using (user_id = auth.uid() or public.is_admin());

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
  and (workspace_id is null or public.is_workspace_member(workspace_id))
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and plan in ('pro', 'empresa')
  )
);

drop policy if exists "document_templates_update_own_or_admin" on public.document_templates;
create policy "document_templates_update_own_or_admin" on public.document_templates
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "document_templates_delete_own_or_admin" on public.document_templates;
create policy "document_templates_delete_own_or_admin" on public.document_templates
for delete using (user_id = auth.uid() or public.is_admin());

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
for insert with check (bucket_id = 'brand-logos' and auth.role() = 'authenticated');

drop policy if exists "brand_logos_user_update" on storage.objects;
create policy "brand_logos_user_update" on storage.objects
for update using (bucket_id = 'brand-logos' and auth.role() = 'authenticated')
with check (bucket_id = 'brand-logos' and auth.role() = 'authenticated');

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
