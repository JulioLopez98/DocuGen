# QA - Generador libre

Esta checklist valida el flujo `No encuentro mi documento` antes de seguir ampliando el catalogo o convertir solicitudes en tipos oficiales.

## Objetivo

Comprobar que un usuario puede pedir un documento no catalogado, recibir un borrador seguro, guardarlo en historial y que el equipo pueda revisar la solicitud desde admin.

## Preparacion

- Tener `OPENAI_API_KEY` configurada.
- Tener Supabase con `document_requests` creado.
- Iniciar sesion con un usuario Free y otro Pro, si es posible.
- Tener un usuario con `profiles.role = admin` para revisar `/admin`.

## Flujo usuario

1. Entrar en `/generar`.
2. Cambiar el modo a `A medida`.
3. Enviar una solicitud valida:
   - Nombre: `Carta de reclamacion por retraso de proveedor`.
   - Descripcion: incluir partes, contexto, importe o plazo afectado.
   - Uso previsto: `Envio a proveedor`.
   - Tono: `Formal` o `Legal prudente`.
   - Sector: `Servicios profesionales`.
   - Datos que debe incluir: nombres, fechas y condiciones.
4. Confirmar que aparece el resultado en la misma pantalla.
5. Confirmar que el documento incluye aviso de borrador generado con IA.
6. Probar `PDF`, `TXT`, `Copiar` y `Word Pro`.
7. Probar `Volver a generar` y confirmar que crea una nueva version visible.
8. Abrir `Ver en historial` y confirmar que el detalle carga correctamente.

## Historial

1. Entrar en `/historial`.
2. Filtrar por `A medida`.
3. Confirmar que el documento aparece con badge `Personalizado`.
4. Desplegar el documento.
5. Probar `Regenerar`.
6. Confirmar que no aparece la accion `Usar como plantilla` en documentos personalizados.
7. Descargar PDF/TXT/Word segun plan.

## Admin

1. Entrar en `/admin` con un usuario admin.
2. Revisar la seccion `Solicitudes a medida`.
3. Confirmar que aparecen:
   - Titulo.
   - Estado.
   - Descripcion resumida.
   - Sector.
   - Tono.
   - Uso previsto.
   - Enlace `Ver documento` cuando exista.
4. Confirmar que los contadores de nuevas, revision y convertidas se muestran sin errores.

## Seguridad y limites

1. Como usuario Free con 3 documentos del mes, intentar generar uno a medida.
2. Confirmar respuesta `limit_reached`.
3. Probar una descripcion de menos de 20 caracteres.
4. Confirmar validacion en cliente o respuesta `invalid_payload`.
5. Probar una solicitud ambigua.
6. Confirmar que el resultado usa `[PENDIENTE DE COMPLETAR]` y no inventa datos.
7. Probar una solicitud de alto riesgo legal/laboral/fiscal.
8. Confirmar que el texto recomienda revision profesional y no promete validez legal.

## Regresion minima

Antes de desplegar:

```bash
npm run lint
npm run build
```

## Criterio de aceptacion

- La generacion a medida se muestra en pantalla sin obligar a ir al historial.
- El documento queda guardado en `documents`.
- La solicitud queda guardada en `document_requests`.
- Historial y detalle soportan `doc_type = custom`.
- Admin puede revisar las solicitudes.
- Free mantiene limite mensual y rate limit.
- Pro mantiene exportacion Word.
