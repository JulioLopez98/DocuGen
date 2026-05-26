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

## Fase 11.10.3

Se simplifica `/generar` para que el usuario empiece por una intencion, no por una lista completa.

Cambios:

- Selector inicial por intenciones: habitual, vender, contratar, proteger, web, reclamar, gestion interna e inmuebles.
- El catalogo se filtra automaticamente segun la intencion elegida.
- Se mantiene busqueda dentro del subconjunto visible.
- Se muestran sugerencias rapidas de documentos frecuentes por intencion.
- Las opciones avanzadas quedan separadas: catalogo completo, tipos de comunidad y documento a medida.
- El formulario, plantillas, exportacion y limites por plan siguen funcionando igual.

Objetivo:

- Un usuario nuevo no ve todos los tipos a la vez.
- Un usuario avanzado puede seguir buscando o abrir todo el catalogo.
- Si no encuentra lo que necesita, el camino hacia documento a medida queda claro.

Siguiente mejora:

Fase 11.10.4: onboarding contextual dentro de las pantallas clave con pequenos mensajes de ayuda y estados vacios mas claros.

## Fase 11.10.4

Se incorpora ayuda contextual ligera en pantallas clave para explicar que hacer sin saturar la interfaz.

Cambios:

- Nuevo componente `ContextualHelp` reutilizable.
- Ayuda en `/dashboard` para crear, usar plantillas y colaborar.
- Ayuda en `/generar` para elegir entre catalogo, comunidad y documento a medida.
- Ayuda en `/historial` para entender revision, versiones, exportacion y borrado.
- Ayuda en `/plantillas` para explicar cuando usar referencias y como preparar archivos.
- Ayuda en `/asistente` para orientar el uso del chat Pro.
- Ayuda en `/workspace` para explicar equipo, roles y primer paso.

Objetivo:

- Reducir dudas de usuarios nuevos.
- Separar funciones basicas, Pro y Empresa sin esconderlas.
- Mantener la interfaz limpia con bloques breves y accionables.

Siguiente mejora:

Fase 11.10.5: revisar textos, nombres y microcopy de navegacion para que todo use el mismo lenguaje: Crear, Documentos, Plantillas, Equipo y Mas.

## Fase 11.10.5

Se unifica el lenguaje visible de la aplicacion para reducir friccion y evitar que varias palabras nombren la misma zona.

Vocabulario principal:

- `Panel`: centro de trabajo.
- `Crear`: generador.
- `Documentos`: documentos guardados, antes mostrado a veces como historial.
- `Tipos de documento`: catalogo publico y selector de familias.
- `Plantillas`: documentos propios usados como referencia.
- `Equipo`: funciones Empresa, antes mostradas a veces como workspace.
- `Mas`: acceso a funciones avanzadas y secundarias.

Cambios:

- `Historial` se sustituye por `Documentos` en textos visibles principales.
- `Catalogo` se sustituye por `Tipos de documento` o `tipos` cuando el contexto ya esta claro.
- `Workspace` se sustituye por `Equipo` o `espacio de equipo` en la experiencia visible.
- `Dashboard` se sustituye por `Panel` en botones y llamadas a la accion.
- Se ajustan textos de landing, precios, ajustes, admin, onboarding, detalle de documento y generador.

Notas:

- No se cambian rutas como `/historial`, `/catalogo`, `/workspace` ni nombres internos de tablas/APIs.
- La consistencia es visual y de producto; la arquitectura se mantiene estable.

Siguiente mejora:

Fase 11.10.6: revisar estados vacios y primeros pasos por rol/plan para que Free, Pro y Empresa vean acciones diferentes y claras.
