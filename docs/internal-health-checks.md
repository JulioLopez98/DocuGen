# Health checks internos

La fase 11.7 añade una comprobacion operativa sin migracion SQL.

## Que comprueba

- Variables criticas de aplicacion.
- Supabase URL, anon key y service role.
- Tablas criticas: `profiles`, `documents`, `rate_limit_events`, `security_events`, `operational_alerts`, `api_error_events`.
- OpenAI API key y modelos configurados.
- Stripe secret key, webhook secret y price ids.
- Resend API key y remitente recomendado.

## Donde verlo

- Panel `/admin`, bloque "Health checks".
- API admin: `GET /api/admin/health`.

## Estados

- `OK`: listo para operar.
- `Aviso`: no bloquea todo el producto, pero conviene corregirlo.
- `Error`: falta una pieza critica o una tabla no es accesible.

## Notas

Los checks no hacen llamadas de pago ni envian emails. Son comprobaciones de configuracion y lecturas ligeras de Supabase.
