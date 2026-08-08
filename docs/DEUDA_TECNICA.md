# Deuda técnica — frontend

> Alcance: deuda del frontend Angular. Complementa [UI_RULES.md](./UI_RULES.md) (convenciones vigentes)
> y, del lado del backend, `docs/DEUDA_TECNICA_PERMISOS.md`, que cubre la deuda del sistema de permisos.
>
> Última actualización: 2026-08-08, tras la auditoría UT-070 (§ 4.3): tercera instancia confirmada del
> patrón de `markForCheck()` faltante, en `ConfiguracionesViewComponent.saveWhatsappTemplate()`.
> Anteriormente, misma fecha: se agregó la § 7 (`AppointmentListOverflowComponent`: dos bugs
> — un `TypeError` en `ngAfterViewInit` cuando el mes filtrado no tiene turnos, y un nodo huérfano en
> `document.body` si el componente se destruye con el dropdown de acciones abierto — encontrados
> escribiendo su spec, Tier 6 de [PLAN_DE_TESTING.md](./PLAN_DE_TESTING.md)) y la § 6
> (`ProfesionalesPanelComponent.onSaveProfesional`: el toast de éxito siempre dice "creado", incluso al
> actualizar, por leer `editingProfesional` después de que `closeAddProfesional()` ya lo vació).
> Anteriormente, 2026-08-07: se agregó la § 5 (`PerioStateService`: `hasPerioData` compara
> contra un objeto parcial y marca cualquier diente sin baseline como "con datos", encontrado
> escribiendo el spec de Tier 2 de [PLAN_DE_TESTING.md](./PLAN_DE_TESTING.md)). Antes, misma fecha:
> encontrar una **séptima** instancia del hueco de § 1.1 (`turn-clinical-modal`, no listado en el
> relevamiento original) mientras se profundizaba el detalle técnico del mismo plan — ver nota al
> final de § 1.1. Antes de eso, misma fecha: encontrar una segunda instancia del gotcha de change
> detection zoneless (sección 4) escribiendo la suite E2E de `frontend-proyecto-tests`. La
> actualización anterior fue el 2026-07-24, rama `main`, tras el relevamiento de toasts duplicados
> (sección 3), disparado por el doble toast al
> entrar con permisos de profesional.

## 1. Overlays

Contexto: hoy conviven dos directivas para modales, ambas en `src/app/shared/directives/`.

| Directiva | Qué resuelve | Dónde está aplicada |
|---|---|---|
| `appScrollLock` | Bloquea el scroll de página mientras el modal está abierto | los 10 modales |
| `appBodyPortal` | Saca el overlay del contexto de un ancestro con `zoom`/`transform` | solo los 3 de Configuraciones |

### 1.1 Siete modales dependen de que ningún ancestro cree un bloque contenedor

Un elemento con `zoom`, `transform`, `filter`, `perspective`, `will-change` o `contain` pasa a ser el
**bloque contenedor** de sus descendientes `position: fixed`. Cuando eso ocurre, un `.modal-backdrop`
con `position: fixed; inset: 0` deja de medirse contra el viewport y se ancla —escalado— al ancestro.

Fue exactamente el bug de Configuraciones: `.settings-panels-scale` aplica `zoom: 0.88`
(ver [`configuraciones-view.component.scss`](../src/app/features/configuraciones/configuraciones-view/configuraciones-view.component.scss)),
y el backdrop del diálogo de profesional no cubría la pantalla. Se resolvió con `appBodyPortal`, que
teletransporta el overlay al `body`.

Los siete modales restantes **no** llevan la directiva (confirmado leyendo cada template, no solo el
`.ts`: los 7 tienen `appScrollLock` pero ninguno importa `BodyPortalDirective`):

- `appointments/components/appointment-dialog`
- `appointments/components/confirm-dialog`
- `coberturas/coberturas-view` (modal de alta/edición de institución)
- `odontograma/components/save-odontograma-dialog`
- `seguimiento/components/patient-wizard-panel`
- `seguimiento/components/turn-payment-modal`
- `seguimiento/components/turn-clinical-modal` — **agregado 2026-08-07**: no estaba en el relevamiento
  original (§ recontado abajo). Mismo patrón exacto que los otros seis: `.modal-backdrop` en su
  template con `appScrollLock` pero sin `appBodyPortal`.

