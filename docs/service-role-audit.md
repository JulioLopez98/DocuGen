# Revision de rutas server con service role

Fecha: 2026-05-22

## Objetivo

Revisar todos los usos de `createSupabaseServiceClient()` para confirmar que cada lectura/escritura que salta RLS queda protegida por checks explicitos de usuario, workspace, rol o admin.

## Resultado

Se revisaron los usos en:

- Admin dashboard.
- Admin catalogo comunitario.
- Admin document requests.
- Webhook Stripe.
- Workspaces, miembros e invitaciones.
- Aceptacion de invitaciones.
- Documentos e historial.
- Versiones de documentos.
- Plantillas, procesado y borrado.
- Marca personalizada.
- Notificaciones y auditoria.

## Cambio aplicado

### `/workspace`

Antes, la pagina cargaba invitaciones pendientes con service role para todos los workspaces donde el usuario era miembro.

Aunque la UI no permitia gestionarlas si no tenia permisos, los emails de invitaciones pendientes podian llegar al componente.

Ahora solo se cargan invitaciones para workspaces donde el usuario:

- es admin global, o
- tiene plan Empresa y rol `admin` de workspace, o
- tiene permiso `can_invite_members`.

Archivo afectado:

- `app/workspace/page.tsx`

## Matriz de service role

| Zona | Uso | Check previo | Estado |
| --- | --- | --- | --- |
| `/admin` | metricas globales | `profile.role = admin` | Correcto |
| `/admin/catalogo-comunitario` | candidatos + solicitudes | `profile.role = admin` | Correcto |
| API admin requests | editar/convertir solicitudes | `profile.role = admin` | Correcto |
| API community candidates | editar candidatos | `profile.role = admin` | Correcto |
| Stripe webhook | actualizar planes | firma Stripe verificada | Correcto |
| Workspace members | crear/editar/borrar miembros | `requireWorkspaceAdmin` + plan Empresa | Correcto |
| Workspace invitations | crear/revocar invitaciones | `canInviteMembers` + plan Empresa | Correcto |
| Accept invitation | aceptar por token | token hash + email exacto | Correcto |
| Workspace page | perfiles de miembros | usuario miembro del workspace | Correcto |
| Workspace page | invitaciones pendientes | admin/permisos de invitacion | Corregido |
| Documents clear | borrar historial | `user.id` en query | Correcto |
| Documents update/delete | modificar documento | `user.id` en query | Correcto |
| Document versions | leer/restaurar | `user.id` en query | Correcto |
| Templates delete/process | gestionar plantilla | propietario o `manage_templates` | Correcto |
| Brand settings | guardar marca | `user.id` en upsert | Correcto |
| Notifications | marcar leidas | `user.id` en query | Correcto |
| Audit helper | crear auditoria/notificaciones | server helper, service role | Correcto |

## Riesgos residuales

- Las rutas admin dependen de `profile.role = admin`; proteger bien la promocion a admin sigue siendo critico.
- El service role debe existir solo en servidor/Vercel, nunca en cliente.
- Las invitaciones funcionan por token secreto: cualquiera con el enlace puede ver email invitado y nombre de workspace, pero solo el email invitado puede aceptar.
- `brand-logos` sigue siendo publico para lectura por diseno.

## Checklist manual

1. Usuario miembro sin permiso de invitar entra en `/workspace`: no debe ver invitaciones pendientes.
2. Usuario con permiso `can_invite_members` entra en `/workspace`: debe ver invitaciones pendientes de su workspace.
3. Usuario solo lectura intenta llamar a APIs de miembros/invitaciones: debe recibir 403.
4. Usuario no propietario intenta borrar documento ajeno por API: debe recibir 404/403.
5. Usuario no gestor intenta procesar plantilla de workspace: debe recibir 403.
