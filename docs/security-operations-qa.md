# QA final de seguridad y operaciones

Esta checklist cierra la fase 11.9. Sirve para validar que la capa operativa de DocuGen funciona antes de un deploy importante.

## Preparacion

Necesitas:

- Un usuario admin.
- Un usuario Pro o Empresa no admin.
- Un usuario Free.
- Variables de entorno completas en local o Vercel.
- SQL aplicado hasta la fase 11.8.

Comandos previos:

```bash
npm run lint
npm run build
```

## 1. Acceso admin

| Prueba | Resultado esperado |
| --- | --- |
| Entrar en `/admin` sin sesion | Redirige a `/auth` |
| Entrar en `/admin` con usuario normal | Redirige a `/dashboard` |
| Entrar en `/admin` con usuario admin | Muestra panel admin |
| Abrir `/admin/catalogo-comunitario` con admin | Carga candidatos comunitarios |
| Abrir `/api/admin/health` con admin | Devuelve JSON con `report` |
| Abrir `/api/admin/health` con usuario normal | Devuelve 403 |

## 2. Health checks

En `/admin`, bloque `Health checks`:

- `Supabase URL`, `anon key` y `service role` deben estar OK.
- `profiles`, `documents`, `rate_limit_events`, `security_events`, `operational_alerts` y `api_error_events` deben estar accesibles.
- `OPENAI_API_KEY` debe estar OK.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y `STRIPE_PRICE_ID_PRO` deben estar OK.
- `STRIPE_PRICE_ID_EMPRESA` puede ser aviso si Empresa no se vende aun.
- `RESEND_FROM_EMAIL` puede ser aviso si se usa el remitente por defecto.

## 3. Rate limits y seguridad

Pruebas manuales:

| Prueba | Resultado esperado |
| --- | --- |
| Generar documentos normalmente | Se guarda documento y evento de generacion |
| Usar asistente Pro | Se registran eventos `assistant_chat` |
| Subir/procesar plantilla Pro | Se registran eventos `template_upload` / `template_process` |
| Invitar miembros en Empresa | Se registra `workspace_invite` |
| Cambiar roles/permisos Empresa | Se registra `workspace_member_manage` y auditoria |

Consultas opcionales:

```sql
select action, count(*)
from public.rate_limit_events
group by action
order by count(*) desc;
```

```sql
select event_type, severity, count(*)
from public.security_events
group by event_type, severity
order by count(*) desc;
```

## 4. Alertas operativas

En `/admin`, bloque `Alertas`:

- Las alertas abiertas deben aparecer arriba.
- Boton `Resolver` debe cambiar estado a `resolved`.
- Las alertas resueltas no deben volver a aparecer como abiertas.

Consulta opcional:

```sql
select status, severity, count(*)
from public.operational_alerts
group by status, severity
order by status, severity;
```

## 5. Monitorizacion de APIs

Casos controlados:

- Si falta `OPENAI_API_KEY`, `/api/generate` debe devolver `openai_not_configured` y registrar `api_error_events`.
- Si falta `STRIPE_SECRET_KEY`, checkout/portal deben registrar error Stripe.
- Si Resend falla al enviar invitacion, debe registrar error `resend` y alerta si es invitacion workspace.

Consulta opcional:

```sql
select provider, error_code, severity, count(*)
from public.api_error_events
group by provider, error_code, severity
order by count(*) desc;
```

## 6. RLS y service role

Validar:

- Usuario Free no ve documentos de otro usuario.
- Usuario Pro no ve workspaces ajenos.
- Miembro Empresa sin permiso no puede invitar miembros.
- Miembro Empresa sin permiso no puede subir plantillas al workspace.
- Service role solo se usa en rutas con comprobacion previa de usuario, admin, workspace o permiso.

Referencia: `docs/service-role-audit.md`.

## 7. Limpieza de logs

Ejecutar:

```sql
select * from public.cleanup_operational_logs();
```

Resultado esperado:

- Devuelve una fila con contadores.
- Puede devolver todo `0` si no hay logs antiguos.
- No elimina documentos, perfiles, plantillas ni workspaces.

## 8. Smoke test de producto

| Flujo | Resultado esperado |
| --- | --- |
| Auth con Google | Entra y crea/encuentra profile |
| Generador catalogo | Devuelve documento visible al terminar |
| Exportar PDF | Descarga PDF |
| Exportar Word Pro | Descarga docx si plan Pro/Empresa |
| Historial | Lista, abre, reutiliza y borra documentos |
| Plantillas Pro | Sube, procesa y genera desde plantilla |
| Chat Pro | Conversa y genera documento |
| Checkout Pro | Redirige a Stripe |
| Portal Stripe | Abre portal de cliente |

## Criterio de cierre

La fase 11 se considera cerrada cuando:

- `npm run lint` pasa.
- `npm run build` pasa.
- `/admin` carga sin errores para admin.
- Health checks no muestran errores criticos inesperados.
- Las tablas operativas existen.
- Los usuarios no admin no pueden acceder a paneles ni APIs admin.
- La limpieza de logs ejecuta correctamente.