Hoy funcionan **por ausencia de la condición que dispara el bug**, no por diseño: ninguna de esas vistas
tiene todavía un ancestro que cree bloque contenedor. La deuda es que la corrección quedó puntual en vez
de sistémica — el día que alguien agregue un `transform` (una animación de entrada de página, un wrapper
escalado como el de Configuraciones) el bug reaparece ahí, y de forma difícil de atribuir: el síntoma
aparece en el modal, la causa está en un CSS lejano.

**Arreglo de raíz:** aplicar `appBodyPortal` a los siete. Es una línea por template más el registro en
`imports` del componente standalone. Teletransportar todo overlay al `body` es además el comportamiento
que ya asumen Bootstrap y CDK Overlay, así que no introduce un patrón nuevo.

No se hizo en su momento por acotar el cambio a lo reportado.

**Nota sobre cómo se encontró el séptimo caso (2026-08-07):** el relevamiento original de esta sección
se hizo a ojo sobre el código; al diseñar la auditoría automatizada que propone § 1.2 (documentada como
UT-069 en [PLAN_DE_TESTING.md § 12](./PLAN_DE_TESTING.md)), se greppeó `appScrollLock` en todos los
templates y se comparó contra `appBodyPortal` en el mismo archivo — ese método encontró
`turn-clinical-modal`, que el ojo humano se había salteado. También reveló que **no todos los modales
usan las clases `.modal`/`.modal-backdrop` literales**: `confirm-dialog` usa nombres propios
(`.confirm-modal-backdrop`, `.confirm-modal`). Por eso la auditoría de UT-069 debe buscar por la
**directiva** (`appScrollLock` sin `appBodyPortal` en el mismo template), no por el nombre de la clase
CSS — buscar por clase se habría perdido `confirm-dialog` igual que se perdió `turn-clinical-modal` a
ojo.

### 1.2 El contrato de un modal nuevo no está forzado por nada

Un modal correcto hoy necesita acordarse de tres cosas: `appScrollLock`, `appBodyPortal` y registrar
ambas en `imports`. Nada lo verifica — ni un test, ni un lint, ni un componente base. Un modal nuevo que
las omita **no falla de forma visible**: se ve bien hasta que la página tiene scroll o aparece un
ancestro transformado.

Opciones, de menor a mayor alcance:

1. Documentar el contrato en [UI_RULES.md](./UI_RULES.md). Barato, no fuerza nada.
2. Un test que recorra los templates y falle si un `.modal`/`.modal-backdrop` no lleva ambas directivas.
   Ataca el default inseguro sin refactor.
3. Un `<app-modal-shell>` que encapsule backdrop, portal, scroll lock, foco y `Escape`. Es el arreglo
   correcto, pero toca los 9 modales y hoy cada uno trae su propio markup y estilos.

La 2 da la mayor parte del beneficio por bastante menos trabajo que la 3.

### 1.3 El bloqueo de scroll depende de un `!important` global

`ScrollLockService` opera sobre `<html>` con `setProperty(..., 'important')` porque
[`styles.scss`](../src/styles.scss) declara `html { overflow-y: scroll !important }` y
`body { overflow-y: visible !important }`.

Es correcto y está comentado en el servicio, pero es **acoplamiento a un detalle de un archivo lejano**:
si esos `!important` se quitan o se mueve el scroller a otro elemento, el lock deja de funcionar de forma
silenciosa. El primer intento de este mismo arreglo falló justamente por apuntar al `body`.

Un test de integración que abra un modal y verifique que `<html>` no scrollea lo cubriría.

### 1.4 `.settings-panels-scale` escala con `zoom`

El `zoom: 0.88` de Configuraciones es un ajuste visual que se paga con un efecto colateral no obvio
—romper `position: fixed` en todo el subárbol— y con `zoom` fuera del estándar CSS hasta hace poco (de
ahí el fallback `@supports not (zoom: 1)` con `transform: scale()`, que tiene el mismo efecto).

Si el objetivo es que los paneles se vean más chicos, hacerlo con las variables de tipografía y espaciado
del design system es más predecible que escalar un subárbol entero. No es urgente: con `appBodyPortal`
aplicado en todos lados, el efecto colateral queda neutralizado.

## 2. Sintaxis de templates

