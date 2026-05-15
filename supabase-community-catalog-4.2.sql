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

create index if not exists community_document_types_status_idx on public.community_document_types(status);
create index if not exists community_document_types_source_request_idx on public.community_document_types(source_request_id);

drop trigger if exists community_document_types_set_updated_at on public.community_document_types;
create trigger community_document_types_set_updated_at
before update on public.community_document_types
for each row execute function public.set_updated_at();

alter table public.community_document_types enable row level security;

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
