# Estado — OdontoLite (turnos-app)

No hay NgRx, Akita, Elf ni ningún store de terceros. El estado vive en tres formas, que conviven en el mismo repo:

1. **Servicios singleton (`providedIn: 'root'`) con `BehaviorSubject`/`Subject` de RxJS** — el patrón dominante, sobre todo en `core/services/*`.
2. **Angular Signals (`signal()`/`computed()`)** — usado en el código más nuevo (`coberturas-view`, `odontograma-view`, `save-odontograma-dialog`, `tooth-faces`).
3. **Estado local imperativo** (campos de clase simples, sin `Subject`) — usado en `PatientDataService` (scoped a un componente) y en mapas de UI de `AppointmentsPanelComponent`.

La app corre con `provideZonelessChangeDetection()` (ver [`app.config.ts`](../src/app/app.config.ts)), así que los componentes que mutan estado fuera de un signal o de un flujo RxJS+`async` deben llamar `ChangeDetectorRef.markForCheck()` manualmente para que la vista se actualice — se ve repetido en casi todos los `subscribe()` de componentes con `ChangeDetectionStrategy.OnPush`.

**Instancias reales de este gotcha, encontradas escribiendo tests E2E (`frontend-proyecto-tests`) — el patrón es "campo plano mutado dentro de un `.subscribe()` sin `markForCheck()`", dos veces en módulos distintos:**
- `AppointmentDialogComponent.setupHoraAvailabilityValidation()` (**resuelto 2026-08-07**) — `availabilityError`/`isCheckingAvailability` se mutaban dentro de un pipeline `debounceTime`+`switchMap` sobre `checkAvailability()`; el backend respondía correctamente pero el aviso de "horario ya ocupado" nunca se pintaba. Fix: inyectar `ChangeDetectorRef` y llamar `markForCheck()` en cada rama del `switchMap` y en el `subscribe` final.
- `ProfesionalesPanelComponent.onSaveProfesional()` (**sin resolver** — ver [DEUDA_TECNICA.md](./DEUDA_TECNICA.md)) — mismo patrón en la rama `error:` de `subscribe`: un 409 de matrícula duplicada llega y `saveProfesionalError` se setea, pero el mensaje nunca aparece en el DOM y el botón "Guardar" queda trabado en "Guardando…" indefinidamente. Cubierto por un test con `test.fail()` en `frontend-proyecto-tests` (documenta el bug tal cual se comporta hoy, no lo esconde).

Vale la pena una pasada por el resto de los componentes con `subscribe()` + `OnPush` buscando el mismo patrón antes de que aparezca una tercera instancia.

## Servicios singleton con caché reactiva (`core/services/`)

