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

La fase 2.2/2.3 mejora el uso de plantillas:

- Selector de modo de uso en `/generar`.
- Modos: estructura + tono, solo estructura, tono y estilo, inspiración ligera.
- `POST /api/generate` acepta `templateUsageMode`.
- El prompt adapta las instrucciones segun el modo elegido y prioriza siempre los datos del formulario.

La fase 2.4 guarda la relacion entre documento y plantilla:

- Nuevas columnas opcionales en `documents`: `reference_template_id`, `reference_template_name`, `template_usage_mode`.
- SQL incremental: `supabase-template-generation-2.4.sql`.
- Cada documento generado con plantilla conserva la referencia usada para mostrarla luego en historial.

La fase 2.5 mejora historial:

- Badge `Con plantilla` en documentos generados con referencia.
- Link a la plantilla usada.
- Acciones para crear otro documento con la misma plantilla.
- La regeneracion conserva `referenceTemplateId` y `templateUsageMode`.

La fase 2.1 mejora el selector de plantillas en `/generar`:

- Muestra categoria, resumen y fecha de la plantilla seleccionada.
- Enlace directo a la ficha de plantilla.
- Aviso claro de que la referencia no debe copiar datos concretos.

Para cerrar QA de esta fase, usa `TEMPLATE_LIBRARY_QA.md`.

Para cerrar QA de calidad de generacion con plantillas, usa `TEMPLATE_GENERATION_QA.md`.

## Generador libre

La fase 3.1 prepara el modelo de datos para el flujo `No encuentro mi documento`:

- Tabla `document_requests`.
- SQL incremental: `supabase-custom-generator-3.1.sql`.
- Estados `submitted`, `reviewing`, `approved`, `rejected` y `converted`.
- Tonos controlados para peticiones libres.
- Relacion opcional con el documento generado.
- RLS para que el usuario vea sus solicitudes y admin pueda revisarlas.

La fase 3.2 añade `POST /api/custom-generate`:

- Valida sesion y payload con Zod.
- Respeta limite Free de 3 documentos al mes.
- Reutiliza rate limit por usuario.
- Genera con OpenAI Responses API.
- Guarda el resultado en `documents` con `doc_type = custom`.
- Crea una fila en `document_requests`.
- Incrementa `docs_this_month` y envia email de documento listo si Resend esta configurado.

La fase 3.3 añade UI en `/generar`:

- Selector de modo `Catalogo` / `A medida`.
- Formulario `No encuentro mi documento`.
- Llamada a `/api/custom-generate`.
- Resultado integrado con exportacion PDF/TXT/Word Pro e historial.

La fase 3.4 refuerza el prompt libre:

- Reglas especificas por tono.
- Heuristicas de riesgo legal, laboral, fiscal, inmobiliario, societario y datos.
- Tratamiento de peticiones ambiguas con campos `[PENDIENTE DE COMPLETAR]`.
- Prohibicion de inventar datos o prometer validez legal.

La fase 3.5 mejora historial para documentos libres:

- Badge `Personalizado` y categoria `A medida`.
- Filtro `A medida`.
- Detalle adaptado para `doc_type = custom`.
- Regeneracion de documentos personalizados usando `/api/custom-generate`.

La fase 3.6 añade solicitudes libres en admin:

- `/admin` lista las ultimas filas de `document_requests`.
- Muestra estado, tono, sector, uso previsto y enlace al documento generado.
- Incluye contadores rapidos de solicitudes nuevas, en revision y convertidas.

La fase 3.7 cierra QA del generador libre:

- Checklist reproducible en `CUSTOM_GENERATOR_QA.md`.
- Pruebas de flujo usuario, historial, admin, limites Free y seguridad del prompt.
- Verificacion tecnica con `npm run lint` y `npm run build`.

El modo `A medida` queda reservado para planes Pro y Empresa. Los usuarios Free lo ven bloqueado con CTA de upgrade y la API responde `pro_required` si intentan usarlo directamente.

## Catálogo comunitario

La fase 4.1 convierte el panel de solicitudes en una herramienta editable:

- API admin `PATCH /api/admin/document-requests/[id]`.
- Edición de estado: nueva, en revisión, candidata, descartada y convertida.
- Notas internas por solicitud.
- Los estados `approved` y `converted` preparan el camino para convertir solicitudes en catálogo oficial.

