alter table public.workspace_invitations
add column if not exists can_create_documents boolean not null default true,
add column if not exists can_upload_templates boolean not null default false,
add column if not exists can_manage_templates boolean not null default false,
add column if not exists can_invite_members boolean not null default false;

update public.workspace_invitations
set
  can_create_documents = case when role = 'admin' then true else can_create_documents end,
  can_upload_templates = case when role = 'admin' then true else can_upload_templates end,
  can_manage_templates = case when role = 'admin' then true else can_manage_templates end,
  can_invite_members = case when role = 'admin' then true else can_invite_members end;
