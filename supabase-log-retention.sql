create or replace function public.cleanup_operational_logs(
  generation_events_days integer default 30,
  rate_limit_events_days integer default 30,
  security_events_days integer default 90,
  api_error_events_days integer default 90,
  resolved_alerts_days integer default 365
)
returns table (
  generation_events_deleted integer,
  rate_limit_events_deleted integer,
  security_events_deleted integer,
  api_error_events_deleted integer,
  operational_alerts_deleted integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  generation_deleted integer := 0;
  rate_deleted integer := 0;
  security_deleted integer := 0;
  api_deleted integer := 0;
  alerts_deleted integer := 0;
begin
  delete from public.generation_events
  where created_at < now() - make_interval(days => greatest(generation_events_days, 1));
  get diagnostics generation_deleted = row_count;

  delete from public.rate_limit_events
  where created_at < now() - make_interval(days => greatest(rate_limit_events_days, 1));
  get diagnostics rate_deleted = row_count;

  delete from public.security_events
  where created_at < now() - make_interval(days => greatest(security_events_days, 1));
  get diagnostics security_deleted = row_count;

  delete from public.api_error_events
  where created_at < now() - make_interval(days => greatest(api_error_events_days, 1));
  get diagnostics api_deleted = row_count;

  delete from public.operational_alerts
  where status = 'resolved'
  and coalesce(resolved_at, updated_at, created_at) < now() - make_interval(days => greatest(resolved_alerts_days, 1));
  get diagnostics alerts_deleted = row_count;

  return query select generation_deleted, rate_deleted, security_deleted, api_deleted, alerts_deleted;
end;
$$;

-- Ejecucion manual recomendada para probar:
-- select * from public.cleanup_operational_logs();

-- Opcional si tienes pg_cron habilitado en Supabase:
-- select cron.schedule(
--   'docugen-cleanup-operational-logs',
--   '15 3 * * *',
--   $$select * from public.cleanup_operational_logs();$$
-- );