La fase 4.2 permite convertir solicitudes en definiciones internas:

- SQL incremental: `supabase-community-catalog-4.2.sql`.
- Nueva tabla `community_document_types`.
- API admin `POST /api/admin/document-requests/[id]/convert`.
- Botón `Convertir a candidato` en `/admin`.
- La solicitud pasa a `converted` y el candidato queda como `draft`, todavía sin publicarse en el catálogo.

La fase 4.3 añade el catálogo comunitario privado:

- Ruta admin `/admin/catalogo-comunitario`.
- Lista candidatos internos con filtros por búsqueda, estado y categoría.
- Muestra prompt base, campos sugeridos, plan requerido, notas y solicitud origen.
- Sigue siendo privado: no se mezcla con el catálogo público ni con `/generar`.

La fase 4.4 añade aprobación editorial:

- API admin `PATCH /api/admin/community-document-types/[id]`.
- Edición de nombre, descripción, categoría, estado, plan requerido, prompt base y notas.
- Estados disponibles: borrador, en revisión, aprobado, publicado y descartado.
- No requiere SQL nuevo: reutiliza `community_document_types`.

La fase 4.5 conecta candidatos aprobados con generación:

- SQL incremental: `supabase-community-generation-4.5.sql`.
- Nuevo modo `Comunidad` en `/generar`.
- API `POST /api/community-generate`.
- Usa tipos `approved` o `published` de `community_document_types`.
- Respeta `required_plan`, límites Free, rate limit, guardado en historial y emails.
- Los documentos se guardan con `doc_type = community:<slug>`.
- Ajuste QA 4.5.1: el prompt comunitario evita listar campos vacíos o metadatos sueltos al final del documento.

## Editor de documentos

La fase 5.1 añade edición local en el detalle de historial:

- `/historial/[id]` usa un visor editable.
- Botón `Editar` / `Vista previa`.
- Exportación PDF, TXT y Word usa el texto editado en pantalla.
- Botón `Restaurar` vuelve al contenido guardado.
- Muestra contador de palabras y caracteres.
- En esta fase los cambios son locales; el guardado en base de datos se implementará en 5.2.

La fase 5.2 guarda cambios manuales:

- `PATCH /api/documents/[id]` actualiza `documents.content` del usuario autenticado.
- El editor muestra botón `Guardar`, estado de guardado y errores.
- `Restaurar` vuelve al último contenido guardado.
- Las exportaciones usan siempre el contenido actual del editor.

La fase 5.3 añade versiones restaurables:

- SQL incremental: `supabase-document-versions-5.3.sql`.
- Nueva tabla `document_versions` con RLS por usuario.
- El primer guardado conserva el contenido original como versión 1.
- Cada guardado manual crea una versión nueva.
- El detalle de historial muestra versiones y permite restaurar una anterior.
- Al restaurar se crea una versión nueva con el contenido recuperado, sin borrar el historial.

La fase 5.4 mejora la experiencia de versiones:

- Cada versión puede desplegarse para revisar su contenido completo.
- Las versiones se pueden copiar al portapapeles.
- Una versión puede cargarse en el editor sin guardarla todavía.
- La restauración definitiva sigue creando una versión nueva para conservar trazabilidad.

La fase 5.5 añade mejora con IA desde el editor:

- API `POST /api/documents/[id]/improve`.
- Usa OpenAI Responses API y el modelo según plan.
- Mejora el contenido actual sin guardarlo automáticamente.
- Modos: más formal, más breve, más comercial, más natural, más prudente e instrucción propia.
- La mejora se carga en el editor como cambios pendientes; el usuario debe revisarla y pulsar `Guardar`.

La fase 5.6 añade comparación antes/después:

- La mejora IA no se aplica directamente al editor.
- Se muestra una comparación en dos columnas con texto actual y propuesta mejorada.
- El usuario puede aplicar la propuesta al editor o descartarla.
- Al aplicar, el contenido queda como cambio pendiente hasta pulsar `Guardar`.

La fase 5.7 añade edición asistida por instrucciones:

- Acciones rápidas dentro del editor: convertir en email, hacer más claro, añadir condiciones, resumen ejecutivo, detectar huecos y orientar a cliente.
- Cada acción usa la misma API de mejora IA y muestra comparación antes/después.
- El usuario puede seguir usando una instrucción propia cuando necesite un cambio específico.
- Ninguna mejora se guarda automáticamente; siempre queda pendiente hasta pulsar `Guardar`.

