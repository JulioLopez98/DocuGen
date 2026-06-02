# Onboarding y conversión

Fecha: 2026-06-02

## Objetivo

Reducir fricción para el primer documento y hacer que el salto a Pro aparezca en el momento correcto: después de entender el valor o al topar con una necesidad Pro.

## Cambios aplicados

- Onboarding orientado por objetivo: autónomo, empresa, agencia, RRHH, ecommerce y legal/operaciones.
- CTA inicial más claro: elegir objetivo, ir al generador o saltar al panel.
- Recomendaciones con contador Free/Pro para que el usuario entienda qué puede usar.
- Bloque contextual Free en el dashboard:
  - Si quedan documentos: invita a usar un documento Free real.
  - Si se agotó el límite: explica Pro como siguiente paso.
- CTA “Empezar guiado” en dashboard para usuarios sin documentos.
- Microcopy corregido en primeros pasos y onboarding.

## Embudo recomendado

1. Usuario llega a landing.
2. Entra o se registra.
3. Va a `/onboarding` si no tiene documentos.
4. Elige objetivo.
5. Genera un documento recomendado.
6. Ve resultado guardado en Documentos.
7. Si necesita Word, plantillas, a medida o más usos, aparece Pro como mejora natural.

## QA manual

Probar con usuario nuevo:

1. Registro/login.
2. Confirmar que llega a `/onboarding`.
3. Elegir cada perfil y comprobar que cambian recomendaciones.
4. Como Free, confirmar que documentos Pro llevan a precios.
5. Crear un documento Free desde onboarding.
6. Confirmar que el dashboard ya no redirige a onboarding y muestra trabajo reciente.
7. Confirmar que el bloque Free cambia al agotar 3 documentos.

## Criterio de cierre

- El usuario puede entender en menos de un minuto qué hacer primero.
- Hay un CTA claro para crear el primer documento.
- Pro aparece como mejora, no como interrupción inicial.