| Servicio | Subject(s) | Quién escribe | Quién lee | Se resetea |
|---|---|---|---|---|
| `AuthService` | `currentUserSubject` (`BehaviorSubject<AuthResponse\|null>`, expuesto como `currentUser$`) | `setSession()` (tras login/register) | `authGuard`, `NavbarComponent`, casi todos los componentes que chequean rol/módulo, y dispara la carga de `PatientService`/`ProfesionalService`/`ConfigurationService` | `logout()` → `next(null)` |
| | `loggedOutSubject` (`Subject<void>`, expuesto como `loggedOut$`) | `logout()` | Suscrito por `AppointmentsService`, `PatientService`, `ProfesionalService`, `ConfigurationService` para vaciar su caché al cerrar sesión | — |
| `AppointmentsService` | `appointmentsCache$` (`BehaviorSubject<Appointment[]>`) | `findAll()`, `create()`, `update()`, `delete()` (mutación optimista local), y el pipeline de `loadMonthRequest$` (`switchMap` → `findByDateRange`) | `getFilteredAppointments()`/`getAppointments()`, consumidos por `TurnosViewComponent`, `AppointmentsPanelComponent`, `MonthCalendarComponent` (vía `@Input`) | `auth.loggedOut$` → `[]` |
| | `filterType$`, `filterTerm$`, `filterPendingOnly$`, `filterPendientesOnly$`, `filterCanceladosOnly$` | `setFilter()`, `setFilterPendingOnly()`, `setFilterPendientesOnly()`, `setFilterCanceladosOnly()` (llamados desde `TurnosViewComponent` en respuesta a eventos del calendario) | Combinados con la caché en `getFilteredAppointments()` (`combineLatest`) | — |
| | `loadMonthRequest$` (`Subject`) | `loadAppointmentsForMonth(year, month)` | Dispara el fetch de `findByDateRange` para ese mes | — |
| | `loadError$` (`Subject`) | Pipeline de `loadMonthRequest$` si `findByDateRange` falla (necesario porque `combineLatest` no propaga errores del productor) | `TurnosViewComponent` (muestra el error, ya que el `combineLatest` de `getFilteredAppointments()` nunca entra en `error:`) | — |
| `PatientService` | `patientsCache$` (`BehaviorSubject<Patient[]>`) | Auto-carga en `auth.currentUser$` (login), `loadPatients()`, y tras `create()`/`update()`/`delete()` | `getPatients()` — leído por `TurnosViewComponent`, `SeguimientoViewComponent`, `PatientWizardPanelComponent`, `AppointmentsPanelComponent` (mapa por id/documento para WhatsApp) | `auth.loggedOut$` → `[]` |
| `ProfesionalService` | `profesionalesCache$` (`BehaviorSubject<Profesional[]>`) | Igual patrón que `PatientService` | `getProfesionales()` — leído por `TurnosViewComponent`, `ProfesionalesPanelComponent`, `AppointmentsPanelComponent` | `auth.loggedOut$` → `[]` |
| `ConfigurationService` | `config$` (`BehaviorSubject<Configuration\|null>`) | Auto-carga en `auth.currentUser$`; si falla, cae a una plantilla de WhatsApp por defecto hardcodeada (`DEFAULT_TEMPLATE`); `saveMensajeWhatsapp()` la actualiza tras el `PUT` | `getMensajeWhatsapp()`/`buildWhatsAppLink()`, usados por `AppointmentsPanelComponent`, `TurnPaymentModalComponent`, `ConfiguracionesViewComponent` | `auth.loggedOut$` → `null` |
| `DashboardService` | `allMonthAppointments$`, `filteredAppointments$`, `previousMonthAppointments$`, `isLoading$`, `hasError$` | `loadMonth(year, month)`, `applyDateFilter(from, to)`, `refresh()` (llamados desde `PanelViewComponent`) | Observables derivados (`summary$`, `previousSummary$`, `professionalStats$`, `dailyIncomeData$`) calculados con `.pipe(map(...))` sobre `filteredAppointments$`/`previousMonthAppointments$` | No se resetea en logout (no está suscrito a `loggedOut$`); se recalcula al volver a llamar `loadMonth`. |
| `InvitationService` | sin estado propio (solo wrapper HTTP) | — | `InvitationDialogComponent` mantiene su propia lista local (`invitations: OrganizationInvitation[]`) | — |
| `OdontogramaService` / `PeriodontogramaService` | sin estado propio (wrappers HTTP) | — | Consumidos por `OdontogramaStateService` | — |
| `HistoriaClinicaService` | sin estado propio (wrapper HTTP: `GET`/`PATCH .../historia-clinica`, `PATCH .../historia-clinica/firmar`) | — | Consumido por `HistoriaClinicaStateService` | — |
| `ModuleRulesService` | `rules$` (`Observable`, no `BehaviorSubject`: se memoiza con `shareReplay(1)` sobre `GET /api/modules/rules`, una sola request para toda la sesión) | Se puebla en la primera llamada a `getRules()`/`getClinicalModules()` | `NavbarComponent`, `AppointmentDialogComponent` (selector de módulo clínico del alta de turno), `AppointmentsPanelComponent`/`TurnClinicalModalComponent` (resuelven `rutaClinica`/capacidad a partir de `moduloClinicoCodigo`) | No se resetea en logout (no está suscrito a `loggedOut$`) — describe el sistema de permisos, no datos de la organización, así que no hace falta invalidar la caché entre sesiones. |
| `ClinicalAttentionService` | sin `Subject` propio; persiste directo en `sessionStorage` | `record(appointmentId, rutaClinica)`, llamado por `HistoriaClinicaStateService`/`OdontogramaStateService` al cargar un turno | `getLast()`, leído por `NavbarComponent` (pestaña "Atención") | No se resetea explícitamente (vive en `sessionStorage`, se pierde solo al cerrar la pestaña) |
| `SubscriptionService` | `subscription$` (`BehaviorSubject<Subscription\|null>`), más dos caches de request: `enVuelo$` (GET en curso) y `planes$` (catálogo) | Auto-carga en `auth.currentUser$`; `changePlan()` / `cancelarCambioPendiente()` la actualizan con la respuesta; el interceptor HTTP la refresca ante un **402** | `SuscripcionPanelComponent`, `PlanesDialogComponent`, `SuscripcionBannerComponent` (montado en el shell, visible en toda la app) | `auth.loggedOut$` → `null`, y limpia `planes$` |

