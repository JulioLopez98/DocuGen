# Documentacion completa del proyecto DocuGen / Borrantia

> Estado del documento: resumen tecnico, funcional y de portfolio del proyecto actual.
> Nombre actual en codigo: DocuGen.
> Marca recomendada para lanzamiento: Borrantia.

## 1. Resumen ejecutivo

DocuGen, futuro Borrantia, es una aplicacion SaaS para generar, editar, guardar y exportar documentos profesionales con inteligencia artificial, pensada especialmente para usuarios, autonomos y pequenas empresas en Espana.

La aplicacion no pretende sustituir a un abogado, asesor laboral, gestor o profesional cualificado. Su propuesta es acelerar la preparacion de una primera version de documentos profesionales, comerciales, laborales, web y legales, dejando claro que los resultados son borradores revisables.

El producto combina:

- Catalogo base de documentos predefinidos.
- Generacion guiada con formularios.
- Asistente conversacional Pro.
- Documentos a medida.
- Historial de documentos.
- Edicion posterior.
- Mejora con IA.
- Versionado.
- Exportacion PDF, TXT y Word.
- Plantillas propias subidas por el usuario.
- Mi catalogo personal.
- Workspace/Empresa.
- Suscripciones con Stripe.
- Autenticacion con Supabase.
- Emails transaccionales con Resend.
- Panel admin interno.
- Logs, health checks y operativa basica.

## 2. Problema que resuelve

Muchos profesionales necesitan redactar documentos recurrentes: presupuestos, contratos, cartas, politicas web, acuerdos, comunicaciones, actas, emails formales o documentos internos.

El problema no es solo escribir texto. El problema real es:

- Saber que estructura debe tener cada documento.
- No empezar desde cero.
- Mantener un tono profesional.
- Adaptarlo al contexto espanol.
- Guardar historico.
- Reutilizar documentos anteriores.
- Exportar a formatos utiles.
- No depender siempre de una plantilla estatica.
- Evitar errores graves de tono o formato.

DocuGen/Borrantia convierte ese proceso en un flujo guiado.

## 3. Propuesta de valor

La propuesta de valor puede resumirse asi:

> Crea documentos profesionales con IA en minutos, editables, exportables y adaptados al contexto espanol.

El valor diferencial frente a un simple chatbot es que la aplicacion:

- Tiene catalogo organizado por tipos de documento.
- Pide campos concretos segun cada documento.
- Aplica prompts especificos por familia documental.
- Guarda historial.
- Permite editar y mejorar documentos.
- Puede generar documentos desde plantillas propias.
- Permite crear tipos personalizados en Mi catalogo.
- Diferencia funciones Free, Pro y Empresa.
- Incluye avisos legales y limites de uso responsable.

## 4. Usuarios objetivo

Usuarios principales:

- Autonomos.
- Freelancers.
- Agencias pequenas.
- Consultores.
- Desarrolladores web.
- Pequenas empresas.
- Equipos administrativos.
- Profesionales que preparan propuestas, contratos, cartas o documentacion recurrente.

Usuarios secundarios:

- Gestorias pequenas.
- Equipos comerciales.
- Recursos humanos.
- Equipos internos que necesitan estandarizar documentacion.

## 5. Stack tecnologico

### Frontend

- Next.js 14 App Router.
- React 18.
- TypeScript estricto.
- Tailwind CSS.
- Componentes propios reutilizables.

### Backend

- API Routes de Next.js.
- Server Components en paginas protegidas.
- Supabase SSR para sesiones.
- Supabase service role solo en rutas servidor que lo necesitan.

### Base de datos y auth

- Supabase PostgreSQL.
- Supabase Auth.
- Magic link.
- Google OAuth.
- Row Level Security.
- Supabase Storage.

### IA / LLM

