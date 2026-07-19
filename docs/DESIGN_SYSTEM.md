# Sistema de diseño — OdontoLite (turnos-app)

Base: **Bootstrap 5.3** + **Bootstrap Icons 1.13** + una capa de SCSS propia (variables + mixins + clases utilitarias). No hay Angular Material, Tailwind, styled-components ni ningún CSS-in-JS. No hay un theming dinámico (claro/oscuro) implementado.

## Archivos fuente

| Archivo | Contenido |
|---|---|
| [`src/styles.scss`](../src/styles.scss) | Entry point global: `@use 'variables'`, `@use 'mixins'`, `@import "bootstrap/scss/bootstrap"`, `@import "bootstrap-icons/font/bootstrap-icons.css"`, fuente Poppins (Google Fonts), reset básico, y decenas de clases utilitarias propias (`.btn-primary-gradient`, `.card-hover`, `.badge-*`, `.empty-state`, etc.) |
| [`src/_variables.scss`](../src/_variables.scss) | Tokens: colores, espaciado, radios, breakpoints, transiciones, sombras |
| [`src/_mixins.scss`](../src/_mixins.scss) | Mixins reutilizables: botones con gradiente, cards con hover, inputs con focus, badges "soft", scrollbar fina, etc. |
| `angular.json` → `stylePreprocessorOptions.includePaths: ["src"]` | Permite que cualquier `.component.scss` haga `@use 'variables' as *;` / `@use 'mixins' as *;` sin ruta relativa |

Cada componente tiene su propio `*.component.scss` (no hay CSS global por feature); los tokens/mixins de `src/` se importan puntualmente donde se necesitan.

## Tipografía

