alter table public.workspace_members
add column if not exists can_create_documents boolean not null default true;

alter table public.workspace_members
add column if not exists can_upload_templates boolean not null default false;

alter table public.workspace_members
add column if not exists can_manage_templates boolean not null default false;

alter table public.workspace_members
add column if not exists can_invite_members boolean not null default false;

update public.workspace_members
set
  can_create_documents = true,
  can_upload_templates = true,
  can_manage_templates = true,
  can_invite_members = true
where role = 'admin';

update public.workspace_members
set can_create_documents = true
where role = 'member' and can_create_documents is distinct from true;
