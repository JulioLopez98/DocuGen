# Configurar Stripe Empresa

## Objetivo

Activar el plan Empresa de DocuGen por 39 EUR/mes.

La app ya espera esta variable:

```text
STRIPE_PRICE_ID_EMPRESA=price_...
```

## 1. Crear producto y precio en Stripe

En Stripe, modo test o live según entorno:

1. Ve a Product catalogue.
2. Crea un producto llamado `DocuGen Empresa`.
3. Crea un precio recurrente mensual:
   - Importe: `39 EUR`
   - Recurring: mensual
4. Copia el **Price ID**, no el Product ID.

Debe empezar por:

```text
price_
```

No uses el `prod_...`; la app necesita el `price_...`.

## 2. Añadir variable en Vercel

En Vercel:

1. Project Settings.
2. Environment Variables.
3. Añade o actualiza:

```text
STRIPE_PRICE_ID_EMPRESA=price_xxxxxxxxx
```

Selecciona:

```text
Production and Preview
```

Después haz redeploy.

## 3. Actualizar `.env.local`

En local:

```text
STRIPE_PRICE_ID_EMPRESA=price_xxxxxxxxx
```

Reinicia Next:

```powershell
npm run dev
```

## 4. Configurar Billing Portal para Pro -> Empresa

Importante:

- Free -> Empresa usa Stripe Checkout.
- Pro -> Empresa abre Stripe Billing Portal para evitar crear una segunda suscripción.

En Stripe:

1. Ve a Billing > Customer portal.
2. Activa `Subscription updates`.
3. Permite cambiar productos/precios.
4. Añade los precios:
   - `DocuGen Pro` mensual
   - `DocuGen Empresa` mensual
5. Guarda la configuración.

Si no haces esto, un usuario Pro abrirá el portal, pero no verá una opción clara para cambiar a Empresa.

## 5. Webhook

El endpoint debe apuntar a:

```text
https://TU_DOMINIO/api/webhooks/stripe
```

Eventos necesarios:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
```

El signing secret del webhook debe estar en:

```text
STRIPE_WEBHOOK_SECRET=whsec_...
```

El webhook tambien hace limpieza defensiva: cuando un cliente queda con una suscripcion activa nueva,
DocuGen intenta cancelar las suscripciones activas duplicadas del mismo customer para evitar que convivan
Pro y Empresa a la vez.

## 6. Limpiar duplicados de prueba

Si durante las pruebas se crearon varias suscripciones para el mismo email, limpialas una vez desde Stripe:

1. Ve a Billing > Subscriptions.
2. Filtra por el email del usuario.
3. Conserva solo la suscripcion correcta, normalmente `DocuGen Empresa` si ya has actualizado.
4. Abre cada suscripcion duplicada de `DocuGen Pro`.
5. Pulsa `Cancel subscription`.
6. Si Stripe ofrece la opcion, elige cancelacion inmediata en test.

Despues de desplegar este cambio, el webhook deberia evitar que se vuelvan a acumular duplicados.

## 7. QA rápido

### Free -> Empresa

1. Entra con usuario Free.
2. Ve a `/precios`.
3. Pulsa `Actualizar a Empresa`.
4. Completa Checkout.
5. Comprueba que `profiles.plan = 'empresa'`.

### Pro -> Empresa

1. Entra con usuario Pro.
2. Pulsa `Cambiar a Empresa`.
3. Debe abrirse Billing Portal.
4. Cambia la suscripción a Empresa.
5. Comprueba que `profiles.plan = 'empresa'`.

## SQL de comprobación

```sql
select email, plan, stripe_customer_id
from public.profiles
where email = 'TU_EMAIL_AQUI';
```
