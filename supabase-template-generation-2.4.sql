alter table public.documents
add column if not exists reference_template_id uuid references public.document_templates(id) on delete set null;

alter table public.documents
add column if not exists reference_template_name text;

alter table public.documents
add column if not exists template_usage_mode text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_template_usage_mode_check'
  ) then
    alter table public.documents
    add constraint documents_template_usage_mode_check
    check (template_usage_mode in ('structure_tone', 'structure', 'tone', 'light'));
  end if;
end;
$$;

create index if not exists documents_reference_template_idx on public.documents(reference_template_id);