La fase 5.8 mejora la trazabilidad de versiones:

- SQL incremental: `supabase-document-version-trace-5.8.sql`.
- `document_versions` guarda origen del cambio: original, edición manual, mejora IA o restauración.
- Las versiones creadas desde mejora IA guardan modo, modelo y tokens.
- El historial de versiones muestra origen, modelo y tokens cuando existen.

La fase 5.9 mejora la claridad de limites y planes:

- El generador muestra un resumen lateral del plan activo: generaciones, Word, modo a medida y plantillas.
- El dashboard incluye una comparativa contextual Free vs Pro con capacidades activas o bloqueadas.
- Los resultados generados explican que Word es Pro y enlazan a precios cuando el usuario esta en Free.
- Los bloqueos quedan planteados como rutas claras de upgrade, no como errores.

## Biblioteca de plantillas

La fase 6.1 rediseña la biblioteca:

- Métricas de total, listas, procesando y errores.
- Búsqueda y filtros por estado/categoría.
- Tarjetas con estado, archivo, texto extraído, resumen y acciones.
- Procesado desde la propia biblioteca sin salir de la pantalla.

La fase 6.2 mejora el uso de plantillas en el generador:

- Selector visual de plantillas listas.
- Opción clara para generar sin plantilla.
- Vista previa de la plantilla seleccionada.
- Modos de uso explicados como decisiones: parecerse bastante, usar orden, usar tono o inspiración suave.

La fase 6.3 mejora la ficha de cada plantilla:

- CTA directo para crear un documento con esa plantilla cuando ya esta procesada.
- Metricas rapidas de estado, texto extraido, resumen y usos.
- Resumen, descripcion, texto extraido y metadatos separados en bloques claros.
- Listado de documentos generados con esa plantilla, con enlaces para abrirlos o reutilizarlos.

La fase 6.4 anade plantillas destacadas:

- Columna `is_favorite` en `document_templates`.
- Filtro de destacadas en la biblioteca.
- Boton para marcar o quitar una plantilla como destacada desde listado y detalle.
- Las plantillas destacadas aparecen primero en biblioteca y selector del generador.

La fase 6.5 anade metricas de uso de plantillas:

- Calculo de usos reales desde `documents.reference_template_id`.
- Metricas de total de usos, ultimo uso y modo mas utilizado.
- Resumen agregado en la biblioteca de plantillas.
- Analitica de uso en la ficha individual de cada plantilla.

## Generacion con plantillas premium

La fase 7.1 mejora el selector de plantillas en `/generar`:

- Busqueda por nombre, categoria o resumen.
- Vistas rapidas: todas, destacadas, usadas y recientes.
- Orden inteligente por destacadas, uso y fecha.
- Tarjetas con usos, ultimo uso y modo habitual.
- Estado vacio claro cuando los filtros no devuelven resultados.

La fase 7.2 anade vista previa de influencia:

- Explica como afectara la plantilla antes de generar.
- Cambia dinamicamente segun el modo: estructura + tono, estructura, tono o inspiracion ligera.
- Muestra que se usara, que queda limitado y que datos no se copiaran.
- Refuerza que los campos del formulario tienen prioridad sobre la plantilla.

La fase 7.3 mejora el prompt de plantillas:

- Cada modo tiene un contrato de uso con pesos de estructura, tono y contenido.
- La IA recibe jerarquia explicita: formulario, tipo documental, reglas DocuGen y plantilla.
- Refuerza reglas anti-copia para datos personales, importes, fechas, clausulas y condiciones concretas.
- Anade reglas de resolucion de conflictos cuando la plantilla no encaja con el tipo seleccionado.
- Incluye checklist interno para evitar que la plantilla contamine el documento final.

La fase 7.4 anade trazabilidad del resultado:

- La API devuelve la plantilla usada y el modo aplicado.
- El resultado inmediato muestra un bloque de trazabilidad con enlace a la plantilla.
- El historial muestra una seccion dedicada para documentos generados con plantilla.
- Se recuerda que la plantilla orienta estructura/tono, pero el formulario tiene prioridad.

La fase 7.5 mejora la reutilizacion desde historial:

- `templateId` recupera datos del documento, plantilla de referencia y modo aplicado.
- Los enlaces de historial conservan `templateUsageMode` cuando se crea otro documento con la misma plantilla.
- Los botones diferencian entre reutilizar datos y crear un documento nuevo con la misma plantilla.
- El generador muestra un aviso cuando carga datos y plantilla desde historial.

La fase 7.6 anade recomendaciones basicas de plantillas:

- El generador sugiere hasta 3 plantillas antes del listado completo.
- El ranking combina destacadas, usos reales, ultimo uso y afinidad de categoria.
- Cada recomendacion muestra una razon clara: destacada, mas usada, categoria similar o reciente.
- El usuario puede aceptar una recomendacion o seguir buscando manualmente.

La fase 7.7 cierra QA de calidad con plantillas:

- Checklist extendido en `TEMPLATE_GENERATION_QA.md`.
- Matriz de pruebas para detectar copia de datos, contaminacion de tipo documental y perdida de trazabilidad.
- Validacion de selector, recomendaciones, vista previa de influencia, historial y permisos Pro/Free.
- Criterios de aceptacion claros antes de avanzar a fases mas avanzadas de plantillas.

La fase 8.1 mejora la subida de plantillas:

- La biblioteca permite seleccionar varios PDF/DOC/DOCX en una sola accion.
- Cada archivo se registra como plantilla independiente.
- La UI muestra una cola de subida con estado por archivo: pendiente, subiendo, lista o error.
- Los metadatos comunes, como categoria y descripcion, se aplican a todas las plantillas subidas en lote.
- Si un archivo falla, el resto puede continuar sin perder la subida completa.

La fase 8.2 profundiza el procesamiento de plantillas DOCX:

- El procesador extrae parrafos, secciones, clausulas o bloques reutilizables.
- Detecta posibles variables a partir de placeholders y etiquetas.
- Sugiere categoria y tono de la plantilla.
- Marca senales de datos concretos, como emails, NIF/CIF, telefonos, importes, fechas o cuentas bancarias.
- Calcula avisos de calidad para saber si una plantilla es demasiado breve, poco estructurada o contiene datos sensibles.
- La ficha de plantilla muestra el analisis y el generador recibe estos metadatos como contexto adicional.

La fase 8.3 convierte variables detectadas en variables revisables:

- La ficha de plantilla incluye un editor de variables.
- El usuario puede corregir, anadir o quitar variables detectadas.
- Las variables se guardan dentro de `extracted_metadata.variables`, sin requerir migracion SQL adicional.
- El prompt de plantillas ya recibe las variables revisadas como parte del analisis estructurado.
- Esta fase deja preparada la generacion desde plantilla concreta de la fase 8.4.

La fase 8.4 anade generacion desde plantilla concreta:

- Nueva ruta privada `/plantillas/[id]/generar`.
- La ficha de plantilla diferencia entre `Usar como referencia` y `Generar desde variables`.
- La generacion directa crea un formulario dinamico con las variables revisadas.
- Nueva API `POST /api/templates/[id]/generate`, protegida y solo Pro/Empresa.
- El documento generado se guarda en historial con `reference_template_id`, trazabilidad y exportacion PDF/TXT/Word.
- El prompt usa la plantilla como modelo principal, sustituyendo datos por los valores introducidos y evitando copiar informacion sensible del original.

La fase 8.5 anade QA de plantillas subidas:

- Informe reutilizable de calidad en `lib/template-qa.ts`.
- Badges de QA en tarjetas de biblioteca.
- Bloque `QA de plantilla` en la ficha con checks de texto, estructura, variables, datos concretos y calidad.
- Avisos visibles cuando se detectan emails, NIF/CIF, telefonos, importes, fechas o cuentas bancarias.
- Checklist manual en `TEMPLATE_UPLOAD_QA.md`.

## Asistente conversacional

La fase 9.1 anade chat libre Pro:

- Nueva ruta protegida `/asistente`.
- Nueva API `POST /api/assistant/chat`.
- Persistencia en `chat_sessions` y `chat_messages`.
- Historial lateral de conversaciones recientes.
- El asistente ayuda a definir el documento, pedir datos faltantes y recomendar el siguiente paso.
- En esta fase no genera todavia el documento final desde el chat; eso queda preparado para 9.2.

