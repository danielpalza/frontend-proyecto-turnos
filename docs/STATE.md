# Estado — OdontoLite (turnos-app)

No hay NgRx, Akita, Elf ni ningún store de terceros. El estado vive en tres formas, que conviven en el mismo repo:

1. **Servicios singleton (`providedIn: 'root'`) con `BehaviorSubject`/`Subject` de RxJS** — el patrón dominante, sobre todo en `core/services/*`.
2. **Angular Signals (`signal()`/`computed()`)** — usado en el código más nuevo (`coberturas-view`, `odontograma-view`, `save-odontograma-dialog`, `tooth-faces`).
3. **Estado local imperativo** (campos de clase simples, sin `Subject`) — usado en `PatientDataService` (scoped a un componente) y en mapas de UI de `AppointmentsPanelComponent`.

La app corre con `provideZonelessChangeDetection()` (ver [`app.config.ts`](../src/app/app.config.ts)), así que los componentes que mutan estado fuera de un signal o de un flujo RxJS+`async` deben llamar `ChangeDetectorRef.markForCheck()` manualmente para que la vista se actualice — se ve repetido en casi todos los `subscribe()` de componentes con `ChangeDetectionStrategy.OnPush`.

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

> Nota importante: `DashboardService` **no reutiliza** la caché de `AppointmentsService` — llama a `findByDateRange` directamente, así que el Panel y Turnos pueden hacer requests redundantes del mismo rango de fechas si se navega entre ambas páginas.

## Módulo Odontograma (`features/odontograma/services/`)

Patrón **facade + dos sub-servicios**, todos `providedIn: 'root'`:

- **`OdontogramaStateService`** (facade): no tiene Subjects propios de piezas dentales. Mantiene solo `appointmentId` (campo plano) y `appointmentPaymentSubject` (`BehaviorSubject`, snapshot de precios/pago del turno activo). Expone getters pass-through hacia los dos sub-servicios (`selectedTooth$`, `faces$`, `toothIcons$`, `comentario$`, `planTratamiento$`, `perioTeeth$`, etc.) para que los componentes de UI solo dependan de esta única fachada.
- **`OdontoStateService`**: `selectedToothSubject`, `facesSubject` (`Map<numeroDiente, Record<FaceKey, EstadoCara>>`), `toothIconsSubject` (`Record<numeroDiente, LeyendaItem[]>`), `comentarioSubject`, `planTratamientoSubject`, `comentarioAnteriorSubject`, `historiaClinicaSubject`. Guarda además un **baseline no reactivo** (`baselineOdonto`, `baselineComentario`, `baselinePlanTratamiento`, campos de clase planos) contra el cual calcula el delta a guardar (`buildOdontogramDelta()`).
- **`PerioStateService`**: `perioTeethSubject` (`Map<numeroDiente, PerioToothMvp>`) + `baselinePerio` (campo plano). `notifyPerioChange()` fuerza un `next()` con un nuevo `Map` (mutación in-place de los `PerioToothMvp` vía `updatePerioTooth()`, seguida de re-emisión manual — necesario porque el objeto interno se muta directamente antes de notificar).

**Quién escribe**: `OdontogramaFormComponent`/`ToothFacesComponent` (caras/leyenda), `OdontogramaLeyendComponent` (estados/condiciones/movilidad/furca), `PeriodontogramaFormComponent` (valores de sondaje/margen por sitio), `OdontogramaCommentComponent` (comentario/plan de tratamiento).
**Quién lee**: todos los componentes de la vista de odontograma, más `SaveOdontogramaDialogComponent` (resumen antes de guardar).
**Se resetea**: no está suscrito a `auth.loggedOut$`; el "reset" ocurre al llamar `loadForAppointment(appointmentId)` para un nuevo turno (recalcula baseline y re-emite todo).

Persistencia extra: `LAST_APPOINTMENT_KEY = 'odontograma_last_appointment_id'` en **`sessionStorage`** — guarda el último `appointmentId` cargado para que `NavbarComponent` pueda ofrecer "volver al odontograma" sin pasar por la URL.

## Estado scoped a un componente (no singleton global)

### `PatientDataService` (Seguimiento)

Archivo: [`features/seguimiento/seguimiento-view/patient-data.service.ts`](../src/app/features/seguimiento/seguimiento-view/patient-data.service.ts). Está `@Injectable()` **sin** `providedIn: 'root'`, y se declara en `providers: [PatientDataService]` del propio `SeguimientoViewComponent` — cada vez que se entra a `/seguimiento` se crea una instancia nueva (caché vacía), y se destruye al salir.