> `GET /api/subscription` **tiene efectos secundarios** en el backend (crea la suscripción si falta y
> avanza los períodos vencidos de forma perezosa). Por eso `loadSubscription()` comparte el request en
> vuelo con `shareReplay`: al iniciar sesión lo piden a la vez el servicio y la vista de Configuraciones,
> y dos llamadas en paralelo de una organización nueva chocaban contra los unique de la base.

> Nota importante: `DashboardService` **no reutiliza** la caché de `AppointmentsService` — llama a `findByDateRange` directamente, así que el Panel y Turnos pueden hacer requests redundantes del mismo rango de fechas si se navega entre ambas páginas.

> **Fix 2026-08-07** (encontrado escribiendo PAN-028 en `frontend-proyecto-tests`): `computeSummary()` y `computeDailyIncome()` acumulaban `ingresosPendientes`/`pending` para **cualquier** turno con saldo > 0, sin mirar `estado` — un turno `CANCELADO`/`NO_ASISTIO` con precio cargado y sin cobrar inflaba "Ingresos pendientes" del Panel igual que uno realmente pendiente. Se corrigió excluyendo `CANCELADO`/`NO_ASISTIO` de ese cálculo específico — `ingresosTotales` (plata ya cobrada) sigue sumando sin filtrar a propósito, porque un pago ya recibido es ingreso real aunque el turno se cancele después; `professionalStats.facturacion` tampoco se tocó, mismo motivo. Mismo hallazgo, de forma independiente, en el backend (`AppointmentRepository.aggregateSeguimientoResumenByOrganization`, ver `bakend-proyecto-turnos/docs/CAMBIOS_NECESARIOS.md § 17`), corregido el mismo día.

## Módulo Odontograma (`features/odontograma/services/`)

Patrón **facade + dos sub-servicios**, todos `providedIn: 'root'`:

- **`OdontogramaStateService`** (facade): no tiene Subjects propios de piezas dentales. Mantiene solo `appointmentId` (campo plano) y `appointmentPaymentSubject` (`BehaviorSubject`, snapshot de precios/pago del turno activo). Expone getters pass-through hacia los dos sub-servicios (`selectedTooth$`, `faces$`, `toothIcons$`, `comentario$`, `planTratamiento$`, `perioTeeth$`, etc.) para que los componentes de UI solo dependan de esta única fachada.
- **`OdontoStateService`**: `selectedToothSubject`, `facesSubject` (`Map<numeroDiente, Record<FaceKey, EstadoCara>>`), `toothIconsSubject` (`Record<numeroDiente, LeyendaItem[]>`), `comentarioSubject`, `planTratamientoSubject`, `comentarioAnteriorSubject`, `historiaClinicaSubject` (`Anamnesis`, solo lectura: lo alimenta la fachada con `Patient.anamnesis` parseado y no participa del delta). Guarda además un **baseline no reactivo** (`baselineOdonto`, `baselineComentario`, `baselinePlanTratamiento`, campos de clase planos) contra el cual calcula el delta a guardar (`buildOdontogramDelta()`).
- **`PerioStateService`**: `perioTeethSubject` (`Map<numeroDiente, PerioToothMvp>`) + `baselinePerio` (campo plano). `notifyPerioChange()` fuerza un `next()` con un nuevo `Map` (mutación in-place de los `PerioToothMvp` vía `updatePerioTooth()`, seguida de re-emisión manual — necesario porque el objeto interno se muta directamente antes de notificar).

**Quién escribe**: `OdontogramaFormComponent`/`ToothFacesComponent` (caras/leyenda), `OdontogramaLeyendComponent` (estados/condiciones/movilidad/furca), `PeriodontogramaFormComponent` (valores de sondaje/margen por sitio), `OdontogramaCommentComponent` (comentario/plan de tratamiento).
**Quién lee**: todos los componentes de la vista de odontograma, más `SaveOdontogramaDialogComponent` (resumen antes de guardar).
**Se resetea**: no está suscrito a `auth.loggedOut$`; el "reset" ocurre al llamar `loadForAppointment(appointmentId)` para un nuevo turno (recalcula baseline y re-emite todo).

Persistencia extra: delegada a `ClinicalAttentionService` (ver más abajo) — ya no mantiene su propia clave de `sessionStorage`.

## Módulo Historia Clínica (`features/historia-clinica/services/`)

