# Security Operations QA

Checklist principal: `docs/security-operations-qa.md`.

Resumen de cierre:

- Ejecutar `npm run lint`.
- Ejecutar `npm run build`.
- Validar `/admin` con usuario admin.
- Validar que usuario normal no accede a `/admin` ni `/api/admin/health`.
- Revisar bloque `Health checks`.
- Resolver una alerta operativa si existe.
- Ejecutar `select * from public.cleanup_operational_logs();` en Supabase.