- **Fuente**: [Poppins](https://fonts.google.com/specimen/Poppins) (pesos 300/400/500/600/700, subset `latin-ext` para acentos/ñ en español), cargada por `@import url(...)` en `styles.scss` y precargada además en `index.html` (`<link rel="preconnect">` + `<link rel="stylesheet">`).
- Sin escala tipográfica custom documentada (se apoya en las clases de Bootstrap: `h1`–`h6`, `fs-*`, `fw-*`).

## Paleta de colores (`_variables.scss`)

| Token | Valor | Uso |
|---|---|---|
| `$primary-color` | `#6366f1` (índigo) | Color de marca principal — botones, links activos, foco de inputs |
| `$primary-light` | `#818cf8` | Extremo claro del gradiente primario |
| `$primary-dark` | `#4f46e5` | Hover del botón primario |
| `$secondary-color` | `#8b5cf6` (violeta) | Extremo del gradiente secundario (CTAs grandes de odontograma) |
| `$background-color` | `#f8fafc` | Fondo general de la app |
| `$card-background` | `#ffffff` | Fondo de cards/inputs |
| `$sidebar-bg` | `#f8fafc` | Contenedores "light" (`.container-light`) |
| `$text-primary` / `$text-secondary` / `$text-muted` | `#1e293b` / `#64748b` / `#94a3b8` | Jerarquía de texto |
| `$border-color` | `#e2e8f0` | Bordes por defecto |
| `$hover-bg` | `#f1f5f9` | Fondo de hover genérico |
| `$success` / `$danger` / `$warning` / `$info` | `#01E17B` / `#F04349` / `#FDCD0F` / `#4B85F5` | Colores semánticos "vivos" (donut chart, badges soft) |
| `$success-light` / `$success-dark` | `#10b981` / `#059669` | Variante usada en botones de acción pequeños (`.btn-save`) |
| `$danger-light` / `$danger-dark` | `#ef4444` / `#dc2626` | Variante usada en botones de acción pequeños (`.btn-cancel`, `.btn-delete`) |
| `$chart-nic` / `$chart-suppuration` / `$chart-calculus` | `#2563eb` / `#7c3aed` / `#8b4513` | Paleta específica del gráfico de periodontograma, compartida entre `perio-tooth-sparkline` y `periodontograma-form` |
| `$avatar-violet/amber/green/pink/blue` | `$secondary-color` / `#f59e0b` / `$success-light` / `#ec4899` / `#3b82f6` | Paleta pastel determinística para avatares de pacientes/profesionales (mismo id → mismo color, ver [UI_RULES.md](./UI_RULES.md)) |
| WhatsApp | `#25D366` (hardcodeado en `styles.scss`, no tokenizado) | Botones/links de WhatsApp |

## Espaciado, radios, sombras, breakpoints

| Grupo | Tokens |
|---|---|
| Espaciado | `$spacing-xs` (0.25rem) … `$spacing-3xl` (2rem), más `$navbar-height: 4.75rem` |
| Radios | `$radius-sm` (0.375rem), `$radius-md` (0.5rem), `$radius-lg` (0.75rem), `$radius-xl` (1rem), `$radius-full` (999px, pills) |
| Sombras | `$shadow-sm/md/lg/xl` + `$shadow-primary`/`$shadow-primary-hover` (sombra teñida con el color primario, para hover de botones) |
| Transiciones | `$transition-fast` (0.1s), `$transition-base` (0.2s), `$transition-slow` (0.3s), todas `ease` |
| Breakpoints | `$breakpoint-xs` 576px, `$breakpoint-sm` 768px, `$breakpoint-md` 992px, `$breakpoint-lg` 1200px, `$breakpoint-xl` 1400px — con mixins `@include mobile-xs/mobile/tablet/desktop-sm` que generan `@media (max-width: ...)` |

## Mixins reutilizables (`_mixins.scss`)

| Mixin | Qué genera |
|---|---|
| `button-gradient-primary($radius)` | Botón con gradiente diagonal índigo→índigo-claro, hover con elevación y sombra |
| `button-gradient-secondary` | Gradiente horizontal índigo→violeta (usado en los CTA grandes de guardar odontograma/periodontograma) |
| `card-hover($radius)` | Card con borde que cambia a `$primary-color` + sombra al hacer hover |
| `input-focus($radius, $shadow-size)` | Estado de foco consistente (borde + halo de color primario) para inputs custom |
| `container-light-bg($radius, $padding)` | Contenedor con fondo gris claro (`$sidebar-bg`) |
| `divider($color, $margin-y)` | Línea divisoria de 1px |
| `empty-state($padding-y, $padding-x)` | Layout centrado para estados vacíos ("Sin datos", "No hay pacientes registrados", etc.) |
| `badge($bg-color, $radius)` | Badge circular pequeño (contador) |
| `badge-soft($color, $bg-opacity, $text-lightness)` | Pill translúcido: fondo `rgba(color, opacity)` + texto en variante más oscura del mismo color — usado para los estados de turno, badges de rol, avatares |
| `button-action-small($bg-color, $hover-color)` | Botón de ícono pequeño (guardar/cancelar edición inline) |
| `icon-wrapper-circle` / `icon-wrapper-circle-sm` | Círculo con ícono centrado (headers de sección, empty states) |
| `scrollbar-thin(...)` | Scrollbar delgada tipo webkit para contenedores con overflow propio |
| `nav-arrow-button` | Botón circular sin fondo para flechas de navegación de mes (Panel y calendario) |
| `section-bordered-left` | Bloque con borde izquierdo de 3px color primario |
| `sticky-container` | `position: sticky` con `max-height` relativo a `$navbar-height` |
| `btn-modal-close` | Botón cuadrado de cerrar modal (ícono solo), reutilizado por cada shell de modal propio |

## Clases utilitarias globales (definidas en `styles.scss`, disponibles en toda la app sin import extra)

- **Botones**: `.btn-primary-gradient[-lg]`, `.btn-outline-custom`, `.btn-primary-custom`, `.btn-save`, `.btn-cancel`, `.btn-delete`, `.btn-start`, `.btn-whatsapp` / `.btn-whatsapp-disabled`.
- **Cards/contenedores**: `.card-hover`, `.card-overflow`, `.container-light[-sm]`, `.sticky-container`.
- **Inputs**: `.input-custom[-sm]`, `.textarea-custom`.
- **Dividers**: `.divider`, `.divider-spaced`, `.divider-large`.
- **Empty states**: `.empty-state[-compact]`, `.empty-title`, `.empty-description`.
- **Badges de estado de turno** (aplicados vía `getStatusBadgeClass()`, repetido en `AppointmentsPanelComponent` y `seguimiento-display.util.ts`): `.badge-completado`/`.badge-confirmado` (verde, `$success`), `.badge-pendiente` (amarillo, `$warning`), `.badge-en-curso` (azul, `$info`), `.badge-cancelado`/`.badge-no-asistio` (rojo, `$danger`), `.badge-sin-estado` (gris neutro).
- **Contadores por pestaña** (Turnos/Seguimiento): `.tab-count-todos/-completado/-pendiente/-cancelado`, mismo sistema de color que los badges de estado.
- **Avatares**: `.patient-avatar.avatar-1` … `.avatar-5` (paleta pastel determinística).
- **Toasts**: `#toast-container` (posición fija top-center, `z-index: 9999`), estilizado a mano — ver [`NotificationService`](../src/app/core/services/notification.service.ts) y [UI_RULES.md](./UI_RULES.md#notificaciones-toasts).
- **Animaciones**: `@keyframes fadeIn` (`.fade-in`), `modalBackdropFadeIn`/`modalDialogFadeIn` (reutilizadas por nombre desde los SCSS de cada modal propio: `confirm-dialog`, `profesional-dialog`, etc., sin volver a declarar el `@keyframes` en cada uno).

## Iconografía

Exclusivamente **Bootstrap Icons** (`bi bi-<nombre>`), no hay SVGs custom de íconos ni otra librería (Font Awesome, Material Icons, etc.). El módulo de odontograma sí usa **SVG dibujado a mano** (no como librería de íconos, sino como visualización clínica): `ToothFacesComponent` (caras del diente) y `PerioToothSparklineComponent` (mini-gráficos de sondaje periodontal).

## Gráficos (Chart.js / ng2-charts)

Solo en `PanelViewComponent`: gráfico de línea (ingresos realizados `#198754` / pendientes `#fd7e14`, con relleno translúcido y tooltip formateado como moneda `es-AR`) y gráfico donut (turnos completados `#01E17B`, pendientes `#ffc107`, cancelados `#dc3545`, con un plugin custom `centerText` que dibuja el total en el centro). Estos colores **no** están tomados de `_variables.scss` — se definen inline en el componente (`panel-view.component.ts`), lo que los desalinea levemente de la paleta semántica de `$success`/`$warning`/`$danger` usada en el resto de la UI (ver "Pendiente" abajo).

## Formato de moneda y fecha (no es "diseño" pero es consistente visualmente en toda la app)

- **Moneda**: `core/utils/currency.util.ts` → `formatCurrency()`, usa `Intl.NumberFormat('es-AR')` con separador de miles por punto, sin decimales si son enteros (`$1.234`), devuelve cadena vacía si el monto es `0`/`null`/`undefined` (para no mostrar `"$0"` en la UI).
- **Fecha**: `core/utils/date.utils.ts` → `formatDateToYYYYMMDD()`/`getTodayAsYYYYMMDD()`, formateo manual (evita `toISOString()` para no correr un día en husos horarios negativos).

## Pendiente de completar por el desarrollador

- No hay un archivo de "design tokens" exportado para otras plataformas (ej. JSON compartido con el backend o con Figma) — los valores viven únicamente en `_variables.scss`.
- No se detectó soporte de modo oscuro (`prefers-color-scheme`) en ningún SCSS.
- Los colores del gráfico del Panel (`panel-view.component.ts`) están hardcodeados en el componente en vez de usar las variables SCSS (`$success`, `$warning`, `$danger`) — no se pudo determinar si es intencional o deuda técnica.