- **`HistoriaClinicaStateService`** (`providedIn: 'root'`): facade análoga a `OdontogramaStateService` pero sin sub-servicios — la ficha es un único `HistoriaClinicaResponse` plano, no hay granularidad por diente. Estado: `formSubject` (`BehaviorSubject<HistoriaClinicaResponse | null>`, expuesto como `form$`) y `editableSubject` (`BehaviorSubject<boolean>`, expuesto como `editable$`; `false` si el registro está `FIRMADO` o el turno quedó cerrado por la regla de historia clínica). `loadForAppointment(appointmentId)` hace un `forkJoin` (`HistoriaClinicaService.getByAppointment` + `AppointmentsService.findById`, ambos toleran 404), registra el turno en `ClinicalAttentionService.record(appointmentId, 'historia-clinica')` y dispara `PATCH .../status?status=EN_CURSO` si corresponde (mismo efecto secundario que Odontograma). No usa el patrón de "delta contra baseline" de Odontograma: `saveDraft()`/`sign()` envían directo el `FormGroup.value` completo como delta parcial (todos los campos son opcionales salvo los marcados `Validators.required` en el form).
- **Quién escribe**: `HistoriaClinicaFormComponent` (único formulario).
- **Quién lee**: `HistoriaClinicaViewComponent` (loading/error/editable) y el propio `HistoriaClinicaFormComponent`.
- **Se resetea**: no está suscrito a `auth.loggedOut$`; se recalcula al llamar `loadForAppointment(appointmentId)` para un nuevo turno.

## `ClinicalAttentionService` (`core/services/clinical-attention.service.ts`)

Reemplaza el mecanismo que antes vivía solo dentro de `OdontogramaStateService`. Un único servicio singleton, sin `Subject` ni caché en memoria: lee/escribe directo `sessionStorage` en cada llamada.

- `record(appointmentId, rutaClinica)`: guarda `{ appointmentId, rutaClinica }` (JSON) — llamado por `OdontogramaStateService.loadForAppointment()` (con `rutaClinica: 'odontograma'`) y por `HistoriaClinicaStateService.loadForAppointment()` (con `rutaClinica: 'historia-clinica'`).
- `getLast(): LastAttention | null`: leído por `NavbarComponent.onNavClick()` para resolver a qué ruta/turno navegar la pestaña "Atención".
- Justificación: una sesión solo puede estar atendiendo un turno a la vez, sin importar el módulo — no tiene sentido que cada módulo clínico lleve su propio "último turno" independiente (antes había una clave de `sessionStorage` por módulo, ver tabla de persistencia más abajo).

## Estado scoped a un componente (no singleton global)

### `PatientDataService` (Seguimiento)

Archivo: [`features/seguimiento/seguimiento-view/patient-data.service.ts`](../src/app/features/seguimiento/seguimiento-view/patient-data.service.ts). Está `@Injectable()` **sin** `providedIn: 'root'`, y se declara en `providers: [PatientDataService]` del propio `SeguimientoViewComponent` — cada vez que se entra a `/seguimiento` se crea una instancia nueva (caché vacía), y se destruye al salir.

**Reescrito por completo el 2026-08-08** para pasar de "cachear todos los pacientes y todos los turnos
de todos los años en memoria" a **dueño del estado de una sola página** del backend:

- Estado: campos de clase **planos, no reactivos** — `desde`/`hasta` (rango de fechas, `string`
  `YYYY-MM-DD`), `page`/`size` (`size` es `readonly = 20`), `searchTerm`, y el resultado de la última
  página pedida: `patientGroups: SeguimientoPatientGroup[]`, `totalPages`, `totalElements`, `cargando`.
  Ya no hay ningún campo por-paciente (`selectedYearByIdentificacion`, `appointmentsByYear`, etc.) — el
  filtro es global a la página, no por tarjeta.
- Un único método público, `loadPage(): Observable<void>` — pide `AppointmentsService.getSeguimiento(desde, hasta, page, size, searchTerm.trim() || undefined)`,
  reemplaza `patientGroups`/`totalPages`/`totalElements` con la respuesta, y reconstruye
  `patientsMap` (`Map<identificacion, Patient>`) desde cero en cada carga — **no** acumula entre
  páginas (buscar o pasar de página dos borra el mapeo de la página anterior, ver
  [DEUDA_TECNICA.md § 8](./DEUDA_TECNICA.md) sobre qué implica esto para E2E). El componente llama
  `loadPage().subscribe({ next: () => cdr.markForCheck() })` — sigue siendo el componente quien pide el
  refresco de la vista a mano, el servicio no expone ningún `Observable` de estado derivado.