### 2.1 Control flow legacy (`*ngIf` / `*ngFor`)

`*ngIf` está deprecado en la versión de Angular del repo (21) y el IDE lo reporta como hint en cada uso.
Estado actual:

| | Archivos |
|---|---|
| Con `*ngIf` (150 ocurrencias) | 21 |
| Con `*ngFor` | 15 |
| Con `@if` (sintaxis nueva) | 14 |

El repo está **a mitad de camino**: `coberturas` y partes de `profesionales-panel` ya usan `@if`/`@for`,
el resto sigue con directivas estructurales. Convivencia de dos sintaxis para lo mismo, más ruido de
deprecación que tapa hints reales.

Migrar es mecánico y hay schematic oficial:

```bash
ng generate @angular/core:control-flow
```

Conviene hacerlo **en un commit propio y sin otros cambios**: toca muchos archivos y mezclarlo con
trabajo funcional vuelve ilegible cualquier diff. Ojo con `*ngTemplateOutlet` (`coberturas-view` lo usa),
que no es parte de la migración y se mantiene igual.

Deuda de bajo riesgo: no hay bug asociado, es costo de lectura y de ruido en el linter.

## 3. Notificación de errores HTTP: toasts duplicados

Contexto: entrar con permisos de profesional mostraba **dos toasts idénticos** ("No tenés permiso para
realizar esta acción"). La causa inmediata —`ProfesionalService` pedía en el arranque
`GET /profesionales`, que exige `PROFESIONALES:VIEW`— ya está resuelta: el servicio ahora bifurca a
`/profesionales/active` (el endpoint sin capacidad que el backend expone para los combos del alta de
turnos) cuando la sesión no tiene la capacidad.

Lo que **no** se resolvió es la duplicación en sí, que es estructural y sobrevive a ese arreglo puntual.
El contrato está descrito en [UI_RULES.md § Manejo de errores HTTP](./UI_RULES.md): el interceptor
notifica todo salvo 401, 404, errores de red, endpoints `/auth/*` y peticiones marcadas con
`skipGlobalErrorHandler()`. Todo `showError` en un handler de error cuya petición **no** marca
`skipGlobal` emite un segundo toast sobre el mismo error.

El agravante es que el patrón que UI_RULES documenta como canónico —`if (err.status !== 404)` +
`!isNetworkError(err)`— **no protege de esto**: calca exactamente las exclusiones del interceptor, así
que solo deja pasar los casos en que el interceptor sí notificó. Se lee como un guard y funciona como
un amplificador.

### 3.1 La rama de 403 ignora `skipGlobalErrorHandler`

[`http-error.interceptor.ts`](../src/app/core/interceptors/http-error.interceptor.ts) desvía el 403 a
`handleCapabilityForbidden` y hace `return` **antes** de leer `SKIP_GLOBAL_ERROR_HANDLER`. Consecuencia:
`skipGlobal` hoy no silencia los 403, y no hay forma de que un componente se haga cargo de ese caso.

Es la deuda de mayor palanca de la sección: incluso los call sites que **sí** hacen lo correcto (los de
§ 3.4) duplican ante un 403. Mover la lectura del contexto por encima del bloque de 403 arregla de una
todos los sitios de § 3.2 *y* los 403 de los correctos.

### 3.2 23 call sites duplican el toast del interceptor

| Área | Sitios | Petición sin `skipGlobal` |
|---|---|---|
| `core/services/patient.service.ts` | :29 | `GET /patients` eager en el constructor — mismo bug que tenía `ProfesionalService` |
| `core/services/profesional.service.ts` | :29 | ya no dispara 403, pero sigue duplicando en 500/502/etc. |
| `coberturas/coberturas-view` | :182, :191, :254, :287, :320, :353, :380, :388, :404, :478, :512 | `CoberturasService` e `IntermediariosService` no usan `HttpContext` en ningún método |
| `configuraciones/.../invitation-dialog` | :75, :116, :144 | `findAll` / `create` / `revoke` |
| `configuraciones/.../profesionales-panel` | :162, :205, :227 | `create`/`update` / `delete` / `toggleActive` |
| `configuraciones/configuraciones-view` | :135 | `saveMensajeWhatsapp` |
| `seguimiento/seguimiento-view` | :85 | `handleLoadError`, solo por la rama `getSeguimientoResumen()` |
| `seguimiento/.../patient-wizard-panel` | :185 | duplica **solo al editar**: `create(…, true)` marca skip, `update(…)` no |

Arreglo: por cada uno, o marcar la petición con `skipGlobalErrorHandler()` (si el componente necesita el
mensaje para mostrarlo inline además del toast), o borrar el `showError` y dejar que notifique el
interceptor. La primera opción es la correcta donde ya se guarda el mensaje en una propiedad
(`saveProfesionalError`, `patientFormError`, `errorMessage`); la segunda, en el resto.

### 3.3 Cinco handlers de error que nunca se ejecutan

Cuelgan de `BehaviorSubject` de cache que los servicios ya blindan con `catchError → of(...)`, así que la
rama `error:` no llega jamás:

- `appointments/pages/turnos-view` :95, :118, :140 — `getFilteredAppointments()` / `getPatients()` / `getProfesionales()`
- `configuraciones/.../profesionales-panel` :75 — `getProfesionales()`
- `seguimiento/seguimiento-view` :85, por la rama `patientService.getPatients()`

No duplican nada; el problema es lo contrario. Aparentan cubrir el fallo de carga de esos caches, que en
realidad hoy **se traga en silencio** el `catchError` del servicio (el cache queda con el valor anterior y
la vista no distingue "sin datos" de "falló"). `AppointmentsService` ya resolvió esto bien con un
`loadError$` aparte al que `turnos-view` se suscribe; los caches de pacientes y profesionales no tienen
equivalente.

Ojo al limpiar: borrar los handlers muertos sin agregar antes el canal de error deja el fallo aún más
invisible.

### 3.4 Qué está bien y no hay que tocar

Para que una limpieza masiva no rompa lo que ya funciona, los 16 `showError` restantes son correctos:

- **Validaciones de cliente, sin HTTP**: `appointments.service` :229, `appointments-panel` :586,
  `turnos-view` :272, :300, :340, `coberturas-view` :364, :368, `invitation-dialog` :126 (clipboard).
- **Peticiones con `skipGlobal: true`**: `appointments.service` :238, :258 (dentro de
  `addPaymentWithFeedback` / `updateWithFeedback`), `turnos-view` :318, :364, :457.
- **Endpoints `/auth/*`**: `login.component` :168, :248 — el interceptor los propaga sin notificar.

### 3.5 Nada impide que el próximo caso vuelva a aparecer

Es el mismo patrón que § 1.2: el contrato existe (documentado en UI_RULES) pero no lo fuerza ni un test ni
un lint, y omitirlo **no falla de forma visible** — sale un toast de más, que nadie reporta como bug hasta
que salen dos idénticos y encima seguidos.

Opciones, de menor a mayor alcance:

1. Dedupe en `NotificationService`: suprimir un mensaje idéntico pedido hace menos de ~1 s. Barato y
   ataca el síntoma en cualquier ruta, presente o futura, pero deja la petición redundante y esconde el
   error de diseño en vez de corregirlo.
2. Invertir el default de `skipGlobal` a `true` en los servicios y que el interceptor notifique solo lo
   que nadie reclamó. Coherente, pero toca todos los servicios de una.
3. Un helper `handleHttpError(err, contexto)` en `ErrorHandlerService` que devuelva el mensaje para
   mostrar inline **sin** notificar, y reservar `showError` a los errores de cliente. Convierte el patrón
   canónico en uno que no puede duplicar por construcción.

## 4. Change detection zoneless: campo plano mutado en un `.subscribe()` sin `markForCheck()`

Contexto: la app corre con `provideZonelessChangeDetection()` ([STATE.md](./STATE.md)) — una mutación de
un campo de clase plano (no signal) dentro del callback de un `.subscribe()` RxJS **no** dispara por sí
sola un re-render. El síntoma es silencioso: el dato correcto llega (se puede confirmar en Network/consola),
pero la vista nunca lo refleja, sin ninguna excepción ni warning.

Encontradas dos instancias del mismo patrón en módulos distintos, en sesiones de trabajo separadas:

### 4.1 `AppointmentDialogComponent.setupHoraAvailabilityValidation()` — RESUELTO (2026-08-07)

`availabilityError`/`isCheckingAvailability` se mutaban dentro de un pipeline `debounceTime` +
`switchMap` sobre `AppointmentsService.checkAvailability()`. El backend respondía `{"available":false}`
correctamente ante un horario ocupado, pero el input de hora nunca ganaba la clase `is-invalid` ni
aparecía el mensaje "Este horario ya está ocupado" — el usuario podía intentar guardar un turno en un
slot ocupado sin ningún aviso previo (el backend igual lo rechazaba al guardar, con un 409, pero el
aviso *anticipado* que la UI dice ofrecer estaba roto). Encontrado escribiendo TUR-074 en
`frontend-proyecto-tests`.

**Fix:** se inyectó `ChangeDetectorRef` en el componente y se agregó `this.cdr.markForCheck()` después
de cada mutación async de esos dos campos — las tres ramas del `switchMap` (sin profesional/fecha/hora,
formato de hora inválido, inicio de la llamada) más el `subscribe` final (éxito y error).

### 4.2 `ProfesionalesPanelComponent.onSaveProfesional()` — sin resolver

Mismo patrón, esta vez en la rama `error:` de un `subscribe()`: cuando el guardado de un profesional
falla (ej. matrícula duplicada, 409), `saveProfesionalError` se setea correctamente — confirmado en
consola, con dos toasts visibles (uno del interceptor HTTP global, otro del propio componente) — pero
`settings-profesional-save-error` nunca aparece en el DOM, y el botón "Guardar profesional" queda
deshabilitado con el texto "Guardando…" indefinidamente. El usuario no tiene forma de saber que falló ni
de reintentar sin recargar la página a mano.

El camino de éxito no se ve afectado porque el refetch de la lista de profesionales que sigue (que sí
llama `markForCheck()`, en la suscripción de `ngOnInit`) dispara un re-render que de paso también pinta
los cambios pendientes del propio diálogo — el camino de error no tiene ningún otro disparador cerca que
lo salve por accidente.

**No se arregló.** Cubierto por un test dedicado marcado `test.fail()` en vez de dejarlo fuera de la
suite (`tests/configuraciones/profesionales.spec.ts` en `frontend-proyecto-tests`, *"PRO-008 (UI, bug
conocido)"*): documenta el bug tal cual se comporta hoy — si algún día empieza a pasar solo, es señal de
que se agregó el `markForCheck()` que falta, y hay que actualizar el test, no arreglarlo a ciegas. Mismo
fix que 4.1: inyectar `ChangeDetectorRef` y llamar `markForCheck()` en la rama `error:`.

### 4.3 Una tercera instancia, encontrada en la auditoría UT-070

Mismo problema estructural que § 1.2 y § 3.5: el contrato ("todo `subscribe()` que mute estado
consultado por el template necesita `markForCheck()`, incluso sin `OnPush` explícito — la app entera es
zoneless con `provideZonelessChangeDetection()`") está documentado ([STATE.md](./STATE.md)) pero no lo
fuerza nada — ni test, ni lint, ni un wrapper.

**La tercera instancia** (encontrada el 2026-08-08 en la auditoría semi-manual UT-070 de
[PLAN_DE_TESTING.md § 12.1](./PLAN_DE_TESTING.md)): `ConfiguracionesViewComponent.saveWhatsappTemplate()`.

```ts
saveWhatsappTemplate(): void {
  this.configurationService.saveMensajeWhatsapp(this.whatsappTemplate).subscribe({
    next: () => {
      this.whatsappSaved = true;
      setTimeout(() => { this.whatsappSaved = false; }, 3000); // ← tampoco llama markForCheck() acá
    },
    error: (err) => { /* ... no llama markForCheck() tampoco ... */ }
  });
}
```

El componente sí inyecta `ChangeDetectorRef` y sí lo usa correctamente en la suscripción de `ngOnInit`
(`getConfig()`) — pero ni la rama `next:` de `saveWhatsappTemplate()` ni el `setTimeout` que la sigue lo
llaman. El template consulta `whatsappSaved` con un `*ngIf` directo (sin `async pipe` ni señal):

```html
<span class="text-success small fw-semibold" *ngIf="whatsappSaved">
  <i class="bi bi-check-circle me-1"></i>Configuracion guardada
</span>
```

Al guardar la plantilla de WhatsApp, el estado interno (`whatsappSaved`) se actualiza correctamente
(confirmado por el spec, que lo lee directo del componente), pero el mensaje de confirmación
"Configuración guardada" puede no aparecer en pantalla — depende de si algún otro disparador ajeno
(otro `signal()`, otro evento de template) fuerza un ciclo de detección de cambios cerca en el tiempo.
A diferencia de § 4.1/4.2 (donde el mensaje de error simplemente nunca aparece), acá el síntoma es más
errático: puede aparecer a veces sí y a veces no, según qué más esté pasando en la página en ese momento
— lo cual lo hace más difícil de notar/reportar que los otros dos casos.

**No se arregló** — mismo criterio de toda esta lista: el spec
(`configuraciones-view.component.spec.ts`) fija el comportamiento actual leyendo el estado del
componente directamente, sin depender del DOM para esa aserción puntual.

**Arreglo de raíz, cuando se priorice:** agregar `this.cdr.markForCheck()` en la rama `next:` de
`saveWhatsappTemplate()` y dentro del callback del `setTimeout`, igual que ya hace `ngOnInit`.

**Revisados en la misma auditoría, sin poder confirmar si son bugs reales o no** (quedan para una
próxima ronda, no vale la pena adivinar sin poder observar el DOM real bajo carga):
- `TurnPaymentModalComponent` (UT-067): ningún método de guardado (precio, observaciones, pago) inyecta
  `ChangeDetectorRef` ni usa señales — mismo patrón de riesgo que los tres casos confirmados arriba.
- `PatientWizardPanelComponent` (UT-065): mismo patrón — `savePatient()` no inyecta `ChangeDetectorRef`.
- `SaveOdontogramaDialogComponent` (UT-062): mixto — `saveError` es una señal (se re-renderiza sola),
  pero `saving`/`open` son campos planos sin `markForCheck()` cerca; no se pudo confirmar si el
  `openChange.emit()` de `close()` alcanza a disparar un ciclo de detección que de paso los actualice.

Vale la pena una pasada más sistemática (posiblemente con un test que renderice cada componente y
verifique el DOM tras un `fixture.detectChanges(false)` diferido, no con un spy sobre
`ChangeDetectorRef` — ver la nota correspondiente en
[PLAN_DE_TESTING.md](./PLAN_DE_TESTING.md#15-historial)) antes de asumir que estos tres están bien o
mal.

La 1 y la 3 confirmadas son parches útiles como red de seguridad, no arreglos — el 4.3 original de esta
sección (auditar sistemáticamente en vez de encontrarlas una por una) sigue siendo lo que corrige el
default.

## 5. `PerioStateService`: todo diente sin baseline viaja en el delta de guardado, tenga datos o no

Encontrado el 2026-08-07 escribiendo el spec de `PerioStateService`
(`src/app/features/odontograma/services/perio-state.service.spec.ts`, Tier 2 de
[PLAN_DE_TESTING.md](./PLAN_DE_TESTING.md)) — no es un caso de laboratorio, el test más simple posible
(`loadPerio()` con estado vacío, sin tocar nada, `buildPeriodontogramDelta()`) ya lo reproduce.

**La causa** está en `perio-delta.util.ts`:

```ts
export function dienteDeltaEquals(a: PeriodontogramaDienteDelta, b: PeriodontogramaDienteDelta): boolean {
  const fields = [/* 36 campos: mobility, furcation, y 34 de sondaje/sangrado/placa/... */];
  return fields.every(f => (a[f] ?? (typeof a[f] === 'boolean' ? false : 0)) === (b[f] ?? (typeof b[f] === 'boolean' ? false : 0)));
}

export function hasPerioData(d: PeriodontogramaDienteDelta): boolean {
  return dienteDeltaEquals(d, { numeroDiente: d.numeroDiente, mobility: 0, furcation: 0 }) === false;
}
```

`hasPerioData` compara contra un objeto que solo tiene 3 de los 36 campos (`numeroDiente`, `mobility`,
`furcation`) — los otros 33 (24 de ellos booleanos: sangrado/placa/supuración/cálculo ×
vestibular/lingual × mesial/central/distal) quedan `undefined` en ese objeto. El fallback de
`dienteDeltaEquals` decide el default mirando `typeof` del valor que falta: como `typeof undefined`
nunca es `'boolean'`, esos 24 campos caen a `0` en vez de `false`. Un diente realmente vacío (con sus
24 flags en `false`, que es lo que arma `emptyPerioFace()`) nunca resulta "igual" a ese objeto de
comparación porque `false !== 0` en JavaScript — así que `hasPerioData` devuelve `true` para
**cualquier** diente sin baseline previo, tenga datos clínicos reales o no.

**Efecto en `buildPeriodontogramDelta()`** (`perio-state.service.ts`): todo diente del mapa de 32 que
no tiene una entrada previa en `baselinePerio.dientes` pasa por `hasPerioData` y, por este bug, siempre
entra al delta de guardado — aunque el usuario no haya tocado nada. Si el backend representa
`estadoActual`/`cambiosTurno` como una lista dispersa (solo los dientes con datos reales, que es lo más
razonable para no inflar la respuesta), esto significa que **cada guardado de periodontograma reenvía
como "cambiados" todos los dientes todavía no tocados**, no solo los del turno actual — ruido en el
payload como mínimo, y un riesgo real si el backend interpreta "presente en el delta" como "el
profesional lo revisó".

**Por qué `leyendaHasData` (el equivalente del lado Odontograma, `odonto-delta.util.ts`) no tiene este
problema**: chequea cada campo explícitamente con `!!(l.ausencia || l.implante || ...)`, no compara
contra un objeto parcial — no hay ningún `typeof` de por medio. Es la asimetría entre ambos lados que
ya anticipaba [PLAN_DE_TESTING.md § 8.1](./PLAN_DE_TESTING.md) antes de escribir el spec ("revisar si
una reversión a *sin datos* con baseline con datos genera delta, igual que en `odonto-delta.util.ts`")
— al escribirlo, resultó ser peor de lo esperado: no es una reversión que no se detecta, es que el
diente **nunca** se puede detectar como "sin cambios" si no tiene baseline.

**No se corrigió.** El spec (`perio-state.service.spec.ts`) fija el comportamiento actual con un test
explícito (`"BUG conocido: sin ningún baseline, los 32 dientes vacíos igual entran al delta"`) en vez
de un caso ideal inventado — mismo criterio que el punto 4.2 de esta lista.

**Arreglo de raíz, cuando se priorice:** pasarle a `hasPerioData` un objeto de comparación con los 36
campos explícitos (`{ ...emptyPerioFace-shaped, mobility: 0, furcation: 0 }`, todos los booleanos en
`false` de verdad), no uno parcial — o más simple, reescribir `hasPerioData` para chequear cada campo
como hace `leyendaHasData`, sin pasar por `dienteDeltaEquals` contra un objeto incompleto.

## 6. `ProfesionalesPanelComponent.onSaveProfesional()`: el toast de éxito siempre dice "creado", incluso al actualizar

Encontrado el 2026-08-08 escribiendo el spec de `ProfesionalesPanelComponent`
(`src/app/features/configuraciones/components/profesionales-panel/profesionales-panel.component.spec.ts`,
Tier 6 de [PLAN_DE_TESTING.md](./PLAN_DE_TESTING.md), UT-056).

**La causa**, en la rama `next:` de `onSaveProfesional()`:

```ts
next: () => {
  this.isSavingProfesional = false;
  this.closeAddProfesional();       // ← pone this.editingProfesional = null
  this.notification.showSuccess(
    this.editingProfesional ? 'Profesional actualizado correctamente.' : 'Profesional creado correctamente.'
  );                                  // ← lee editingProfesional DESPUÉS de que closeAddProfesional() ya lo vació
},
```

`closeAddProfesional()` limpia `editingProfesional` (entre otras cosas, para dejar el formulario listo
para la próxima apertura) **antes** de que el `? :` del mensaje lo lea — así que la condición siempre
evalúa `null`/falsy y el toast dice "creado" sin importar si en realidad se llamó a `update()`. La
llamada al servicio en sí es correcta (`update(id, dto)` cuando corresponde); el problema es puramente
cosmético, en el texto del toast. La rama `error:` no tiene este problema porque lee
`this.editingProfesional` sin haber llamado antes a ningún reset.

**No se corrigió.** El spec fija el comportamiento actual con un test explícito (`'BUG: el toast de
éxito siempre dice "creado", incluso al actualizar...'`) en vez de asumir el mensaje correcto — mismo
criterio que los puntos 4.2 y 5 de esta lista.

**Arreglo de raíz, cuando se priorice:** leer `this.editingProfesional` (o guardarlo en una variable
local al principio del método) **antes** de llamar a `closeAddProfesional()`, o mover el
`showSuccess(...)` antes del cierre del formulario.

## 7. `AppointmentListOverflowComponent`: dos bugs encontrados escribiendo su spec (UT-064)

Encontrados el 2026-08-08 escribiendo
`src/app/features/seguimiento/components/appointment-list-overflow/appointment-list-overflow.component.spec.ts`
(Tier 6 de [PLAN_DE_TESTING.md](./PLAN_DE_TESTING.md)). Ninguno de los dos se corrigió — mismo criterio
que los puntos 4.2 y 6 de esta lista: el spec fija el comportamiento actual con un test explícito.

### 7.1 `ngAfterViewInit` revienta con `TypeError` si el período filtrado no tiene turnos

```ts
@ViewChild('apptList') private readonly apptList!: ElementRef<HTMLDivElement>;
...
ngAfterViewInit(): void {
  this.resizeObserver = new ResizeObserver(entries => this.onResize(entries));
  this.resizeObserver.observe(this.apptList.nativeElement); // ← undefined si appointments.length === 0
}
```

El div con `#apptList` está detrás de `*ngIf="appointments.length > 0"` en el template. Si el array de
turnos llega vacío, ese `ViewChild` nunca se resuelve y `ngAfterViewInit` lee `.nativeElement` de
`undefined`.

El padre (`seguimiento-view.component.html`) solo evita instanciar este componente cuando
`group.totalTurnos === 0` (el total histórico del paciente, sin filtrar). Pero le pasa
`[appointments]="getFilteredAppointments(group)"`, que sí aplica el filtro de año/mes seleccionado —
así que un paciente con turnos en **otros** meses pero ninguno en el mes actualmente filtrado deja
`group.totalTurnos > 0` (el componente se crea) y `getFilteredAppointments(group)` en `[]` (el
`ViewChild` no se resuelve). Es decir, **sí es alcanzable en producción**, no un caso de laboratorio:
cualquier paciente con turnos fuera del mes que se esté mirando en Seguimiento lo dispara al elegir ese
mes.

**Arreglo de raíz, cuando se priorice:** guardar `this.apptList?.nativeElement` con optional chaining
antes de llamar a `observe(...)`, o mover el div `#apptList` fuera del `*ngIf` (dejando el mensaje vacío
como contenido condicional *adentro* de un contenedor que siempre exista).

### 7.2 El dropdown de acciones reubicado en `document.body` queda huérfano si el componente se destruye mientras está abierto

El setter de `@ViewChild('actionsMenu')` mueve ese nodo a `document.body` apenas se crea (ver el
comentario del propio componente, que explica por qué: los `overflow` de los contenedores padres y el
`transform` del hover de la card lo recortarían mal). Cuando el usuario lo cierra en el uso normal
(`closeActions()`, que apaga el `*ngIf="openActionsAppointment as app"`), Angular sí lo remueve
correctamente del DOM — el propio comentario lo dice: *"su `removeChild` llama a `node.remove()`, que
no depende de quién sea el padre"*.

Pero si el **componente entero** se destruye mientras ese dropdown sigue abierto (por ejemplo,
navegando fuera de Seguimiento, o si el `*ngFor` de pacientes hace desaparecer esa fila) con
`fixture.destroy()` en el test se confirma que el nodo reubicado en `<body>` **no** se limpia: queda
huérfano y `conectado al DOM` (`isConnected === true`) después de destruir el fixture. `ngOnDestroy()`
solo desconecta el `ResizeObserver` y los listeners de scroll/resize/Escape (`detachDismissListeners()`)
— no hace nada con `menuElement`.

En una sesión real esto es una fuga de nodos DOM acumulativa: cada vez que se navega fuera de
Seguimiento con un dropdown de turno abierto, un `<div class="appointment-actions">` completo (con sus
dos botones) queda colgado de `<body>` para siempre.

**Arreglo de raíz, cuando se priorice:** en `ngOnDestroy()`, además de `detachDismissListeners()`,
remover `this.menuElement` del DOM si sigue conectado (`this.menuElement?.remove()`).