- OpenAI API.
- Paquete oficial `openai`.
- Responses API.
- Modelo configurable por variables de entorno:
  - `OPENAI_MODEL_DEFAULT`
  - `OPENAI_MODEL_PREMIUM`
- Por defecto:
  - Free: `gpt-4.1-mini`
  - Pro/Empresa: `gpt-4.1`

### Pagos

- Stripe.
- Checkout Sessions.
- Customer Portal.
- Webhooks firmados.
- Suscripciones mensuales.
- Planes Free, Pro y Empresa.

### Emails

- Resend.
- React Email.
- Emails de bienvenida.
- Email de documento listo.
- Invitaciones a workspace.

### Exportacion

- jsPDF para PDF.
- `docx` para Word.
- TXT desde cliente.

### Validacion

- Zod.
- React Hook Form.
- `@hookform/resolvers`.

### Deploy

- Vercel.
- Variables de entorno por entorno.
- Dominio propio recomendado: `borrantia.es`.

## 6. Arquitectura general

La arquitectura sigue un modelo SaaS clasico:

1. El usuario entra por la web publica.
2. Se registra o inicia sesion con Supabase Auth.
3. La sesion se lee en servidor con Supabase SSR.
4. Las rutas privadas se protegen mediante middleware y comprobaciones server-side.
5. El usuario genera documentos desde catalogo, asistente, plantillas o Mi catalogo.
6. Las API routes validan payloads con Zod.
7. Se comprueba plan, permisos y rate limit.
8. Se llama a OpenAI con prompts especializados.
9. Se guarda el documento en Supabase.
10. Se incrementan contadores de uso.
11. El usuario puede exportar, editar, mejorar, versionar o guardar en Mi catalogo.
12. Stripe sincroniza planes de pago mediante checkout, portal y webhooks.

## 7. Funcionalidades principales

### Landing page

La pagina publica explica:

- Que hace el producto.
- Para quien es.
- Documentos que puede generar.
- Como funciona.
- Diferencia entre catalogo, asistente, plantillas y Mi catalogo.
- Aviso de uso responsable.
- Llamadas a registro y precios.

### Autenticacion

La app usa Supabase Auth:

- Login con Google OAuth.
- Login por magic link.
- Callback en `/auth/callback`.
- Logout en `/auth/logout`.
- Middleware para proteger rutas privadas.

Rutas privadas destacadas:

- `/dashboard`
- `/generar`
- `/historial`
- `/asistente`
- `/mi-catalogo`
- `/plantillas`
- `/workspace`
- `/ajustes`
- `/admin`

### Dashboard

El dashboard funciona como centro de control:

- Estado del plan.
- Uso mensual.
- Acciones principales.
- Acceso a crear documento.
- Historial reciente.
- Avisos de plan o suscripcion.
- Primeros pasos segun plan.

### Crear documento

Es la zona principal de producto.

Permite:

- Elegir por categoria.
- Filtrar por Free/Pro.
- Buscar documentos.
- Seleccionar un tipo documental.
- Completar campos guiados.
- Usar una plantilla de referencia.
- Generar documento.
- Ver resultado.
- Exportar.
- Guardar en historial.
- Guardar en Mi catalogo cuando aplica.

### Catalogo base

El catalogo base contiene alrededor de 65 tipos documentales, organizados en familias:

- Laboral y servicios.
- Comercial.
- Legal.
- Web.
- Profesional.
- Empresa.
- Laboral.
- Digital.
- Inmobiliario.

Ejemplos:

- Contrato freelance.
- Presupuesto comercial.
- Propuesta de proyecto.
- Acuerdo NDA.
- Aviso legal web.
- Politica de privacidad.
- Carta de presentacion.
- Acuerdo de colaboracion.
- Contratos laborales.
- Contratos digitales.
- Politicas ecommerce.
- Actas.
- Reclamaciones.
- Recibos.
- Reconocimientos de deuda.
- Informes.
- Encargo de tratamiento de datos.

### Asistente conversacional

