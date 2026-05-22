# Logs de seguridad y panel admin

La fase 11.4 añade una tabla dedicada para eventos sensibles:

- `security_events`: bloqueos por rate limit y futuras senales de abuso.
- `rate_limit_events`: actividad por accion, usuario y workspace.
- `workspace_audit_events`: cambios sensibles de Empresa como invitaciones, roles y permisos.

## Panel admin

La ruta `/admin` muestra:

- Resumen de bloqueos y severidad.
- Acciones con mas actividad por rate limit.
- Ultimos eventos bloqueados.
- Actividad sensible de workspaces.

## SQL necesario

Ejecuta `supabase-security-events.sql` en Supabase SQL Editor.

La app registra eventos con el cliente autenticado cuando el usuario alcanza un limite. Si la tabla aun no existe, la app no bloquea la funcionalidad: solo veras `security_event_record_error` en logs hasta aplicar el SQL.

## Limpieza recomendada

Los logs de seguridad pueden crecer. Para MVP, retener 90 dias es suficiente:

```sql
delete from public.security_events
where created_at < now() - interval '90 days';
```

En produccion, conviene revisar semanalmente eventos `high` y picos por workspace.
