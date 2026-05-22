# Limpieza y retencion de logs

La fase 11.8 crea una funcion SQL de limpieza para eventos operativos temporales.

## Funcion

`cleanup_operational_logs()` elimina:

- `generation_events` con mas de 30 dias.
- `rate_limit_events` con mas de 30 dias.
- `security_events` con mas de 90 dias.
- `api_error_events` con mas de 90 dias.
- `operational_alerts` resueltas con mas de 365 dias.

Los documentos, perfiles, plantillas, workspaces, auditoria de workspace y datos de negocio no se eliminan.

## Ejecucion manual

```sql
select * from public.cleanup_operational_logs();
```

## Retenciones personalizadas

```sql
select * from public.cleanup_operational_logs(
  generation_events_days := 14,
  rate_limit_events_days := 14,
  security_events_days := 60,
  api_error_events_days := 60,
  resolved_alerts_days := 180
);
```

## Scheduler opcional

Si habilitas `pg_cron` en Supabase, puedes programarlo a diario:

```sql
select cron.schedule(
  'docugen-cleanup-operational-logs',
  '15 3 * * *',
  $$select * from public.cleanup_operational_logs();$$
);
```

Recomendacion MVP: empezar ejecutandolo manualmente y activar scheduler cuando haya uso real.