El asistente permite pedir documentos en lenguaje natural.

Ejemplo:

> Necesito responder formalmente a una reclamacion de un cliente por retraso en la entrega.

El asistente:

- Entiende la necesidad.
- Hace preguntas si falta informacion.
- Mantiene conversaciones guardadas.
- Permite generar documento desde la conversacion.
- Muestra el documento generado.
- Permite saltar al resultado con boton de "Ver documento".

Esta funcion es especialmente importante para Pro/Empresa, porque permite crear documentos que no estan en el catalogo base.

### Documentos a medida

Permite pedir un tipo documental libre:

- Titulo.
- Descripcion.
- Uso previsto.
- Tono.
- Sector.
- Datos necesarios.

La IA genera un documento aunque no exista tipo predefinido.

### Mi catalogo

Mi catalogo sustituye la antigua idea de catalogo comunitario abierto.

Su objetivo es que cada usuario pueda guardar tipos personalizados propios.

Casos de uso:

- El usuario crea un documento a medida.
- Si le gusta, lo guarda en Mi catalogo.
- La app puede extraer campos sugeridos.
- El usuario puede editar campos e instrucciones.
- Luego puede generar nuevos documentos de ese tipo.

Esto evita depender de aprobaciones manuales de comunidad y da control al usuario.

### Plantillas

La biblioteca de plantillas permite subir documentos propios, normalmente DOCX, para usarlos como referencia.

La app puede:

- Guardar plantilla.
- Procesarla.
- Extraer texto.
- Detectar estructura.
- Detectar tono.
- Detectar variables posibles.
- Usarla como referencia en generaciones.
- Generar directamente desde una plantilla concreta.
- Medir uso.
- Marcar favoritas/destacadas.

No es un RAG vectorial completo, pero si es una forma de generacion aumentada por contexto de plantilla.

### Historial / documentos

El historial permite:

- Ver documentos generados.
- Buscar y filtrar.
- Abrir documentos plegados.
- Descargar PDF/TXT/Word.
- Editar contenido.
- Guardar cambios.
- Ver versiones.
- Restaurar versiones anteriores.
- Mejorar con IA.
- Comparar antes/despues.
- Guardar documentos a Mi catalogo si son utiles como tipo reutilizable.
- Borrar documentos.
- Vaciar historial.

### Exportacion

Formatos soportados:

- PDF con jsPDF.
- TXT.
- DOCX con `docx`.

El PDF puede incluir:

- Portada.
- Marca.
- Logo.
- Cabeceras.
- Paginacion.
- Aviso legal.
- Bloque de firmas.

El DOCX permite:

- Documento editable.
- Marca personalizada.
- Logo insertado.
- Contenido estructurado.

### Marca personalizada

Los usuarios Pro/Empresa pueden configurar:

- Nombre de empresa.
- CIF/NIF.
- Direccion.
- Logo.

El logo se almacena en Supabase Storage.

Se usa en exportaciones PDF/Word.

### Workspace / Empresa

El modulo Empresa permite:

- Workspace personal o de equipo.
- Miembros.
- Invitaciones por email.
- Roles.
- Permisos.
- Actividad/auditoria.
- Notificaciones internas.
- Documentos y plantillas compartibles.

Es una base para vender plan Empresa.

### Precios y planes

Planes:

- Free.
- Pro.
- Empresa.

Free:

- Generaciones limitadas.
- Catalogo con parte de documentos gratuitos.
- Exportaciones basicas.

Pro:

- Mas documentos.
- Asistente.
- Documentos a medida.
- Word.
- Plantillas.
- Marca personalizada.
- Mi catalogo.

Empresa:

- Funciones de equipo.
- Workspace.
- Roles.
- Colaboracion.
- Funciones avanzadas.

### Stripe

La integracion gestiona:

