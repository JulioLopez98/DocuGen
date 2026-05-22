# Rate limits y anti-abuso

DocuGen aplica dos capas de control:

1. `generation_events`: limite historico de generaciones por usuario y hora.
2. `rate_limit_events`: limites por accion, usuario y, cuando aplica, workspace.

La segunda capa permite endurecer rutas sensibles sin mezclar todos los eventos en una sola categoria.

## Acciones protegidas

| Accion | Ruta principal | Usuario | Workspace |
| --- | --- | ---: | ---: |
| `document_generate` | generacion general, comunidad, a medida y desde plantilla | 10-80/h | 240/h en Empresa |
| `document_improve` | mejorar con IA y variantes | 10-60/h | No aplica |
| `assistant_chat` | chat libre Pro | 60-120/h | No aplica |
| `assistant_generate` | generar desde chat | 40-80/h | No aplica |
| `template_upload` | subida de plantillas | 25-60/h | 160/h en Empresa |
| `template_process` | procesamiento de plantillas | 15-40/h | 100/h en Empresa |
| `workspace_invite` | invitaciones Empresa | 20/h | 80/h |
| `workspace_member_manage` | altas, bajas y cambios de rol | 40/h | 160/h |

## SQL necesario

Ejecuta `supabase-rate-limit-events.sql` en Supabase SQL Editor para crear la tabla, indices y policies.

El helper de servidor falla en abierto si la tabla aun no existe, para evitar cortar produccion durante un despliegue, pero registrara `rate_limit_event_count_error` o `rate_limit_event_record_error` en logs hasta que se aplique el SQL.

## Limpieza recomendada

Los eventos de rate limit son efimeros. Programa una limpieza diaria con SQL o scheduler externo:

```sql
delete from public.rate_limit_events
where created_at < now() - interval '30 days';
```

Si el volumen crece, reducir la retencion a 7 dias es suficiente para los limites actuales.
