# Alertas operativas

La fase 11.5 separa los logs de seguridad de las alertas accionables.

## Tabla

`operational_alerts` guarda avisos con estado:

- `open`
- `acknowledged`
- `resolved`

Incluye `dedupe_key` para evitar crear avisos duplicados mientras una alerta similar sigue abierta.

## Generacion automatica

Cuando `recordSecurityEvent` recibe un evento con severidad `high`, crea una alerta operativa asociada.

Actualmente esto cubre:

- Bloqueos por rate limit a nivel workspace.
- Futuros eventos sensibles que se marquen como `high`.

## Panel admin

`/admin` muestra las alertas abiertas y permite resolverlas desde la propia interfaz.

## SQL necesario

Ejecuta `supabase-operational-alerts.sql` en Supabase SQL Editor despues de `supabase-security-events.sql`.

## Limpieza

Mantener alertas resueltas puede ser util para historico. Para MVP, una limpieza anual es suficiente:

```sql
delete from public.operational_alerts
where status = 'resolved'
and resolved_at < now() - interval '365 days';
```
