# Template Generation QA

Checklist para validar el uso de plantillas procesadas dentro del generador, incluyendo las mejoras premium de fase 7.

## Preparacion

- Usar un usuario Pro.
- Ejecutar `supabase-template-generation-2.4.sql` si aun no se aplico.
- Tener al menos una plantilla DOCX procesada con estado `ready`.
- Confirmar que `/generar` muestra la plantilla en el selector.
- Confirmar que la ficha `/plantillas/[id]` muestra `Usar en generador`.
- Tener al menos:
  - Una plantilla destacada.
  - Una plantilla usada previamente.
  - Una plantilla reciente sin usos.
  - Dos plantillas de categorias distintas.

## Casos base

Crear o subir plantillas DOCX de prueba con datos falsos:

- Contrato con nombres ficticios, importes, fechas y domicilio.
- Propuesta comercial con secciones claras.
- Carta breve con tono humano.
- Plantilla mal formateada con mucho texto o datos irrelevantes.

## Modos de uso

### Estructura + tono

- Seleccionar una plantilla procesada.
- Elegir `Estructura + tono`.
- Generar un documento con datos distintos.
- Debe conservar una estructura parecida y un tono similar.
- No debe copiar nombres, importes, fechas, direcciones ni condiciones concretas de la plantilla.

### Solo estructura

- Elegir `Solo estructura`.
- El resultado debe usar un orden de apartados parecido.
- El tono puede adaptarse al tipo documental de DocuGen.
- No debe replicar frases largas de la plantilla.

### Tono y estilo

- Elegir `Tono y estilo`.
- El resultado debe sonar parecido en formalidad y longitud.
- No debe copiar el formato exacto si el tipo documental elegido pide otro formato.
- Una carta debe seguir pareciendo carta; un contrato debe seguir pareciendo contrato.

### Inspiracion ligera

- Elegir `Inspiracion ligera`.
- El resultado debe priorizar claramente el tipo de documento seleccionado.
- La plantilla solo debe influir de forma suave.
- Es el modo recomendado si la plantilla es muy distinta al documento elegido.

## Seguridad de datos

En cada prueba, comprobar:

- No aparecen nombres de la plantilla si no se introdujeron en el formulario.
- No aparecen importes de la plantilla si no se introdujeron en el formulario.
- No aparecen emails, telefonos, direcciones ni CIF/NIF de la plantilla.
- Los campos no aportados aparecen como `[PENDIENTE DE COMPLETAR]`.
- El aviso final de borrador generado con IA sigue apareciendo.

## Historial

- El documento generado debe aparecer con badge `Con plantilla`.
- Debe mostrar el nombre de la plantilla usada.
- Debe mostrar el modo usado.
- `Ver plantilla` debe abrir `/plantillas/[id]`.
- `Mismo estilo` debe abrir `/generar` con esa plantilla seleccionada.
- `Regenerar` debe conservar plantilla y modo.

## Regresion

- Generar un documento sin plantilla.
- Debe comportarse como antes.
- Usuario Free no debe ver selector de plantillas.
- Usuario Free no debe poder usar `referenceTemplateId` llamando manualmente a la API.
- Una plantilla no `ready` debe devolver error claro si se fuerza desde API.

## Resultado esperado

La plantilla debe funcionar como referencia secundaria:

1. Datos del formulario.
2. Tipo documental seleccionado.
3. Reglas de seguridad y no invencion.
4. Plantilla como estructura, tono o inspiracion segun el modo.

Si el resultado copia datos concretos de la plantilla, hay que endurecer el prompt antes de avanzar.

## Fase 7.1 - Selector avanzado

### Busqueda

- Abrir `/generar` con usuario Pro.
- Escribir parte del nombre de una plantilla.
- Deben filtrarse las tarjetas sin perder la opcion `Sin plantilla`.
- Buscar por categoria.
- Buscar por una palabra presente en el resumen.
- Una busqueda sin resultados debe mostrar el estado vacio: `No hay plantillas con esos filtros`.

### Vistas rapidas

- Cambiar a `Destacadas`.
- Deben aparecer solo plantillas con badge `Destacada`.
- Cambiar a `Usadas`.
- Deben aparecer solo plantillas con al menos 1 uso.
- Cambiar a `Recientes`.
- Deben ordenarse por fecha de subida.
- Volver a `Todas`.
- Deben aparecer todas las plantillas listas.

### Metricas visibles

En cada tarjeta comprobar:

- Nombre de plantilla.
- Badge `Destacada` si aplica.
- Numero de usos si aplica.
- Ultimo uso o `Sin uso`.
- Modo habitual o `Sin datos`.
- Resumen, si existe.
- Fecha de subida.

## Fase 7.2 - Vista previa de influencia

Seleccionar una plantilla y revisar el bloque `Vista previa de influencia`.

Para cada modo debe cambiar:

- Titulo de influencia.
- Peso: alta, media o baja.
- Estructura: influye o limitado.
- Tono: influye o limitado.
- Contenido: siempre limitado.
- Reglas explicativas.

Casos esperados:

- `Estructura + tono`: estructura y tono influyen.
- `Solo estructura`: estructura influye, tono limitado.
- `Tono y estilo`: tono influye, estructura limitada.
- `Inspiracion ligera`: estructura y tono quedan limitados.

Validar que siempre se explica:

- La plantilla no se copia literalmente.
- Los datos del formulario tienen prioridad.
- No se reutilizan datos concretos de la plantilla.

## Fase 7.3 - Calidad del prompt

Generar documentos reales de prueba con plantillas que contengan datos falsos:

- Nombres de personas.
- Emails.
- NIF/CIF.
- Importes.
- Fechas.
- Direcciones.
- Clausulas especificas.

Comprobar que el resultado:

- No copia esos datos si no estan en el formulario.
- No copia bloques largos de texto.
- Mantiene el tipo documental elegido.
- No convierte cartas en contratos.
- No convierte politicas web en acuerdos con firmas.
- Mantiene `[PENDIENTE DE COMPLETAR]` cuando falta informacion.
- Mantiene aviso final de borrador generado con IA.

Pruebas cruzadas:

- Usar plantilla de contrato para carta de presentacion.
- Usar plantilla comercial para documento legal.
- Usar plantilla larga para documento breve.
- Usar plantilla con estructura mala o demasiado especifica.

Resultado esperado:

- El tipo documental manda sobre la plantilla.
- El formulario manda sobre la plantilla.
- La plantilla mejora estructura/tono, pero no contamina datos.

## Fase 7.4 - Trazabilidad

Generar un documento con plantilla.

En el resultado inmediato comprobar:

- Aparece `Trazabilidad de generacion`.
- Muestra nombre de plantilla.
- Muestra modo aplicado.
- Muestra `Formulario primero`.
- `Abrir plantilla` lleva a `/plantillas/[id]`.

Abrir el documento desde `/historial/[id]`.

- Debe aparecer seccion `Generado con plantilla de referencia`.
- Debe mostrar plantilla, modo aplicado y prioridad.
- Debe explicar que la plantilla orienta estructura/tono pero no se copia literalmente.

Generar sin plantilla.

- No debe aparecer bloque de trazabilidad.

## Fase 7.5 - Reutilizacion desde historial

Desde `/historial`:

- Abrir un documento generado con plantilla.
- Pulsar `Nuevo con misma plantilla`.
- `/generar` debe abrir con:
  - mismo tipo documental,
  - misma plantilla seleccionada,
  - mismo modo de uso.

Desde `/historial/[id]`:

- Pulsar `Crear nuevo con misma plantilla`.
- Confirmar mismos valores cargados.

Desde documento con datos reutilizables:

- Pulsar `Reutilizar datos`.
- Debe cargar datos del formulario original.
- Si el documento tenia plantilla, tambien debe recuperar plantilla y modo.

Regenerar desde historial:

- Debe crear nuevo documento.
- Debe conservar `reference_template_id`.
- Debe conservar `template_usage_mode`.

## Fase 7.6 - Ranking y recomendaciones

En `/generar`, con varias plantillas:

- Debe aparecer bloque `Recomendadas`.
- Debe mostrar hasta 3 plantillas.
- Cada recomendacion debe tener una razon:
  - `Destacada`
  - `Mas usada`
  - `Categoria similar`
  - `Reciente`

Casos:

- Una plantilla destacada debe priorizarse.
- Una plantilla con muchos usos debe aparecer antes que una sin uso, salvo que otra sea destacada.
- Una plantilla de categoria parecida al documento seleccionado debe subir en ranking.
- Una plantilla reciente debe aparecer si no hay senales mejores.

El boton `Ver todas` debe limpiar busqueda y volver a la vista completa.

## Fase 7.7 - QA de calidad con plantillas

Esta fase valida que el sistema completo de plantillas sea fiable para uso real: selector, influencia, prompt, trazabilidad, reutilizacion, seguridad y regresiones.

### Set de pruebas recomendado

Preparar al menos estas plantillas:

- Contrato de servicios con datos falsos, importes, fechas y clausulas extensas.
- Propuesta comercial con tono consultivo y apartados claros.
- Carta de presentacion breve y humana.
- Plantilla administrativa sencilla, por ejemplo autorizacion o reclamacion.
- Plantilla mal estructurada con datos irrelevantes para comprobar tolerancia.

Preparar al menos estos formularios:

- Un documento del mismo tipo que la plantilla.
- Un documento de categoria parecida, pero no identica.
- Un documento claramente distinto a la plantilla.
- Un formulario incompleto con campos vacios.

### Matriz de calidad