- Checkout para Pro/Empresa.
- Portal cliente.
- Cambio de plan.
- Cancelacion al final del periodo.
- Reactivacion.
- Webhooks firmados.
- Evitar suscripciones duplicadas.
- Sincronizar plan en `profiles`.

### Codigos promocionales internos

Existe sistema de codigos manuales para regalar Pro/Empresa sin Stripe.

Ejemplos:

- `PASE-PRO`
- `PASE-EMPRESA`

Estos codigos:

- Se canjean desde Ajustes.
- Cambian el plan manualmente.
- Registran redencion.
- No crean suscripcion en Stripe.
- Permiten betas privadas o regalos controlados.

### Admin

Panel interno para:

- Metricas.
- Uso.
- Documentos recientes.
- Solicitudes.
- Operaciones.
- Errores.
- Alertas.
- Health checks.
- Eventos sensibles.

## 8. APIs internas

La app usa API routes de Next.js.

Principales endpoints:

- `/api/generate`: generacion desde catalogo base.
- `/api/custom-generate`: documento a medida.
- `/api/community-generate`: generacion desde tipos personalizados/guardados.
- `/api/assistant/chat`: conversacion con asistente.
- `/api/assistant/generate`: generar documento desde chat.
- `/api/templates`: gestion de plantillas.
- `/api/templates/[id]/process`: procesamiento de plantilla.
- `/api/templates/[id]/generate`: generacion desde plantilla.
- `/api/personal-catalog`: Mi catalogo.
- `/api/documents/[id]`: actualizar/borrar documento.
- `/api/documents/[id]/improve`: mejora con IA.
- `/api/documents/[id]/versions`: versionado.
- `/api/export/docx`: exportacion Word.
- `/api/create-checkout`: checkout Stripe.
- `/api/create-portal`: portal Stripe.
- `/api/subscription/change-plan`: cambio de plan.
- `/api/subscription/cancel`: cancelacion/reactivacion.
- `/api/webhooks/stripe`: webhook Stripe.
- `/api/promo-codes/redeem`: canje de codigos.
- `/api/workspaces/[id]/members`: miembros.
- `/api/workspaces/[id]/invitations`: invitaciones.
- `/api/workspace-notifications`: notificaciones.
- `/api/admin/health`: health checks.
- `/api/admin/operational-alerts/[id]`: alertas operativas.

## 9. Base de datos

La base de datos principal esta en Supabase PostgreSQL.

Tablas principales:

- `profiles`: perfil, plan, rol, uso, datos Stripe.
- `workspaces`: espacios de trabajo.
- `workspace_members`: miembros de workspace.
- `workspace_invitations`: invitaciones.
- `workspace_audit_events`: actividad.
- `workspace_notifications`: notificaciones internas.
- `documents`: documentos generados.
- `document_versions`: versiones de documentos.
- `generation_events`: eventos de generacion.
- `rate_limit_events`: rate limiting.
- `security_events`: eventos sensibles.
- `operational_alerts`: alertas internas.
- `api_error_events`: errores de APIs.
- `document_requests`: solicitudes de nuevos documentos.
- `community_document_types`: base historica para tipos personalizados/comunidad.
- `brand_settings`: marca del usuario.
- `document_templates`: plantillas subidas.
- `referrals`: referidos.
- `chat_sessions`: sesiones de asistente.
- `chat_messages`: mensajes del asistente.
- `promo_codes`: codigos promocionales.
- `promo_code_redemptions`: canjes de codigos.

## 10. Seguridad y permisos

La app usa:

- Row Level Security en Supabase.
- Politicas por usuario.
- Politicas por workspace.
- Politicas admin.
- Middleware de rutas.
- Validacion server-side.
- Zod en payloads.
- Rate limit por usuario/plan.
- Logs de seguridad.
- Webhooks Stripe con firma.
- Separacion entre anon key y service role.

Principio basico:

> Un usuario no debe poder ver documentos, plantillas, chats o ajustes de otro usuario.

