# QA funcional DocuGen

Fecha de referencia: 2026-06-02

Esta guía cubre la comprobación real del flujo Free/Pro antes del pulido final. Los checks automáticos validan compilación y rutas protegidas; los checks manuales verifican flujos que dependen de sesión, Stripe, Supabase, OpenAI y descargas del navegador.

## Matriz crítica

| Área | Free esperado | Pro esperado | Estado |
| --- | --- | --- | --- |
| Catálogo oficial | Puede generar tipos Free hasta 3 documentos/mes | Puede generar todos los tipos | Cubierto por UI + API |
| Límite mensual | Bloquea al llegar a 3 documentos | Sin bloqueo mensual básico | Cubierto por API |
| Rate limit | 10 generaciones/hora | 60 generaciones/hora base, acciones Pro más altas | Cubierto por API |
| Word | Visible pero bloqueado con upsell | Descarga `.docx` | Cubierto por UI + API |
| PDF/TXT | Descarga permitida | Descarga permitida | Cubierto por UI |
| Historial | Ver, desplegar, descargar, borrar y borrar todo | Igual + Word | Cubierto por UI + API |
| Plantillas | Visible como función Pro/bloqueada | Subir, procesar, usar como referencia | Cubierto por UI + API |
| A medida | Bloqueado con CTA Pro | Genera, guarda y crea solicitud | Cubierto por UI + API |
| Comunidad | Genera si el tipo requiere Free | Respeta plan requerido del tipo | Cubierto por UI + API |
| Workspace | No disponible salvo upsell | Empresa/admin según permisos | Cubierto por UI + API |

## Smoke tests automáticos recomendados

Ejecutar en local:

```powershell
npm run lint
npm run build
npm run dev
```

Con el servidor activo:

```powershell
curl.exe -i http://127.0.0.1:3000/dashboard
curl.exe -i -X POST http://127.0.0.1:3000/api/generate -H "Content-Type: application/json" --data "{}"
curl.exe -i -X POST http://127.0.0.1:3000/api/export/docx -H "Content-Type: application/json" --data "{}"
curl.exe -i -X POST http://127.0.0.1:3000/api/custom-generate -H "Content-Type: application/json" --data "{}"
curl.exe -i -X POST http://127.0.0.1:3000/api/community-generate -H "Content-Type: application/json" --data "{}"
```

Resultado esperado sin sesión:

- Páginas protegidas redirigen a `/auth`.
- APIs protegidas devuelven JSON con `error: "unauthorized"` y mensaje legible.

## Checklist manual Free

1. Entrar con un usuario Free nuevo.
2. Crear un documento Free sencillo, por ejemplo `Carta de presentación`.
3. Confirmar que aparece el resultado sin ir al historial.
4. Descargar PDF y TXT.
5. Pulsar Word y comprobar aviso/upsell Pro.
6. Crear hasta 3 documentos en el mes.
7. Intentar crear el cuarto y comprobar mensaje de límite mensual.
8. Intentar un tipo Pro y comprobar bloqueo con CTA a precios.
9. Entrar en Plantillas y comprobar que las acciones Pro no se pueden completar.
10. Entrar en A medida y comprobar bloqueo Pro.

## Checklist manual Pro

1. Entrar con usuario Pro.
2. Crear un tipo Free y un tipo Pro.
3. Confirmar que el resultado queda visible al terminar y aparece en Documentos.
4. Descargar PDF, TXT y Word.
5. Subir una plantilla DOCX/PDF, procesarla y usarla como referencia.
6. Generar desde una plantilla concreta.
7. Crear documento a medida.
8. Abrir Historial, desplegar documentos, descargar, regenerar, borrar uno y borrar todo solo en cuenta de prueba.
9. Probar un tipo comunitario aprobado y verificar que el documento queda guardado con etiqueta legible.
10. Abrir Portal Stripe desde Dashboard y volver a la app.

## Riesgos a vigilar

- No usar cuentas reales para probar `Borrar todo`.
- No probar límites de producción con documentos largos innecesarios: consume OpenAI y email.
- Si Resend usa dominio no verificado, los emails pueden llegar a spam.
- Si `STRIPE_PRICE_ID_EMPRESA` está vacío, el checkout Empresa debe mostrar un error legible y no romper la página.

## Criterio de cierre

La fase 12.2 se considera pasada cuando:

- `npm run lint` pasa.
- `npm run build` pasa.
- Las rutas protegidas responden correctamente sin sesión.
- Un usuario Free y un usuario Pro completan los checklists anteriores.
