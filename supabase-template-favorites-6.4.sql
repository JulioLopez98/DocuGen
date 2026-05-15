alter table public.document_templates
add column if not exists is_favorite boolean not null default false;

create index if not exists document_templates_user_favorite_idx
on public.document_templates(user_id, is_favorite desc, created_at desc);
