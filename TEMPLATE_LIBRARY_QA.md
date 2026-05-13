# Template Library MVP QA

Checklist para validar la primera version de biblioteca de plantillas antes de desplegar o darla por cerrada.

## Supabase

- Ejecutar `supabase-template-library-1.1.sql` en SQL Editor si la base ya existia.
- Confirmar que existe la tabla `document_templates`.
- Confirmar que RLS esta activado en `document_templates`.
- Confirmar que existe el bucket privado `document-templates`.
- Confirmar que el bucket no es publico.

## Usuario Free

- Entrar con un usuario Free.
- Abrir `/plantillas`.
- Debe verse la pantalla bloqueada con CTA a Pro.
- No debe aparecer formulario de subida.
- Abrir `/plantillas/[id]` manualmente debe redirigir a `/precios`.
- El selector de plantilla de referencia no debe aparecer en `/generar`.

## Usuario Pro

- Entrar con un usuario Pro.
- Abrir `/plantillas`.
- Debe aparecer formulario de subida y biblioteca.
- Subir un archivo `.docx` menor de 10 MB.
- Debe crearse un registro en `document_templates` con estado `uploaded`.
- La tarjeta debe permitir abrir, descargar y borrar.
- Abrir la ficha de la plantilla.
- Pulsar `Procesar plantilla`.
- El estado debe pasar a `ready` y mostrarse texto extraido.
- Debe aparecer `Usar en generador`.

## Generacion con referencia

- Desde una plantilla `ready`, pulsar `Usar en generador`.
- `/generar` debe abrirse con la plantilla seleccionada.
- Completar un formulario y generar.
- El documento debe respetar el tipo seleccionado.
- El resultado puede tomar estructura/tono de la plantilla, pero no debe copiar datos concretos de la plantilla.
- El documento generado debe guardarse en historial.

## Formatos no soportados aun

- Subir un PDF.
- Abrir la ficha y pulsar `Procesar plantilla`.
- Debe quedar en `failed` con mensaje claro de que PDF se procesara en una fase posterior.
- Subir un DOC antiguo.
- Debe mostrar mensaje claro de que se recomienda DOCX.

## Seguridad y privacidad

- Un usuario no debe poder ver plantillas de otro usuario.
- Un usuario no debe poder descargar archivos del bucket de otro usuario.
- Un usuario Free no debe poder insertar registros en `document_templates`.
- La ruta `storage_path` debe empezar por el id del usuario autenticado.
- Las plantillas no deben estar incluidas en sitemap ni indexarse.

## Build

Ejecutar:

```bash
npm run lint
npm run build
```

Ambos comandos deben terminar sin errores.