- La advertencia de `NG0103` (bucle infinito por getters que devuelven arrays/objetos nuevos en cada
  evaluación de template) que motivaba los caches `availableMonthsByIdentificacion`/
  `filteredAppointmentsByIdentificacion` **ya no aplica**: esos caches y los getters que los alimentaban
  se eliminaron junto con el filtro por año/mes — `patientGroups`/`group.appointments` se leen directo
  del template porque ya vienen filtrados y estables desde la última respuesta del backend, no
  recalculados en cada ciclo.

### Mapas de edición inline en `AppointmentsPanelComponent`

No es "estado global", pero es un patrón repetido a documentar: para permitir editar en simultáneo varios campos de varias tarjetas de turno sin tocar el modelo `Appointment`, el componente mantiene ~15 `Map<string, T>` en memoria (`editingPrices`, `priceInputs`, `originalPrices`, `editingObservaciones`, `editingHora`, `horaInputs`, `editingProfesional`, `profesionalInputs`, etc.), todas keyed por `appointment.id` (o `"${id}-${priceType}"` para precios). Se limpian entrada por entrada al guardar/cancelar cada edición.

## Angular Signals (código más nuevo)

| Dónde | Signals |
|---|---|
| `CoberturasViewComponent` | `paisesConDatos`, `paisesActivos` (`Set<string>`), `cargando`, `coberturas`, `intermediarios`, `busqueda`, `cardAbierta`, `notaEnEdicion`/`webEnEdicion`/`telefonoEnEdicion` (`Record<id,string>`), `guardandoIds` (`Set<string>`), `modalAbierto`, `intermediarioEditandoId`, `modalPaisSeleccionado`, `busquedaModal`; más `computed()`: `visibles`, `favoritas`, `resto`, `intermediariosVisibles`, `coberturasDelPaisModal`, `chipsActivos`, `paisesParaAgregar`, `paisesModal`. |
| `OdontogramaViewComponent` | `loading`, `loadError` (controlan el spinner/estado de error de la carga inicial). |
| `SaveOdontogramaDialogComponent` | `formData` (objeto con los montos del turno), `saveError`; además usa `toSignal()` para envolver los `Observable`s de `OdontogramaStateService` (`comentarioTurno`, `planTratamiento`, `comentarioAnterior`, `historiaClinica`) y mostrarlos como resumen; `historiaClinica` es un `Anamnesis`, no un string, y se muestra como lista punteada. |
| `ToothFacesComponent` | `faces` (estado de las 5 caras de un diente, sincronizado manualmente desde `stateService.faces$`). |

No hay una regla explícita en el código sobre cuándo usar Signals vs. `BehaviorSubject` — parece simplemente que los módulos escritos/tocados más recientemente adoptan Signals, mientras Turnos/Seguimiento/Panel siguen con RxJS.

## Persistencia en el navegador

| Storage | Clave | Contenido | Quién la usa |
|---|---|---|---|
| `localStorage` | `auth_token` | JWT crudo | `AuthService.getToken()`, leído por `authInterceptor` en cada request |
| `localStorage` | `auth_user` | `AuthResponse` completo (JSON) — incluye `role`, `modules` (legado), `capabilities`, `organizationId`, `organizationNombre`, `organizationPais` | `AuthService.getStoredUser()` (hidrata `currentUserSubject` al recargar la página) |
| `localStorage` | `coberturas.paisesActivos.<organizationId>` | Array de códigos de país (JSON) que el usuario activó como "chips" en la vista de Coberturas | `CoberturasViewComponent` (persiste por organización; con `try/catch` para tolerar modo privado/cuota excedida) |
| `sessionStorage` | `ultima_atencion` | Último turno clínico atendido en esta pestaña, **`{ appointmentId, rutaClinica }`** (JSON) — reemplaza la clave anterior `odontograma_last_appointment_id` (single-módulo) ahora que hay N módulos clínicos; `rutaClinica` es lo que le dice a `NavbarComponent` a qué ruta navegar (`odontograma` o `historia-clinica`) | `ClinicalAttentionService` (escrito por `OdontogramaStateService`/`HistoriaClinicaStateService` al cargar un turno, leído por `NavbarComponent`) |

No hay uso de `IndexedDB`, cookies propias, ni ningún estado persistido entre pestañas más allá de lo anterior (`localStorage` sí es compartido entre pestañas del mismo origen, pero no hay listeners de `storage` event para sincronizar sesión entre pestañas).

## Pendiente de completar por el desarrollador

- No hay un criterio documentado (comentario, ADR, etc.) sobre cuándo un nuevo servicio de estado debe usar `BehaviorSubject` vs. `signal()`. Queda a criterio de quien lo mantenga.
- No se determinó si `DashboardService` debería reusar la caché de `AppointmentsService` (posible optimización, no implementada).
