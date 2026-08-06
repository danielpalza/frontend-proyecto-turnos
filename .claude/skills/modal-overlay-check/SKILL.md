---
name: modal-overlay-check
description: Use when creating a new modal/dialog component, or touching CSS on an ancestor of an existing modal (adding transform, zoom, filter, perspective, will-change, or contain). This repo has a known latent bug pattern where modals work by accident, not by design, and it has already bitten once in Configuraciones.
---

# Checklist de overlay para modales nuevos

`docs/DEUDA_TECNICA.md` §1 documenta un bug ya ocurrido: `configuraciones-view.component.scss`
aplica `zoom: 0.88` a `.settings-panels-scale`, y eso convierte a ese elemento en el **bloque
contenedor** de sus descendientes `position: fixed` — cualquier ancestro con `zoom`, `transform`,
`filter`, `perspective`, `will-change` o `contain` hace lo mismo. El `.modal-backdrop` del diálogo
de profesional dejó de medirse contra el viewport y quedó anclado (escalado) al ancestro. Se
arregló con `appBodyPortal`, que teletransporta el overlay al `body`.

## El contrato de un modal correcto (nada lo fuerza — ni test, ni lint, ni base component)

Todo modal necesita las **dos** directivas de `src/app/shared/directives/`, registradas en
`imports` del componente standalone:

1. **`appScrollLock`** — bloquea el scroll de página mientras el modal está abierto. Aplicada
   hoy en los 9 modales existentes.
2. **`appBodyPortal`** — saca el overlay del contexto de un ancestro con bloque contenedor.
   Aplicada hoy solo en los 3 modales de Configuraciones (donde ya mordió el bug). **Los otros
   6 modales no la tienen:**
   - `appointments/components/appointment-dialog`
   - `appointments/components/confirm-dialog`
   - `coberturas/coberturas-view` (modal de alta/edición de institución)
   - `odontograma/components/save-odontograma-dialog`
   - `seguimiento/components/patient-wizard-panel`
   - `seguimiento/components/turn-payment-modal`

Esos 6 funcionan hoy **por ausencia de la condición que dispara el bug**, no porque estén bien
resueltos — el día que alguien les agregue un ancestro con `transform` (una animación de entrada,
un wrapper escalado), el bug reaparece ahí, y es difícil de atribuir: el síntoma se ve en el
modal, la causa está en un CSS lejano que puede estar en otro componente.

## Al crear un modal nuevo

Agregá **ambas** directivas desde el principio, no solo la que hace visible el problema hoy. Es
una línea por template más el registro en `imports` — y es además el comportamiento que ya
asumen Bootstrap y CDK Overlay, así que no introduce un patrón nuevo.

## Al tocar CSS de un ancestro de un modal existente

Si agregás `zoom`, `transform`, `filter`, `perspective`, `will-change` o `contain` a un elemento
que envuelve alguno de los 6 modales de la lista de arriba, agregale `appBodyPortal` en el mismo
cambio — no esperes a que el bug se reporte de nuevo.
