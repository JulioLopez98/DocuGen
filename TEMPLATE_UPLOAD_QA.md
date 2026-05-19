# Template Upload QA

Checklist para validar calidad de plantillas subidas antes de usarlas como base de generacion.

## Preparacion

- Usar usuario Pro.
- Tener al menos una plantilla DOCX correcta.
- Tener una plantilla DOCX muy breve.
- Tener una plantilla DOCX con datos ficticios: email, NIF/CIF, fecha, importe y telefono.
- Tener una plantilla mal estructurada o con parrafos largos.

## Biblioteca

- Abrir `/plantillas`.
- Las tarjetas deben mostrar badge `QA`.
- Una plantilla subida sin procesar debe mostrar `QA Pendiente`.
- Una plantilla procesada correctamente debe mostrar `QA Lista`, `QA Lista con avisos` o `QA Revisar`.
- Una plantilla fallida debe mostrar `QA Bloqueada`.
- La tarjeta debe explicar el motivo de forma legible.

## Ficha

- Abrir `/plantillas/[id]`.
- Debe aparecer bloque `QA de plantilla`.
- Debe mostrar puntuacion de calidad.
- Debe mostrar checks:
  - Texto extraido.
  - Estructura.
  - Variables.
  - Datos concretos.
  - Calidad.
- Cada check debe tener estado claro: OK, Revisar, Falta o Bloqueado.

## Datos sensibles

Con plantilla que contenga datos ficticios:

- Debe aparecer aviso de datos concretos detectados.
- Debe mencionar las senales encontradas, por ejemplo emails, NIF/CIF, importes o fechas.
- El aviso debe recordar que no se deben copiar al documento final.

## Variables

- Una plantilla sin variables debe sugerir anadir variables.
- Al editar variables y guardar, el check de variables debe mejorar tras refrescar.
- Las variables guardadas deben seguir apareciendo en `/plantillas/[id]/generar`.

## Generacion directa

- Generar desde una plantilla con avisos.
- El documento final no debe copiar datos ficticios de la plantilla.
- Los valores del formulario deben sustituir a los marcadores o campos equivalentes.
- Si falta un dato, debe aparecer `[PENDIENTE DE COMPLETAR]`.
- El documento debe guardarse en historial con trazabilidad.

## Regresion

- `npm run lint` debe pasar.
- `npm run build` debe pasar.
- Usuario Free no debe poder abrir `/plantillas`.
- Usuario Pro debe seguir pudiendo procesar, editar variables, generar y exportar.
