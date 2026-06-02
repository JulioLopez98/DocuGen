# QA visual de release candidate

Fecha: 2026-06-02

URL revisada: https://docu-gen-beige.vercel.app/

## Páginas públicas revisadas

| Página | Desktop | Mobile | Resultado |
| --- | --- | --- | --- |
| Landing | Sin errores de consola, CTA visibles, sin overflow horizontal | Sin overflow horizontal, navegación pública clara | OK |
| Precios | Planes y CTAs visibles, copy claro | CTAs accesibles y sin desbordes | OK |
| Catálogo | 50 tipos visibles, categorías claras | Sin overflow horizontal | OK |
| Auth | Mensajes de acceso correctos | Formulario y Google visibles | OK |
| Página SEO de documento | H1, CTA y datos necesarios visibles | Sin overflow horizontal | OK |

## Rutas protegidas revisadas sin sesión

| Ruta | Resultado esperado | Resultado |
| --- | --- | --- |
| `/dashboard` | Redirige a acceso | OK |
| `/generar` | Redirige a acceso | OK |
| `/historial` | Redirige a acceso | OK |
| `/plantillas` | Redirige a acceso | OK |
| `/ajustes` | Redirige a acceso | OK |

## Comprobaciones técnicas visuales

- Sin errores de consola en páginas públicas revisadas.
- Sin overflow horizontal en desktop ni mobile.
- Botones principales con tamaño adecuado.
- Footer ajustado para mejorar área táctil en mobile.
- Navegación pública reducida y entendible para usuarios no autenticados.

## Pendiente manual con sesión real

Estas pantallas requieren iniciar sesión con cuenta Free/Pro en producción:

1. Panel: comprobar primeros pasos, plan, uso mensual y recomendaciones.
2. Crear: comprobar wizard, selección de documento, formulario, loading y resultado.
3. Historial: comprobar desplegado, descarga, regeneración y borrado.
4. Plantillas: comprobar empty state, subida, procesamiento y uso como referencia.
5. Ajustes: comprobar marca, plan y navegación.
6. Asistente: comprobar chat Pro y generación guiada.
7. Workspace: comprobar que Empresa no abruma a usuarios Pro/Free.

## Criterio de cierre

La versión puede considerarse candidata cuando:

- `npm run lint` pasa.
- `npm run build` pasa.
- Vercel despliega el último commit.
- Un usuario Free y un usuario Pro pasan el checklist manual de `docs/functional-qa.md`.
