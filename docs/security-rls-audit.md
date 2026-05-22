# Auditoria de seguridad y RLS

Fecha: 2026-05-22

## Objetivo

Revisar que la base de datos y las rutas sensibles de DocuGen no permitan cruces de datos entre usuarios, miembros de workspace o administradores no autorizados.

## Superficies revisadas

- `profiles`
- `documents`
- `document_versions`
- `document_templates`
- `brand_settings`
- `workspaces`
- `workspace_members`
- `workspace_invitations`
- `workspace_audit_events`
- `workspace_notifications`
- `document_requests`
- `community_document_types`
- `chat_sessions`
- `chat_messages`
- Storage bucket `brand-logos`
- Storage bucket `document-templates`
- API routes que usan `createSupabaseServiceClient`

## Cambios aplicados

### Funciones `security definer`

Se fija `search_path = public` en funciones helper sensibles:

- `reset_monthly_docs`
- `is_admin`
- `is_workspace_member`
- `is_workspace_admin`

Tambien se anaden helpers RLS:

- `has_paid_plan(required_plan)`
- `has_workspace_permission(target_workspace_id, permission)`

Motivo: reducir riesgo de resolucion ambigua de objetos y centralizar checks de plan/permisos en base de datos.

### Workspaces y Empresa

Se endurecen policies para que no baste con ser admin de un workspace si el usuario no tiene plan Empresa:

- Insert/update de `workspace_members`
- Insert/update/delete de `workspace_invitations`
- Insert de documentos con `workspace_id`
- Insert/update/delete de plantillas con `workspace_id`

Resultado esperado:

- Usuarios Free/Pro no pueden escribir directamente contra Supabase para activar funciones Empresa.
- Miembros Empresa necesitan el permiso especifico (`create_documents`, `upload_templates`, `manage_templates`, `invite_members`).

### Auditoria y notificaciones

Se restringe la insercion directa en:

- `workspace_audit_events`
- `workspace_notifications`

Motivo: evitar que un usuario autenticado cree eventos falsos o notificaciones arbitrarias desde el cliente. La app los crea desde rutas server con service role.

### Storage `brand-logos`

Antes, cualquier usuario autenticado podia subir o modificar objetos dentro del bucket. Ahora:

- El usuario solo puede subir en carpeta `auth.uid()`.
- El usuario solo puede actualizar objetos en carpeta `auth.uid()`.
- Se anade delete limitado a carpeta `auth.uid()`.
- La lectura sigue siendo publica porque el bucket se usa para logos visibles en PDF/Word.

## Riesgos residuales aceptados

- `brand-logos` es publico por diseno. No debe usarse para datos confidenciales.
- Admin global puede ver y gestionar datos globales. Esto es intencionado para soporte/metricas.
- Service role bypasses RLS. Por eso las rutas server que lo usan deben filtrar siempre por usuario, workspace o admin antes de operar.
- Miembros de workspace pueden ver documentos/plantillas compartidos del workspace. Es el comportamiento esperado.

## Checklist manual recomendada

Ejecutar despues de aplicar `supabase-security-rls-hardening.sql`:

1. Usuario Free intenta generar documento personal: debe funcionar.
2. Usuario Free intenta generar documento con `workspaceId`: debe fallar.
3. Usuario Pro intenta subir plantilla personal: debe funcionar.
4. Usuario Pro intenta subir plantilla a workspace: debe fallar.
5. Usuario Empresa con permiso `create_documents` genera documento en workspace: debe funcionar.
6. Usuario Empresa sin permiso `create_documents` genera en workspace: debe fallar.
7. Usuario Empresa con rol Solo lectura intenta subir plantilla: debe fallar.
8. Usuario Empresa con rol Editor gestiona plantillas: debe funcionar.
9. Usuario autenticado intenta subir logo en carpeta de otro usuario: debe fallar.
10. Usuario autenticado intenta insertar `workspace_audit_events` desde cliente: debe fallar.

## SQL incremental

Aplicar:

```bash
supabase-security-rls-hardening.sql
```
