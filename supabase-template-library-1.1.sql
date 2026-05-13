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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists document_templates_user_created_idx on public.document_templates(user_id, created_at desc);
create index if not exists document_templates_workspace_idx on public.document_templates(workspace_id);
create index if not exists document_templates_status_idx on public.document_templates(status);

drop trigger if exists document_templates_set_updated_at on public.document_templates;
create trigger document_templates_set_updated_at
before update on public.document_templates
for each row execute function public.set_updated_at();

alter table public.document_templates enable row level security;

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
