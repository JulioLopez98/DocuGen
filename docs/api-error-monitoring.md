# Monitorizacion de errores de APIs

La fase 11.6 registra fallos criticos de proveedores y rutas server en `api_error_events`.

## Proveedores

- `openai`: generacion, asistente y plantillas.
- `stripe`: checkout, portal y webhooks.
- `resend`: emails transaccionales.
- `supabase`: preparado para errores de base de datos criticos.
- `app`: preparado para errores internos no asociados a proveedor.

## Alertas

Los errores con severidad `high` crean una alerta operativa deduplicada en `operational_alerts`.

Ejemplos:

- OpenAI no configurado.
- Fallo critico creando checkout o portal Stripe.
- Webhook Stripe mal configurado.
- Error enviando invitaciones por email.

## Panel admin

`/admin` muestra un bloque de errores monitorizados con proveedor, severidad, ruta, codigo y usuario si aplica.

## SQL necesario

Ejecuta `supabase-api-error-events.sql` en Supabase SQL Editor.

## Retencion recomendada

Para MVP, mantener 90 dias:

```sql
delete from public.api_error_events
where created_at < now() - interval '90 days';
```