- Estado: campos de clase **planos, no reactivos** (`patients: Patient[]`, `patientGroups: PatientGroup[]`, `appointmentsByYear: Map<string, Appointment[]>`, `resumenByIdentificacion: Map`, `selectedYearByIdentificacion`/`selectedMonthByIdentificacion: Record<string,string>`).
- El componente (`SeguimientoViewComponent`) llama métodos imperativos (`setPatients()`, `setResumen()`, `updatePatientGroups()`) y luego `cdr.markForCheck()` a mano — no hay ningún `Observable` de estado derivado.
- **Advertencia de diseño documentada en el propio código** (comentario en `refreshFiltersForGroup`): bajo change detection zoneless, si un getter devuelve un array/objeto **nuevo** en cada evaluación de template (aunque el contenido sea idéntico), Angular vuelve a marcar la vista sucia en cada ciclo → dispara `NG0103` (bucle infinito). Por eso `getAvailableMonths()`/`getFilteredAppointments()` leen de un cache (`availableMonthsByIdentificacion`/`filteredAppointmentsByIdentificacion`) recalculado explícitamente, nunca desde el template directo.

### Mapas de edición inline en `AppointmentsPanelComponent`

No es "estado global", pero es un patrón repetido a documentar: para permitir editar en simultáneo varios campos de varias tarjetas de turno sin tocar el modelo `Appointment`, el componente mantiene ~15 `Map<string, T>` en memoria (`editingPrices`, `priceInputs`, `originalPrices`, `editingObservaciones`, `editingHora`, `horaInputs`, `editingProfesional`, `profesionalInputs`, etc.), todas keyed por `appointment.id` (o `"${id}-${priceType}"` para precios). Se limpian entrada por entrada al guardar/cancelar cada edición.

## Angular Signals (código más nuevo)

| Dónde | Signals |
|---|---|
| `CoberturasViewComponent` | `paisesConDatos`, `paisesActivos` (`Set<string>`), `cargando`, `coberturas`, `intermediarios`, `busqueda`, `cardAbierta`, `notaEnEdicion`/`webEnEdicion`/`telefonoEnEdicion` (`Record<id,string>`), `guardandoIds` (`Set<string>`), `modalAbierto`, `intermediarioEditandoId`, `modalPaisSeleccionado`, `busquedaModal`; más `computed()`: `visibles`, `favoritas`, `resto`, `intermediariosVisibles`, `coberturasDelPaisModal`, `chipsActivos`, `paisesParaAgregar`, `paisesModal`. |
| `OdontogramaViewComponent` | `loading`, `loadError` (controlan el spinner/estado de error de la carga inicial). |
| `SaveOdontogramaDialogComponent` | `formData` (objeto con los montos del turno), `saveError`; además usa `toSignal()` para envolver los `Observable`s de `OdontogramaStateService` (`comentarioTurno`, `planTratamiento`, `comentarioAnterior`, `historiaClinica`) y mostrarlos como resumen. |
| `ToothFacesComponent` | `faces` (estado de las 5 caras de un diente, sincronizado manualmente desde `stateService.faces$`). |

No hay una regla explícita en el código sobre cuándo usar Signals vs. `BehaviorSubject` — parece simplemente que los módulos escritos/tocados más recientemente adoptan Signals, mientras Turnos/Seguimiento/Panel siguen con RxJS.

## Persistencia en el navegador

| Storage | Clave | Contenido | Quién la usa |
|---|---|---|---|
| `localStorage` | `auth_token` | JWT crudo | `AuthService.getToken()`, leído por `authInterceptor` en cada request |
| `localStorage` | `auth_user` | `AuthResponse` completo (JSON) — incluye `role`, `modules`, `organizationId`, `organizationNombre`, `organizationPais` | `AuthService.getStoredUser()` (hidrata `currentUserSubject` al recargar la página) |
| `localStorage` | `coberturas.paisesActivos.<organizationId>` | Array de códigos de país (JSON) que el usuario activó como "chips" en la vista de Coberturas | `CoberturasViewComponent` (persiste por organización; con `try/catch` para tolerar modo privado/cuota excedida) |
| `sessionStorage` | `odontograma_last_appointment_id` | Último `appointmentId` de odontograma visitado en esta pestaña | `OdontogramaStateService` / `NavbarComponent` |

No hay uso de `IndexedDB`, cookies propias, ni ningún estado persistido entre pestañas más allá de lo anterior (`localStorage` sí es compartido entre pestañas del mismo origen, pero no hay listeners de `storage` event para sincronizar sesión entre pestañas).

## Pendiente de completar por el desarrollador

- No hay un criterio documentado (comentario, ADR, etc.) sobre cuándo un nuevo servicio de estado debe usar `BehaviorSubject` vs. `signal()`. Queda a criterio de quien lo mantenga.
- No se determinó si `DashboardService` debería reusar la caché de `AppointmentsService` (posible optimización, no implementada).
