# Seguridad final

Fecha: 2026-06-02

## Cambios aplicados

- Middleware reforzado para proteger también `/asistente`, `/workspace` y `/ajustes`.
- Cabeceras de seguridad globales en Next:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` restrictiva
  - `Content-Security-Policy` mínima para `frame-ancestors`, `base-uri`, `object-src` y `form-action`
  - `Strict-Transport-Security` solo cuando `NEXT_PUBLIC_APP_URL` usa HTTPS
- Logs de Resend reducidos para evitar guardar destinatarios, títulos de documentos o nombres de workspace en logs/metadata de errores.

## Comprobaciones realizadas

- Búsqueda de secretos hardcodeados en `app`, `components` y `lib`.
- Revisión de uso de `SUPABASE_SERVICE_ROLE_KEY`.
- Revisión de Stripe webhook con firma.
- Revisión de rutas protegidas por middleware.
- Revisión de `dangerouslySetInnerHTML`: limitado a JSON-LD generado desde configuración local.

## Pendiente manual

1. Confirmar en Vercel que `NEXT_PUBLIC_APP_URL` es la URL HTTPS de producción para activar HSTS.
2. Probar en producción que `/asistente`, `/workspace` y `/ajustes` redirigen a `/auth` sin sesión.
3. En Supabase, revisar que RLS sigue activado en tablas sensibles después de cualquier migración futura.
4. En Stripe, confirmar que solo existe el webhook de producción y que el signing secret corresponde a ese endpoint.

## Nota

La CSP aplicada es deliberadamente conservadora y compatible con Next. No bloquea scripts globalmente para evitar romper hidratación, pero sí impide embedding externo, objetos y formularios fuera del propio origen.
