# Template Generation QA

Checklist para validar la fase 2: uso de plantillas procesadas dentro del generador.

## Preparacion

- Usar un usuario Pro.
- Ejecutar `supabase-template-generation-2.4.sql` si aun no se aplico.
- Tener al menos una plantilla DOCX procesada con estado `ready`.
- Confirmar que `/generar` muestra la plantilla en el selector.
- Confirmar que la ficha `/plantillas/[id]` muestra `Usar en generador`.

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
