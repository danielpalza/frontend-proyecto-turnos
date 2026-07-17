# Convenciones de UI — OdontoLite (turnos-app)

Patrones detectados repetidos a través del código (no hay una guía de estilo escrita en el repo; esto se dedujo leyendo los componentes).

## Manejo de errores HTTP

Dos capas, coordinadas por `HttpContext` (ver [`http-context.ts`](../src/app/core/interceptors/http-context.ts)):

1. **Interceptor global** (`httpErrorInterceptor`, [`core/interceptors/http-error.interceptor.ts`](../src/app/core/interceptors/http-error.interceptor.ts)):
   - **401** fuera de `/auth/*` → `AuthService.logout()` + redirect a `/login`, sin toast (la sesión ya se cerró).
   - **404** → nunca se notifica globalmente; el mensaje del backend (si lo trae) se usa **solo si el componente lo pide explícitamente** vía `ErrorHandlerService`.
   - **Todo lo demás** (400, 403, 409, 422, 500, 502, 503, 504, errores de red) → se notifica con un toast (`NotificationService.showError`), **excepto** los errores de red (`status === 0`), que **no** muestran toast global (el criterio explícito en el código es que un corte de conexión se debe mostrar solo como alerta inline en el componente afectado, no como toast — para no "gritar" un problema de red con un popup).
   - Un request puede optar por manejar su propio error pasando `context: skipGlobalErrorHandler()` — el interceptor solo loguea por consola y re-lanza, sin notificar. Se usa en login/register (`AuthService`) y en creaciones donde el componente ya arma su propio flujo de error (`PatientService.create(..., skipGlobal=true)`, `AppointmentsService.create/delete(..., skipGlobal=true)`).

2. **`ErrorHandlerService`** ([`core/services/error-handler.service.ts`](../src/app/core/services/error-handler.service.ts)): traduce un `HttpErrorResponse` a un mensaje en español legible, con reglas por código de estado (400/401/403/404/408/409/422/500/502/503/504) y prioriza siempre el `message`/`error`/`errors` que venga en el body del backend por sobre el mensaje genérico. Tiene manejo especial para 409 (conflictos de horario/documento duplicado) y para errores de red (mensajes distintos según el contexto: "crear el paciente", "crear el turno", "eliminar...").

**Patrón repetido en casi todos los `.subscribe({ error: ... })` de componentes**:
```ts
error: (err) => {
  if (err.status !== 404) {
    const message = this.errorHandler.getErrorMessage(err, 'contexto en español');
    if (!this.errorHandler.isNetworkError(err)) {
      this.notification.showError(message);
    }
  }
}
```
Es decir: nunca se notifica un 404 (lo maneja el backend con su propio mensaje contextual, o simplemente no aplica), y los errores de red se dejan para que la propia vista los muestre inline (ej. banner `alert-danger` en `TurnosViewComponent`/`PanelViewComponent`) en vez de vía toast.

## Notificaciones (toasts)

`NotificationService` ([`core/services/notification.service.ts`](../src/app/core/services/notification.service.ts)) implementa un sistema de toasts **a mano** (no usa el JS de Bootstrap salvo si está disponible como fallback opcional): crea/inyecta un `#toast-container` fijo (top-center), inserta HTML de un `.toast.bg-{success|danger|warning|info}` con ícono `bi-*`, animación CSS de entrada/salida, auto-dismiss a los 5s por defecto (`duration`), y botón de cierre manual. Cuatro variantes: `showSuccess`, `showError`, `showWarning`, `showInfo`. El texto del usuario se pasa por `escapeHtml()` antes de insertarse (previene XSS).

## Estados de carga

- **Spinners de Bootstrap** (`spinner-border`/`spinner-border-sm`) en botones mientras se envía un formulario (`[disabled]="loading"` + spinner condicional dentro del botón) — patrón repetido en login/registro, diálogos de confirmación, y todos los botones "Guardar".
- **Banners `alert-info` con spinner** para cargas de listado completas, ej. `TurnosViewComponent` (`isLoadingAppointments || isLoadingPatients || isLoadingProfesionales`), `OdontogramaViewComponent` (`loading()` signal, pantalla centrada con spinner grande).
- **Skeletons**: `PanelViewComponent` usa una clase `.skeleton` (no un componente aparte) sobre los `<span>` de valores mientras `isLoading` es verdadero.
- **Guard contra doble-submit**: casi toda acción de guardado/eliminación tiene una bandera booleana (`isSaving`, `isDeletingAppointment`, `isDeletingProfesional`, `isCreating`, `isAddingPayment`) o un `Set<string>` de ids en vuelo (`addingPayment` en `AppointmentsPanelComponent`, `guardandoIds` signal en `CoberturasViewComponent`) que bloquea reintentos mientras la petición está pendiente.

## Confirmaciones antes de acciones destructivas

**Inconsistente entre features** — no hay un único mecanismo:

| Dónde | Mecanismo |
|---|---|
| Cancelar turno (Turnos) | `ConfirmDialogComponent` (componente reutilizable propio, con `[open]`/`(openChange)`) — ver [COMPONENTS.md](./COMPONENTS.md#confirmdialogcomponent-app-confirm-dialog) |
| Eliminar profesional (Seguimiento) | Modal **propio** con markup inline en `profesionales-panel.component.html` (no reutiliza `ConfirmDialogComponent`, aunque visualmente es casi idéntico) |
| Eliminar documento adjunto / eliminar intermediario (Coberturas) | `confirm()` **nativo del navegador** (`window.confirm`), sin ningún componente Angular — ej. `if (!confirm('¿Eliminar este archivo?')) return;` |

Si se agrega una nueva acción destructiva, lo consistente con la mayoría de la UI (modales con diseño propio, iconografía Bootstrap Icons) sería reutilizar `ConfirmDialogComponent`; hoy conviven los tres enfoques.

## Actualizaciones optimistas

- **Favoritos de cobertura** (`CoberturasViewComponent.toggleFavorito`): actualiza el signal local antes de que responda el backend, y si falla, revierte — con protección de "carrera" vía un contador de secuencia por id (`favoritoSeq`) para no pisar un segundo click hecho mientras la primera request seguía en vuelo.
- **Caché de turnos** (`AppointmentsService`): `create()`, `update()`, `delete()` actualizan `appointmentsCache$` con la respuesta real del backend (no antes de que responda), pero sin volver a pedir la lista completa — mutación puntual del array en memoria.

## Feedback de formularios

- Errores de campo se muestran **debajo del input** (`<span class="field-error">`), no como tooltip ni como resumen aparte — patrón en login/registro y en los diálogos reactivos (clase `is-invalid`/`fieldErrors` o `form.get(x).invalid && form.get(x).touched`).
- Mensajes de éxito: combinación de toast (`NotificationService.showSuccess`) + a veces un mensaje inline temporal (ej. `whatsappSaved` en Configuraciones, se pone en `true` y se apaga solo a los 3 segundos con `setTimeout`).
- El envío de formularios reactivos siempre llama `form.markAllAsTouched()` antes de bloquear el submit si `form.invalid`, para que Angular muestre los estados de error de todos los campos de una vez (no solo los tocados).

## `data-testid` en (casi) todo

La enorme mayoría de elementos interactivos y contenedores relevantes tienen un atributo `data-testid="..."` (a veces interpolado con el id de la entidad, ej. `'tracking-patient-card-' + group.patient.identificacion`). No es una convención de accesibilidad ni de diseño: existe específicamente para que los Page Object Models de Playwright en `POMS/` (repo hermano `frontend-proyecto-tests`) puedan ubicar elementos de forma estable. Ver [ARCHITECTURE.md](./ARCHITECTURE.md#testing-e2e-poms).

## Otros patrones repetidos

- **Idioma**: toda la UI está en español (Argentina/LatAm), incluidos mensajes de error, labels y nombres de variables de dominio (`turno`, `paciente`, `profesional`, `cobertura`).
- **Avatares con color determinístico**: tanto `AppointmentsPanelComponent.getAvatarColorClass()` como `ProfesionalesPanelComponent.getAvatarStyle()` calculan un color de una paleta fija a partir de un hash simple del id/nombre, para que el mismo paciente/profesional siempre tenga el mismo color de avatar entre renders.
- **Integración de WhatsApp**: en todas las vistas con turnos (Turnos, Seguimiento), el botón de WhatsApp se **deshabilita visualmente** (`.btn-whatsapp-disabled`) si el paciente no tiene teléfono cargado, en vez de ocultarse — así el usuario entiende por qué no puede usarlo. El link se arma con `ConfigurationService.buildWhatsAppLink()`, que interpola la plantilla configurable de Configuraciones.
- **Debounce en inputs de búsqueda/validación**: `SearchInputComponent` (debounce configurable por `@Input`), y la verificación de disponibilidad de horario en `AppointmentDialogComponent` (`debounceTime(300)` sobre cambios de hora).
- **Fechas sin problemas de timezone**: todas las fechas se formatean a mano (`core/utils/date.utils.ts`, `formatDateToYYYYMMDD`) en vez de usar `toISOString()`, específicamente para evitar corrimientos de día cerca de medianoche en husos horarios negativos (Argentina UTC-3) — está comentado explícitamente en el código.
- **`markForCheck()` manual**: dado que la app corre zoneless (ver [STATE.md](./STATE.md)), cualquier componente `OnPush` que reciba datos por `subscribe()` (no por el pipe `async` ni por signals) llama `this.cdr.markForCheck()` dentro del callback — patrón repetido en `PanelViewComponent`, `TurnosViewComponent`, `SeguimientoViewComponent`, etc.

## Pendiente de completar por el desarrollador

- No hay una decisión documentada sobre unificar el patrón de confirmación destructiva (`ConfirmDialogComponent` vs. modal inline vs. `confirm()` nativo).
- No se determinó ningún estándar de accesibilidad (ARIA) más allá de lo que Bootstrap trae por defecto — no se ven atributos `aria-*` sistemáticos en los componentes custom (dialogs, dropdowns propios).
