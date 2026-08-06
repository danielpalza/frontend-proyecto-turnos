---
name: testid-discipline
description: Use when adding or renaming an interactive element (button, input, checkbox, link, card) or a meaningful container in a component template. This repo exists specifically to be located by the Playwright Page Object Models in the sibling frontend-proyecto-tests repo, and a missing or renamed data-testid breaks that repo silently, with no build-time signal here.
---

# `data-testid` en elementos nuevos

`docs/UI_RULES.md`: *"La enorme mayoría de elementos interactivos y contenedores relevantes
tienen un atributo `data-testid="..."`. No es una convención de accesibilidad ni de diseño: existe
específicamente para que los Page Object Models de Playwright en `POMS/` (repo hermano
`frontend-proyecto-tests`) puedan ubicar elementos de forma estable."*

Este repo no tiene ningún test propio que se rompa si un `data-testid` desaparece o cambia de
nombre — **cero `*.spec.ts` en `src/`**. La única señal de que algo se rompió llega desde el otro
repo, en otra corrida de CI, potencialmente días después.

## Al agregar un elemento interactivo nuevo

1. Agregale `data-testid="..."`, siguiendo el patrón existente en el mismo feature (kebab-case,
   a veces interpolado con el id de la entidad — ej. `'tracking-patient-card-' +
   group.patient.identificacion`). Mirá un componente hermano en la misma carpeta de features
   para copiar la convención de nombres exacta, no inventes una nueva.
2. Priorizá esto en cualquier elemento que un test E2E probablemente necesite: botones de acción,
   inputs de formulario, checkboxes de filtro, items de tabla/lista, tabs de navegación.

## Al renombrar o eliminar un `data-testid` existente

Esto es lo que más silenciosamente rompe al repo hermano. Antes de renombrar:

1. Buscá el testid actual en `../frontend-proyecto-tests` (page objects bajo `pages/*.page.ts` y
   specs bajo `tests/`) para ver si algo lo usa.
2. Si lo usa, coordiná el rename en ambos repos en el mismo cambio — no lo dejes para "después".
   Ya pasó que el repo de tests tuvo que corregir testids asumidos contra los templates reales
   (`docs/playwright-tests-turnos.md` en `frontend-proyecto-tests`, ej. el checkbox correcto es
   `search-pending-checkbox` no `pending-only-checkbox`, y `.price-edit-input` no tiene testid en
   absoluto) — el costo de esa desincronización ya se pagó una vez.

## Prioridad de selectores (para contexto, no para este repo directamente)

El repo de tests prioriza `getByTestId` primero, y solo cae a `getByRole`/`getByLabel` cuando no
hay testid. Eso significa que un elemento sin `data-testid` no rompe un build acá, pero fuerza al
otro repo a un selector más frágil (texto, rol, clases) — evitalo salvo que el elemento
genuinamente no lo necesite (texto puramente decorativo, por ejemplo).