| Prueba | Esperado | Bloqueante si falla |
| --- | --- | --- |
| Misma categoria + `Estructura + tono` | El resultado se parece en orden y formalidad, sin copiar datos concretos. | Si copia nombres, importes, emails, fechas o clausulas literales. |
| Misma categoria + `Solo estructura` | Mantiene apartados similares, pero adapta tono al tipo documental. | Si replica frases largas o condiciones concretas. |
| Misma categoria + `Tono y estilo` | Mantiene formalidad y longitud parecida, sin forzar estructura incorrecta. | Si cambia el tipo documental elegido. |
| Categoria distinta + `Inspiracion ligera` | La plantilla influye poco y el tipo DocuGen manda. | Si convierte una carta en contrato, propuesta en NDA o politica web en acuerdo. |
| Formulario incompleto | Usa `[PENDIENTE DE COMPLETAR]` donde falta informacion. | Si inventa datos que el usuario no ha dado. |
| Plantilla con datos sensibles falsos | No aparecen datos de la plantilla en el resultado final. | Si aparecen nombres, NIF/CIF, emails, telefonos, domicilios o cuentas bancarias de la plantilla. |
| Plantilla mal estructurada | El resultado sigue siendo claro y profesional. | Si arrastra ruido, notas internas o formato roto. |
| Documento sin plantilla | Mantiene comportamiento anterior. | Si requiere plantilla o cambia el flujo base. |

### Revision manual del resultado

Para cada documento generado con plantilla, comprobar:

- Tiene titulo claro.
- Tiene fecha o marcador si no se facilito.
- Identifica partes cuando aplica.
- Usa clausulas numeradas solo cuando procede.
- Incluye bloque de firmas solo cuando procede.
- Mantiene aviso final de borrador generado con IA.
- No incluye secciones absurdas para el tipo documental.
- No incluye metadatos internos como `uso previsto`, `sector`, `template`, `source` o nombres tecnicos.
- El tono es profesional y adaptado a Espana.
- El documento se puede copiar o exportar sin perder legibilidad.

### QA del selector

En `/generar`:

- Buscar por nombre, categoria y resumen.
- Cambiar entre `Todas`, `Destacadas`, `Usadas` y `Recientes`.
- Seleccionar una recomendacion.
- Seleccionar manualmente otra plantilla.
- Volver a `Sin plantilla`.
- Confirmar que la vista previa de influencia aparece solo cuando hay plantilla seleccionada.
- Confirmar que cambiar el modo actualiza la vista previa sin perder seleccion.
- Confirmar que una busqueda sin resultados no bloquea la generacion sin plantilla.

### QA de recomendaciones

Con varias plantillas:

- Una destacada debe aparecer arriba.
- Una plantilla usada varias veces debe ganar prioridad.
- Una plantilla de categoria parecida al documento seleccionado debe ganar prioridad.
- Una plantilla reciente debe aparecer solo si no hay senales mejores.
- No deben recomendarse plantillas de otro usuario.
- No deben recomendarse plantillas no procesadas o con estado distinto de `ready`.

### QA de trazabilidad

Despues de generar con plantilla:

- El resultado inmediato muestra `Trazabilidad de generacion`.
- El bloque muestra nombre de plantilla, modo aplicado y prioridad del formulario.
- `Abrir plantilla` lleva a la ficha correcta.
- En `/historial` aparece badge `Con plantilla`.
- En `/historial/[id]` aparece la seccion de plantilla de referencia.
- El documento sin plantilla no muestra trazabilidad.

### QA de reutilizacion

Desde `/historial` y `/historial/[id]`:

- `Reutilizar datos` carga `form_data` original.
- Si el documento tenia plantilla, tambien carga `reference_template_id`.
- Si el documento tenia modo de uso, tambien carga `template_usage_mode`.
- `Nuevo con misma plantilla` carga tipo documental, plantilla y modo, pero permite introducir datos nuevos.
- `Regenerar` conserva plantilla y modo.
- La URL generada no rompe si la plantilla fue borrada; debe caer de forma clara a generacion sin plantilla o mostrar aviso.

### QA de plan y permisos

- Usuario Free no ve selector avanzado de plantillas.
- Usuario Free no puede forzar `referenceTemplateId` por API.
- Usuario Pro ve selector, recomendaciones, preview y trazabilidad.
- Usuario Pro solo ve sus propias plantillas.
- Admin no debe saltarse RLS en cliente.
- Service role no se usa para exponer plantillas privadas al navegador.

### Criterios de aceptacion

La fase 7.7 se considera cerrada si:

- Los cuatro modos generan diferencias reconocibles.
- Ningun test copia datos concretos de una plantilla.
- El tipo documental elegido siempre manda sobre la plantilla.
- El formulario siempre manda sobre la plantilla.
- La trazabilidad aparece donde corresponde.
- Reutilizar desde historial conserva plantilla y modo.
- Las recomendaciones son utiles, pero no bloquean el flujo manual.
- Free queda bloqueado de forma comercialmente clara.
- Lint y build pasan sin errores.

## Regresion final

Antes de cerrar la fase:

- Usuario Free no ve plantillas.
- Usuario Free no puede forzar `referenceTemplateId` por API.
- Usuario Pro puede generar sin plantilla.
- Usuario Pro puede generar con plantilla.
- Usuario Pro puede generar con los cuatro modos.
- Historial sigue permitiendo descargar PDF/TXT/Word.
- Historial sigue permitiendo borrar documentos.
- Plantillas de otro usuario no son accesibles.

Comandos:

```bash
npm run lint
npm run build
```

Ambos deben terminar sin errores.