La fase 9.2 anade generacion guiada desde chat:

- Nueva API `POST /api/assistant/generate`.
- Convierte una conversacion guardada en un documento final.
- Guarda el resultado en `documents` con `doc_type = assistant`.
- Registra la solicitud en `document_requests` para futura revision/admin.
- Marca la conversacion como `completed`.
- Muestra el documento generado dentro de `/asistente` con exportacion PDF/TXT/Word.

La fase 9.3 mejora la propuesta de nuevos tipos documentales:

- Helper `lib/assistant-proposals.ts` para convertir conversaciones en propuestas revisables.
- La generacion desde asistente crea `document_requests` enriquecidas con titulo, categoria, tono, campos sugeridos y notas internas.
- Las propuestas nacidas del asistente entran directamente en estado `reviewing`.
- El chat muestra confirmacion de que la propuesta fue enviada a revision.
- El admin muestra badge `Asistente` en solicitudes nacidas del chat y puede convertirlas a candidato comunitario.

La fase 9.4 mejora el catalogo comunitario asistido:

- El catalogo privado muestra metricas de candidatos, asistidos, publicables y publicados.
- Nuevo filtro por origen: asistente u otros.
- Cada candidato incluye checklist asistido de nombre, descripcion, prompt, campos y origen.
- Acciones rapidas para aprobar o publicar candidatos.
- Los candidatos nacidos del asistente aparecen marcados y son mas faciles de revisar antes de publicarlos.

## Workspaces / Empresa

La fase 10.1 expone el workspace real:

- Nueva ruta protegida `/workspace`.
- Vista de workspace principal, miembros y documentos asociados.
- Tipos compartidos `WorkspaceRow` y `WorkspaceMemberRow`.
- Navegacion superior con acceso a `Workspace`.
- La base usa las tablas ya existentes `workspaces` y `workspace_members`, creadas automaticamente al registrar usuarios.
- Las invitaciones y documentos compartidos reales quedan preparados para los siguientes pasos.

La fase 10.11 deja una guia de QA real de Empresa:

- Checklist de Stripe Checkout para Empresa.
- Validacion de webhooks de alta, cambio, cancelacion y pago fallido.
- Pruebas SQL para comprobar `profiles.plan`, `workspaces.plan` y permisos de invitados.
- Guia disponible en `docs/qa-empresa.md`.

La fase 11.1 endurece seguridad y RLS:

- Helpers RLS para plan y permisos de workspace.
- Policies de Empresa reforzadas en documentos, plantillas, miembros e invitaciones.
- Insercion directa de auditoria/notificaciones restringida.
- Bucket `brand-logos` limitado a carpetas por usuario para escritura.
- Informe disponible en `docs/security-rls-audit.md`.

La fase 11.2 revisa rutas server con service role:

- Matriz de endpoints que saltan RLS con `createSupabaseServiceClient`.
- Correccion de lectura de invitaciones pendientes en `/workspace`.
- Checklist manual para validar permisos server-side.
- Informe disponible en `docs/service-role-audit.md`.

La fase 11.3 añade rate limits por accion y workspace:

- Nueva tabla `rate_limit_events` para eventos anti-abuso por usuario, accion y workspace.
- Limites adicionales en generacion, mejoras IA, asistente, plantillas, invitaciones y miembros.
- Falla en abierto si falta la tabla para no romper despliegues antes de ejecutar SQL.
- SQL incremental: `supabase-rate-limit-events.sql`.
- Informe disponible en `docs/rate-limits-anti-abuse.md`.

La fase 11.4 añade logs de seguridad y panel admin:

- Nueva tabla `security_events` para bloqueos por rate limit y eventos sensibles.
- `/admin` muestra resumen de seguridad, acciones con mas actividad y cambios sensibles de workspaces.
- Los bloqueos por rate limit se registran automaticamente con severidad.
- SQL incremental: `supabase-security-events.sql`.
- Informe disponible en `docs/security-events-admin.md`.

## Comandos

```bash
npm run lint
npm run build
npm run dev
```

## Aviso legal del producto

DocuGen genera borradores con IA basados en la información introducida por el usuario. Los documentos deben revisarse antes de usarse y, si pueden tener efectos legales, laborales, fiscales o contractuales, deben validarse por un profesional cualificado.
