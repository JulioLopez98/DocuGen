# QA Empresa

Esta guia valida el flujo real del plan Empresa en modo test: checkout, webhook, portal, permisos y downgrade.

## Requisitos previos

- `STRIPE_SECRET_KEY` configurada.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` configurada.
- `STRIPE_WEBHOOK_SECRET` configurada con el signing secret del webhook activo.
- `STRIPE_PRICE_ID_PRO` configurada con el precio mensual de Pro.
- `STRIPE_PRICE_ID_EMPRESA` configurada con el precio mensual de Empresa.
- Webhook de Stripe apuntando a `/api/webhooks/stripe`.
- Eventos escuchados en Stripe:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

## Tarjeta de prueba

Usa una tarjeta test de Stripe:

```text
4242 4242 4242 4242
Fecha: cualquier fecha futura
CVC: cualquier 3 digitos
ZIP: cualquier codigo valido
```

## Caso 1: Free -> Empresa

1. Inicia sesion con un usuario Free.
2. Ve a `/precios`.
3. Pulsa `Actualizar a Empresa`.
4. Completa Checkout con tarjeta test.
5. Vuelve a DocuGen.
6. Comprueba en Supabase:

```sql
select id, email, plan, stripe_customer_id
from public.profiles
where email = 'TU_EMAIL_AQUI';
```

Resultado esperado:

- `profiles.plan = 'empresa'`.
- `profiles.stripe_customer_id` relleno.
- Los workspaces del usuario quedan con `plan = 'empresa'`.

```sql
select id, name, owner_id, plan
from public.workspaces
where owner_id = 'USER_ID_AQUI';
```

## Caso 2: Empresa desbloquea workspace

1. Entra en `/workspace`.
2. Comprueba que puedes:
   - Ver miembros.
   - Invitar miembros.
   - Cambiar roles.
   - Ver actividad/auditoria.
   - Ver notificaciones internas.
3. Invita un usuario como `Solo lectura`.
4. Acepta la invitacion con ese email.
5. Comprueba:

```sql
select wm.role,
       wm.can_create_documents,
       wm.can_upload_templates,
       wm.can_manage_templates,
       wm.can_invite_members
from public.workspace_members wm
join public.profiles p on p.id = wm.user_id
where p.email = 'EMAIL_INVITADO_AQUI';
```

Resultado esperado para Solo lectura:

- `role = 'member'`.
- Todos los permisos en `false`.

## Caso 3: Pro -> Empresa desde portal

1. Usa un usuario con plan Pro y `stripe_customer_id`.
2. Desde Dashboard o Ajustes pulsa `Actualizar a Empresa`.
3. Debe abrirse el Portal de Stripe, no un checkout nuevo.
4. Cambia la suscripcion a Empresa en el portal.
5. Comprueba en Supabase que el webhook actualizo:

```sql
select email, plan, stripe_customer_id
from public.profiles
where email = 'TU_EMAIL_AQUI';
```

Resultado esperado:

- `plan = 'empresa'`.

Nota: para que este cambio aparezca en el portal, en Stripe Billing Portal debes permitir cambios entre los precios Pro y Empresa.

## Caso 4: Empresa -> cancelacion

1. Abre el Portal de Stripe.
2. Cancela la suscripcion.
3. Espera al webhook `customer.subscription.deleted`.
4. Comprueba:

```sql
select email, plan
from public.profiles
where email = 'TU_EMAIL_AQUI';
```

Resultado esperado:

- `plan = 'free'`.

## Caso 5: Pago fallido

Puedes simular `invoice.payment_failed` desde Stripe CLI o desde el dashboard de eventos test.

Resultado esperado:

- El usuario vuelve a `plan = 'free'`.
- El workspace del propietario vuelve a `plan = 'free'`.

## Stripe CLI local

Si haces QA en local:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copia el `whsec_...` en `.env.local` como `STRIPE_WEBHOOK_SECRET` y reinicia Next.

## Checklist final

- Free puede contratar Empresa.
- Pro no crea una segunda suscripcion al intentar subir a Empresa: abre portal.
- Empresa activa permisos de workspace.
- Roles avanzados se guardan bien al invitar.
- Webhook sincroniza `profiles.plan`.
- Webhook sincroniza `workspaces.plan`.
- Cancelacion vuelve a Free.
- Pago fallido vuelve a Free.
