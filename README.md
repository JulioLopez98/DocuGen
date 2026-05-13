# DocuGen

DocuGen es un SaaS freemium para generar borradores profesionales de documentos laborales, comerciales y legales orientados al mercado español. No sustituye asesoramiento legal, laboral, fiscal ni profesional.

## Stack

- Next.js 14 App Router, TypeScript estricto y Tailwind CSS
- Supabase Auth, PostgreSQL, RLS y Storage
- Stripe Checkout, suscripciones, portal y webhooks
- OpenAI Responses API con el paquete oficial `openai`
- jsPDF para PDF, `docx`, Resend y React Email preparados para Fase 2

## Instalación

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## Variables

Rellena en `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL_DEFAULT=gpt-4.1-mini
OPENAI_MODEL_PREMIUM=gpt-4.1
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO=
STRIPE_PRICE_ID_EMPRESA=
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=
```

## Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. Copia URL, anon key y service role key a `.env.local`.
3. Ejecuta `supabase-schema.sql` en el SQL Editor.
4. En Authentication, activa magic link por email.
5. Para Google OAuth, configura el provider en Supabase y añade el callback permitido:
   `http://localhost:3000/auth/callback`.
6. En producción añade también `https://tu-dominio.vercel.app/auth/callback`.

El SQL crea perfiles, workspaces, documentos, límites, referidos, tablas de chat, bucket `brand-logos`, triggers y RLS.

Para activar solo la primera fase de biblioteca de plantillas sobre una base ya creada, ejecuta `supabase-template-library-1.1.sql`. Ese script crea la tabla `document_templates`, sus policies RLS y el bucket privado `document-templates`.

## Stripe

1. Crea un producto Pro mensual de 9 € y copia su Price ID en `STRIPE_PRICE_ID_PRO`.
2. Crea o reserva el Price ID Empresa para `STRIPE_PRICE_ID_EMPRESA`.
3. Configura el portal de cliente en Stripe.
4. Para webhooks locales:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copia el signing secret en `STRIPE_WEBHOOK_SECRET`. Eventos usados: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`.

## OpenAI

1. Crea una API key en [OpenAI](https://platform.openai.com).
2. Añade `OPENAI_API_KEY`.
3. Ajusta modelos con `OPENAI_MODEL_DEFAULT` y `OPENAI_MODEL_PREMIUM` si lo necesitas.

## Vercel

1. Sube el repo a GitHub.
2. Importa el proyecto en [Vercel](https://vercel.com/dashboard).
3. Añade las mismas variables de entorno.
4. Actualiza `NEXT_PUBLIC_APP_URL` con la URL pública.
5. Añade la URL pública en Supabase Auth y Stripe.

## Resend

Resend y React Email están preparados para Fase 2 con `lib/resend.ts`, `emails/welcome.tsx` y `emails/document-ready.tsx`. Añade `RESEND_API_KEY` cuando se integren envíos.

## Biblioteca de plantillas

La ruta protegida `/plantillas` queda preparada como entrada comercial y funcional para la futura biblioteca de documentos propios. La idea de esta fase es permitir que un usuario Pro suba Word/PDF, extraer estructura, tono y cláusulas reutilizables, y generar documentos nuevos manteniendo el estilo de su empresa.

Antes de activarla por completo conviene implementar:

- Subida de archivos con Supabase Storage.
- Tabla de plantillas con estado de procesamiento.
- Extracción de texto y estructura.
- Vista previa editable antes de guardar.
- Revisión manual antes de compartir plantillas con otros usuarios.

La fase 1.1 deja creada la base de datos:

- Tabla `document_templates`.
- Estados `uploaded`, `processing`, `ready` y `failed`.
- Bucket privado `document-templates`.
- RLS para que cada usuario acceda solo a sus plantillas.
- Subida limitada por policies a planes `pro` y `empresa`.

La fase 1.2 añade APIs protegidas:

- `GET /api/templates`: lista las plantillas del usuario.
- `POST /api/templates`: registra una plantilla ya subida al bucket `document-templates`.
- `DELETE /api/templates/[id]`: borra el registro y el archivo original.

El `POST /api/templates` espera `name`, `originalFilename`, `fileType`, `storagePath` y opcionalmente `description`, `category`, `mimeType` y `fileSize`. La ruta `storagePath` debe empezar por el id del usuario autenticado.

Las fases 1.3 y 1.4 convierten `/plantillas` en una biblioteca funcional para Pro:

- Listado de plantillas guardadas.
- Subida directa de PDF, DOC y DOCX a Supabase Storage.
- Registro automático en `document_templates`.
- Descarga del archivo original.
- Borrado de plantilla y archivo.
- Pantalla bloqueada para usuarios Free.

La fase 1.6 añade `/plantillas/[id]` como ficha privada de plantilla:

- Metadatos del archivo.
- Descarga y borrado desde detalle.
- Estado de procesamiento.
- Espacio preparado para texto extraído, resumen y errores.

La fase 1.5 añade procesamiento básico:

- `POST /api/templates/[id]/process`.
- Extracción básica de texto para archivos DOCX.
- Guardado de `extracted_text`, `summary`, `extracted_metadata` y estado `ready`.
- PDF y DOC quedan marcados como no soportados todavía, con mensaje claro.

La fase 1.7 conecta plantillas con el generador:

- `/generar` muestra un selector de plantillas procesadas.
- `POST /api/generate` acepta `referenceTemplateId`.
- La API valida que la plantilla sea del usuario, esté `ready` y tenga texto extraído.
- El prompt usa la plantilla solo como referencia de estructura y tono, sin copiar datos concretos.

Para cerrar QA de esta fase, usa `TEMPLATE_LIBRARY_QA.md`.

## Comandos

```bash
npm run lint
npm run build
npm run dev
```

## Aviso legal del producto

DocuGen genera borradores con IA basados en la información introducida por el usuario. Los documentos deben revisarse antes de usarse y, si pueden tener efectos legales, laborales, fiscales o contractuales, deben validarse por un profesional cualificado.
