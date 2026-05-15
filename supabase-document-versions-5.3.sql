create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null,
  content text not null,
  change_summary text,
  created_at timestamptz not null default now(),
  unique (document_id, version_number)
);

create index if not exists document_versions_document_idx on public.document_versions(document_id, version_number desc);
create index if not exists document_versions_user_created_idx on public.document_versions(user_id, created_at desc);

alter table public.document_versions enable row level security;

drop policy if exists "document_versions_select_own_or_admin" on public.document_versions;
create policy "document_versions_select_own_or_admin" on public.document_versions
for select using (
  user_id = auth.uid()
  or public.is_admin()
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
