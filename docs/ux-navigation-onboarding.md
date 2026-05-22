# UX, navegacion y onboarding

## Fase 11.10.1

Se simplifica la navegacion principal para reducir la carga cognitiva de usuarios nuevos.

## Navegacion por plan

Usuario Free:

- Panel
- Crear
- Documentos
- Mas: Asistente Pro, Tipos de documento, Plantillas Pro, Equipo Empresa, Precios, Ajustes

Usuario Pro:

- Panel
- Crear
- Documentos
- Plantillas
- Mas: Asistente, Tipos de documento, Equipo Empresa, Precios, Ajustes

Usuario Empresa:

- Panel
- Crear
- Documentos
- Plantillas
- Equipo
- Mas: Asistente, Tipos de documento, Precios, Ajustes

Admin:

- Incluye `Admin` dentro de Mas.

## Decisiones

- `Historial` pasa a mostrarse como `Documentos` en la navegacion.
- `Workspace` pasa a mostrarse como `Equipo`.
- `Catalogo` pasa a mostrarse como `Tipos de documento`.
- La accion `Crear` vive en la navegacion principal, no como boton duplicado.
- Las funciones avanzadas quedan disponibles, pero no compiten con el flujo basico.

## Siguiente mejora

Fase 11.10.2: redisenar dashboard como centro guiado con acciones recomendadas y checklist de onboarding.

## Fase 11.10.2

Se rediseña `/dashboard` como centro de trabajo guiado.

Cambios:

- Hero con pregunta directa y accion principal `Crear documento`.
- Accesos por intencion: catalogo, a medida, continuar trabajo.
- Checklist breve de onboarding con 4 pasos.
- Bloque de trabajo reciente con ultimo documento destacado.
- Recomendaciones de documentos sin saturar la pantalla.
- Estado del plan y uso en un lateral claro.
- Estadisticas movidas al final para que no compitan con la accion principal.

Objetivo:

- Un usuario nuevo entiende que debe empezar por crear.
- Un usuario recurrente encuentra rapido su ultimo documento.
- Funciones avanzadas aparecen como siguiente paso, no como ruido inicial.

Siguiente mejora:

Fase 11.10.3: mejorar `/generar` para elegir documento por intencion y categoria, reduciendo la sensacion de catalogo enorme.