## 11. IA y prompts

La IA se organiza por capas:

### Instrucciones generales

El sistema indica a la IA que:

- Redacte para Espana.
- Genere documentos profesionales.
- No de asesoramiento legal definitivo.
- No invente datos.
- Use `[PENDIENTE DE COMPLETAR]` cuando falte informacion.
- Mantenga el formato natural del tipo documental.
- Incluya aviso final de revision profesional.

### Reglas por categoria

Hay reglas especificas para familias:

- Comercial.
- Legal.
- Web.
- Profesional.
- Empresa.
- Laboral.
- Digital.
- Inmobiliario.

### Reglas por tipo documental

Cada documento puede tener reglas propias.

Ejemplo:

- Una carta de presentacion no debe sonar a contrato.
- Un presupuesto no debe convertirse en documento legal extenso.
- Una politica de privacidad no debe inventar herramientas o transferencias.
- Un contrato laboral debe ser prudente y marcar datos pendientes.

### Prompts de plantilla

Cuando se usa una plantilla, la IA recibe:

- Texto extraido.
- Resumen.
- Categoria.
- Analisis de estructura.
- Variables detectadas.
- Modo de influencia.
- Reglas anti-copia.

### Mejora con IA

La mejora puede actuar en modos:

- Mas formal.
- Mas breve.
- Mas comercial.
- Mas natural.

## 12. LLM usado

Actualmente se usa OpenAI mediante Responses API.

Modelos:

- Default: `gpt-4.1-mini`.
- Premium: `gpt-4.1`.

La seleccion depende del plan:

- Free: modelo default.
- Pro/Empresa: modelo premium.

## 13. LangChain

Actualmente el proyecto no usa LangChain.

Esto es importante para explicarlo bien en portfolio o entrevistas:

- No hay cadenas de LangChain.
- No hay agentes LangChain.
- No hay retrievers LangChain.
- No hay vector stores gestionados desde LangChain.

La decision actual es usar el SDK oficial de OpenAI directamente, porque:

- Reduce complejidad.
- Da mas control.
- Facilita despliegue en Vercel.
- Evita dependencia innecesaria.
- Es suficiente para el producto actual.

Donde podria encajar LangChain en el futuro:

- Pipelines complejos de analisis de plantillas.
- RAG con multiples documentos.
- Agentes para clasificar, extraer campos y proponer documentos.
- Workflows multi-step con trazabilidad avanzada.

Pero no es necesario para el MVP actual.

## 14. RAG

Actualmente no existe RAG vectorial completo.

Si existe una forma de generacion aumentada por contexto:

- El usuario sube una plantilla.
- Se extrae texto.
- Se analiza estructura y variables.
- Ese contexto se inyecta en el prompt.
- La IA genera un documento influenciado por la plantilla.

Esto se puede llamar:

> Generacion asistida por plantillas.

Pero no deberia venderse tecnicamente como RAG completo, porque faltan:

- Embeddings.
- Vector database.
- Retrieval semantico.
- Chunking optimizado.
- Ranking de fragmentos.
- Citacion de fuentes.

Futuro RAG posible:

1. Subir muchas plantillas/documentos.
2. Dividir en chunks.
3. Crear embeddings.
4. Guardarlos en pgvector/Supabase Vector.
5. Recuperar fragmentos relevantes por consulta.
6. Usarlos como contexto para generar documentos.

## 15. Supabase Storage

Buckets:

- `brand-logos`: logos de marca.
- `document-templates`: plantillas subidas.

Uso:

- Logos para PDF/Word.
- DOCX/plantillas para referencia.

## 16. Emails transaccionales

Con Resend se envian:

- Bienvenida.
- Documento listo.
- Invitacion a workspace.

Plantillas React Email:

- `emails/welcome.tsx`
- `emails/document-ready.tsx`
- `emails/workspace-invitation.tsx`

