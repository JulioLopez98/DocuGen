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

create index if not exists document_requests_user_created_idx on public.document_requests(user_id, created_at desc);
create index if not exists document_requests_status_idx on public.document_requests(status);
create index if not exists document_requests_generated_document_idx on public.document_requests(generated_document_id);

drop trigger if exists document_requests_set_updated_at on public.document_requests;
create trigger document_requests_set_updated_at
before update on public.document_requests
for each row execute function public.set_updated_at();

alter table public.document_requests enable row level security;

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
