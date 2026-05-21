import type { WorkspaceMemberRow } from "@/lib/supabase-server";

export type WorkspaceRolePreset = "admin" | "editor" | "contributor" | "viewer";

export type WorkspaceRolePermissions = Pick<
  WorkspaceMemberRow,
  "role" | "can_create_documents" | "can_upload_templates" | "can_manage_templates" | "can_invite_members"
>;

export const workspaceRolePresets: Record<
  WorkspaceRolePreset,
  {
    label: string;
    description: string;
    permissions: WorkspaceRolePermissions;
  }
> = {
  admin: {
    label: "Admin",
    description: "Gestiona miembros, plantillas y documentos del workspace.",
    permissions: {
      role: "admin",
      can_create_documents: true,
      can_upload_templates: true,
      can_manage_templates: true,
      can_invite_members: true,
    },
  },
  editor: {
    label: "Editor",
    description: "Crea documentos y gestiona la biblioteca de plantillas.",
    permissions: {
      role: "member",
      can_create_documents: true,
      can_upload_templates: true,
      can_manage_templates: true,
      can_invite_members: false,
    },
  },
  contributor: {
    label: "Miembro",
    description: "Crea documentos y puede subir plantillas de referencia.",
    permissions: {
      role: "member",
      can_create_documents: true,
      can_upload_templates: true,
      can_manage_templates: false,
      can_invite_members: false,
    },
  },
  viewer: {
    label: "Solo lectura",
    description: "Consulta documentos y plantillas compartidas sin crear ni gestionar.",
    permissions: {
      role: "member",
      can_create_documents: false,
      can_upload_templates: false,
      can_manage_templates: false,
      can_invite_members: false,
    },
  },
};

export function getWorkspaceRolePreset(preset: WorkspaceRolePreset): WorkspaceRolePermissions {
  return workspaceRolePresets[preset].permissions;
}

export function inferWorkspaceRolePreset(
  member: Pick<
    WorkspaceMemberRow,
    "role" | "can_create_documents" | "can_upload_templates" | "can_manage_templates" | "can_invite_members"
  >,
): WorkspaceRolePreset | "custom" {
  if (member.role === "admin") {
    return "admin";
  }

  if (
    member.can_create_documents &&
    member.can_upload_templates &&
    member.can_manage_templates &&
    !member.can_invite_members
  ) {
    return "editor";
  }

  if (
    member.can_create_documents &&
    member.can_upload_templates &&
    !member.can_manage_templates &&
    !member.can_invite_members
  ) {
    return "contributor";
  }

  if (
    !member.can_create_documents &&
    !member.can_upload_templates &&
    !member.can_manage_templates &&
    !member.can_invite_members
  ) {
    return "viewer";
  }

  return "custom";
}