## 17. Observabilidad y operaciones

El proyecto incluye estructura para:

- Health checks internos.
- Registro de errores de API.
- Eventos de seguridad.
- Alertas operativas.
- Logs de rate limit.
- Panel admin.

Esto ayuda a detectar:

- Fallos de OpenAI.
- Fallos de Stripe.
- Fallos de Resend.
- Fallos de Supabase.
- Configuracion incompleta.
- Eventos sensibles.

## 18. Variables de entorno

Variables principales:

```env
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
STRIPE_PORTAL_CONFIGURATION_ID=

NEXT_PUBLIC_APP_URL=

RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

## 19. Estado de monetizacion

Modelo freemium:

- Free para captacion.
- Pro para usuarios individuales intensivos.
- Empresa para equipos y colaboracion.

Funciones de mayor valor:

- Asistente.
- Documentos a medida.
- Word.
- Plantillas.
- Mi catalogo.
- Marca personalizada.
- Workspaces.

## 20. Riesgos y limitaciones

Riesgos de producto:

- El usuario puede interpretar el documento como legalmente definitivo.
- Algunos documentos laborales/legales requieren revision profesional.
- El coste de IA puede crecer con uso intensivo.
- Las plantillas pueden contener datos sensibles.
- La experiencia debe seguir simplificandose para usuarios no tecnicos.

Mitigaciones actuales:

- Avisos legales en documentos.
- Prompts prudentes.
- No inventar datos.
- Uso de `[PENDIENTE DE COMPLETAR]`.
- Planes y limites.
- RLS.
- Logs.
- Diferenciacion clara entre borrador y asesoramiento profesional.

## 21. Como explicarlo en un portfolio

### Titulo del proyecto

**Borrantia - SaaS de generacion de documentos profesionales con IA**

### Descripcion corta

Plataforma SaaS freemium para generar, editar, guardar y exportar documentos profesionales con IA, adaptada al mercado espanol e integrada con Supabase, Stripe, OpenAI, Resend y Vercel.

### Descripcion larga

Disene y desarrolle una aplicacion web completa para generar documentos profesionales mediante IA. El sistema permite crear documentos desde un catalogo guiado, pedir documentos a medida, usar un asistente conversacional, subir plantillas propias, guardar tipos personalizados y exportar resultados en PDF, TXT y Word. Incluye autenticacion, suscripciones, historial, versionado, workspaces, emails transaccionales, panel admin y controles de seguridad con RLS.

### Stack para portfolio

- Next.js 14.
- TypeScript.
- React.
- Tailwind CSS.
- Supabase Auth/PostgreSQL/RLS/Storage.
- OpenAI Responses API.
- Stripe Billing.
- Resend.
- React Email.
- jsPDF.
- docx.
- Zod.
- React Hook Form.
- Vercel.

### Puntos fuertes para destacar

- Producto SaaS real, no solo demo.
- Integracion de pagos con Stripe.
- Autenticacion y base de datos con Supabase.
- Generacion IA con prompts especializados.
- Seguridad con RLS.
- Exportacion multiformato.
- Workspaces y colaboracion.
- Sistema de plantillas.
- Versionado y mejora de documentos.
- Panel admin y observabilidad.

### Capturas que conviene incluir

1. Landing page.
2. Dashboard.
3. Crear documento.
4. Resultado generado.
5. Historial.
6. Asistente.
7. Mi catalogo.
8. Plantillas.
9. Precios.
10. Workspace.
11. Admin.

### Demo sugerida

Grabar un video corto:

1. Entrar en la landing.
2. Iniciar sesion.
3. Crear un presupuesto.
4. Editarlo.
5. Mejorarlo con IA.
6. Descargar Word/PDF.
7. Guardarlo en Mi catalogo.
8. Usar una plantilla.
9. Mostrar planes.

Duracion recomendada: 90-150 segundos.

## 22. Como crear un portfolio personal para tus proyectos

### Objetivo del portfolio

Tu portfolio no debe ser solo una lista de proyectos. Debe demostrar que sabes:

- Detectar un problema.
- Convertirlo en producto.
- Disenar flujos.
- Implementar backend y frontend.
- Integrar APIs reales.
- Pensar en monetizacion.
- Lanzar y medir.

### Estructura recomendada

Paginas:

1. Inicio.
2. Proyectos.
3. Caso de estudio: Borrantia.
4. Sobre mi.
5. Contacto.

### Home del portfolio

Mensaje principal:

> Construyo productos digitales con IA, pagos, bases de datos y experiencias web completas.

Bloques:

- Quien eres.
- Que construyes.
- Proyectos destacados.
- Tecnologias.
- Contacto.

### Pagina de proyectos

Cada proyecto deberia tener:

- Nombre.
- Imagen/captura.
- Problema.
- Solucion.
- Stack.
- Funcionalidades clave.
- Link demo.
- Link GitHub si procede.
- Estado: MVP, beta, produccion.

### Caso de estudio de Borrantia

Estructura ideal:

1. Contexto.
2. Problema.
3. Usuarios objetivo.
4. Solucion.
5. Arquitectura.
6. IA y prompts.
7. Base de datos.
8. Pagos.
9. Seguridad.
10. Resultado.
11. Aprendizajes.
12. Proximos pasos.

### Stack recomendado para tu portfolio

Opcion sencilla:

- Next.js.
- Tailwind.
- Vercel.
- Markdown/MDX para casos de estudio.

Opcion mas rapida:

- Framer.
- Webflow.
- Carrd.

Mi recomendacion:

> Hazlo en Next.js, porque asi tambien demuestra tus capacidades tecnicas.

### Secciones tecnicas que te conviene mostrar

- Integraciones con APIs.
- OpenAI/LLM.
- Stripe.
- Supabase.
- Auth.
- RLS.
- Emails.
- Exportacion PDF/DOCX.
- Deploy.
- SEO.
- Producto y monetizacion.

### Como presentar IA sin exagerar

Correcto:

- "Integracion con OpenAI Responses API."
- "Prompts especializados por tipo documental."
- "Generacion asistida por plantillas."
- "Extraccion de campos sugeridos con IA."

Evitar si no se implementa:

- "RAG avanzado" si no hay embeddings/retrieval.
- "Agentes autonomos" si no hay agentes reales.
- "LangChain" si no se usa LangChain.

## 23. Ideas para evolucion futura

### RAG real

- Supabase Vector/pgvector.
- Embeddings de plantillas.
- Retrieval semantico.
- Generacion con fragmentos relevantes.
- Citacion de plantillas usadas.

### Editor avanzado

- Editor tipo Google Docs.
- Comentarios.
- Sugerencias.
- Control de cambios.

### Firma electronica

- Integracion futura con proveedor de firma.

### Marketplace privado

- Plantillas compartidas por equipo.
- Packs de documentos.
- Plantillas sectoriales.

### Analitica de negocio

- Conversion Free a Pro.
- Documentos mas usados.
- Coste por generacion.
- Retencion.
- Cohortes.

### Producto B2B

- Workspaces avanzados.
- Permisos por departamento.
- Auditoria completa.
- Facturacion por equipo.
- Plantillas corporativas.

## 24. Resumen para entrevistas o LinkedIn

Construí una aplicacion SaaS completa de generacion de documentos profesionales con IA para el mercado espanol. El proyecto integra Next.js, TypeScript, Supabase, OpenAI, Stripe, Resend y Vercel. Incluye autenticacion, planes freemium, generacion con prompts especializados, historial, versionado, exportacion PDF/Word, biblioteca de plantillas, asistente conversacional, workspaces, panel admin y seguridad con RLS. El objetivo fue crear un producto real orientado a monetizacion, no una demo aislada de IA.

