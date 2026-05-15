alter table public.document_versions
add column if not exists change_source text not null default 'manual';

alter table public.document_versions
drop constraint if exists document_versions_change_source_check;

alter table public.document_versions
add constraint document_versions_change_source_check
check (change_source in ('original', 'manual', 'ai_improvement', 'restored'));

alter table public.document_versions
add column if not exists ai_mode text;

alter table public.document_versions
add column if not exists model_used text;

alter table public.document_versions
add column if not exists tokens_input integer;

alter table public.document_versions
add column if not exists tokens_output integer;

update public.document_versions
set change_source = case
  when lower(coalesce(change_summary, '')) like '%contenido original%' then 'original'
  when lower(coalesce(change_summary, '')) like '%restaurada%' then 'restored'
  else change_source
end;

create index if not exists document_versions_source_idx on public.document_versions(change_source);
