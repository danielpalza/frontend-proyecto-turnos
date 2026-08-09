# Páginas — OdontoLite (turnos-app)

Una entrada por cada componente enrutado en [`app.routes.ts`](../src/app/app.routes.ts). Ver [ROUTES.md](./ROUTES.md) para el árbol completo y el detalle del guard. Ver [COMPONENTS.md](./COMPONENTS.md) para el detalle de props/eventos de cada componente hijo mencionado acá.

---

## Login / Registro

- **Ruta**: `/login`
- **Componente**: `LoginComponent` — [`src/app/features/auth/login/login.component.ts`](../src/app/features/auth/login/login.component.ts)
- **Permisos**: pública (sin guard). Si el usuario ya está autenticado (`AuthService.isAuthenticated()`), el propio constructor redirige a `/turnos`.
- **Propósito**: login de usuarios existentes y alta de nuevas cuentas, con dos flujos de registro:
  - **Crear organización nueva** (el usuario queda como `OWNER`): pide nombre de organización + país (`PAISES_LATAM`).
  - **Unirse a una organización existente**: pide un código/token de invitación (`invitationToken`), generado desde el panel de "Invitar usuario" (ver Seguimiento más abajo).
- **Componentes que renderiza**: ninguno propio de features — es un formulario autocontenido (template-driven, `[(ngModel)]`) con un wizard de 2 pasos (`registerStep: 'org' | 'account'`).
- **Datos que carga / endpoints**:
  - `POST /api/auth/login` (`AuthService.login`)
  - `POST /api/auth/register` (`AuthService.register`), con body condicional: `organizacionNombre` + `pais` (modo "crear") **o** `invitationToken` (modo "unirse").
  - Ambas llamadas pasan `skipGlobalErrorHandler()` — el propio componente muestra el error (no el interceptor global).
- Al loguearse/registrarse con éxito navega a `/turnos`.

---

## Panel (Dashboard)

- **Ruta**: `/panel`
- **Componente**: `PanelViewComponent` — [`src/app/features/panel/panel-view/panel-view.component.ts`](../src/app/features/panel/panel-view/panel-view.component.ts)
- **Permisos**: `authGuard`, requiere capacidad `PANEL:VIEW`.
- **Propósito**: dashboard operativo/financiero del mes: ingresos realizados vs. pendientes, turnos por estado, comparación contra el mes anterior, ranking de profesionales.
- **Componentes que renderiza**:
  - `MiniCalendarPickerComponent` ×2 (selector "Desde"/"Hasta" para filtrar por rango de fechas dentro del mes)
  - `BaseChartDirective` (ng2-charts): gráfico de línea (ingresos por día) y gráfico donut (turnos por estado), con plugin custom `centerText` para mostrar el total en el centro del donut.
  - Tabla de rendimiento por profesional (ordenable por columna, sin componente propio, es HTML directo).
- **Datos que carga / endpoints**: todo vía `DashboardService` (que a su vez llama a `AppointmentsService`):
  - `GET /api/appointments/range?startDate&endDate` para el mes actual y para el mes anterior (comparación).
  - El resumen (`DashboardSummary`), las estadísticas por profesional y los puntos diarios se **calculan en el cliente** a partir de esos turnos (no hay endpoint de agregación en el backend consumido acá).
- Navegación: el botón "Ver detalle de turnos" del donut navega a `/turnos`.

---

## Turnos (Calendario de citas)

- **Ruta**: `/turnos`
- **Componente**: `TurnosViewComponent` — [`src/app/features/appointments/pages/turnos-view/turnos-view.component.ts`](../src/app/features/appointments/pages/turnos-view/turnos-view.component.ts)
- **Permisos**: `authGuard`, requiere capacidad `TURNOS:VIEW`.
- **Propósito**: vista principal operativa: calendario mensual + panel de turnos del día seleccionado, alta/baja/edición de turnos y de pacientes nuevos en el mismo flujo.
- **Componentes que renderiza**:
  - `MonthCalendarComponent` — calendario del mes con conteo de turnos/pendientes/cancelados por día y buscador (`app-search-input`) de paciente/profesional.
  - `AppointmentsPanelComponent` — lista de turnos del día seleccionado, con edición inline de hora/profesional/precios/observaciones y pagos.
  - `AppointmentDialogComponent` — modal de alta de turno (embebe `PatientWizardComponent`).
  - `ConfirmDialogComponent` — confirmación antes de cancelar un turno.
- **Datos que carga / endpoints**:
  - `AppointmentsService.loadAppointmentsForMonth(year, month)` → `GET /api/appointments/range` (se dispara al montar y al cambiar de mes).
  - `PatientService.getPatients()` / `ProfesionalService.getProfesionales()` — leen la caché compartida (ver [STATE.md](./STATE.md)); si está vacía se pobla automáticamente al loguearse.
  - Alta de turno: si el paciente es nuevo, primero `POST /api/patients`, luego `POST /api/appointments` con el `patientId` recién creado; si es existente, solo `POST /api/appointments`.
  - Verificación de horario libre: `GET /api/appointments/check-availability?profesionalId&fecha&hora` (se dispara con debounce al tipear la hora, y de nuevo al enviar el formulario).
  - Cancelar turno: `DELETE /api/appointments/{id}` (el backend hace cancelación lógica: pasa a estado `CANCELADO`, no borra el registro).
  - Ediciones inline en el panel: `PATCH /api/appointments/{id}` (precios/observaciones/hora/profesional), `PATCH /api/appointments/{id}/addPayment`.
- **Permisos adicionales**: la asignación de profesional a un turno filtra por `filterProfesionalesForNewAppointment`/`filterProfesionalesForReassign` (`core/utils/profesional-assignability.util.ts`) — solo profesionales activos son asignables.

---

## Odontograma / Periodontograma

- **Ruta**: `/odontograma/:appointmentId` (y `/odontograma` sin id, que redirige a `/turnos`)
- **Componente**: `OdontogramaViewComponent` — [`src/app/features/odontograma/components/odontograma-view/odontograma-view.component.ts`](../src/app/features/odontograma/components/odontograma-view/odontograma-view.component.ts)
- **Permisos**: `authGuard`, requiere capacidad `ODONTOGRAMA:VIEW`. Se accede normalmente desde el panel de turnos (no hay link directo en el navbar sin un turno activo, ver [ROUTES.md](./ROUTES.md)).
- **Propósito**: ficha clínica dental de un turno concreto — odontograma (piezas dentales, caras, estados/condiciones) y periodontograma (sondaje, márgenes, sangrado/placa/supuración/cálculo), con guardado incremental (delta) y registro de pago del turno.
- **Uno de N módulos clínicos**: Odontograma ya no es el único módulo con ficha clínica — es uno de N módulos clínicos seleccionables por turno (ver "Historia Clínica" más abajo, y la nota de diseño multi-módulo en [ARCHITECTURE.md](./ARCHITECTURE.md)). Qué módulos existen se resuelve en runtime contra `GET /api/modules/rules` (`ModuleRulesService`), no está hardcodeado. Desde `TurnosViewComponent`/`AppointmentDialogComponent`, dar de alta un turno ahora **exige** elegir explícitamente a qué módulo clínico corresponde (`moduloClinicoId`, sin valor por defecto — ver [FORMS.md](./FORMS.md)); ese valor es lo que decide después si "Iniciar atención" navega a `/odontograma/:id` o a `/historia-clinica/:id`.
- **Componentes que renderiza**:
  - `OdontogramaFormComponent` (grilla de piezas permanentes/temporales, cada una `ToothFacesComponent`)
  - `PeriodontogramaFormComponent` (tabla por arcada superior/inferior, cada celda con `PerioToothSparklineComponent`)
  - `OdontogramaLeyendComponent` (panel lateral: estados/condiciones/movilidad/furca del diente seleccionado)
  - `OdontogramaActionsComponent` (imprimir + abrir `SaveOdontogramaDialogComponent`)
  - `OdontogramaCommentComponent` ×4 (comentarios del turno, plan de tratamiento, comentarios del turno anterior, historia clínica)
- **Datos que carga / endpoints** (todo orquestado por `OdontogramaStateService.loadForAppointment`, un `forkJoin`):
  - `GET /api/appointments/{id}/odontogram` (404 tolerado → estado vacío)
  - `GET /api/appointments/{id}/periodontogram` (404 tolerado → estado vacío)
  - `GET /api/appointments/{id}` (datos de pago del turno para prellenar el diálogo de guardado)
  - Efecto secundario: si el turno está `PENDIENTE` o `CONFIRMADO`, se dispara `PATCH /api/appointments/{id}/status?status=EN_CURSO` al entrar a la vista.
  - Guardado: `PATCH /api/appointments/{id}/turno-completo` (un solo request combinado con el delta de odontograma + periodontograma + datos de pago), disparado desde `SaveOdontogramaDialogComponent`. Tras guardar, navega de vuelta a `/turnos`.

---

## Historia Clínica

- **Ruta**: `/historia-clinica/:appointmentId` (y `/historia-clinica` sin id, que redirige a `/turnos`)
- **Componente**: `HistoriaClinicaViewComponent` — [`src/app/features/historia-clinica/components/historia-clinica-view/historia-clinica-view.component.ts`](../src/app/features/historia-clinica/components/historia-clinica-view/historia-clinica-view.component.ts)
- **Permisos**: `authGuard`, requiere capacidad `HISTORIA_CLINICA_FREE:VIEW`. Igual que Odontograma, no hay link fijo en el navbar: se accede desde un turno concreto cuyo `moduloClinicoCodigo` sea `HISTORIA_CLINICA_FREE` (panel de turnos, modal clínico de Seguimiento, o "Atención" del navbar si es el último turno atendido en la sesión).
- **Propósito**: segundo módulo clínico de la app (módulo `HISTORIA_CLINICA_FREE`, "Historia Clínica Básica") — un formulario genérico de 6 secciones fijas (datos del paciente, motivo de consulta, condición actual, antecedentes médicos, examen físico, diagnóstico + CIE10 + indicaciones) con flujo **borrador → firma**: mientras está en `BORRADOR` se puede guardar y reeditar libremente; al "Firmar y guardar" el registro pasa a `FIRMADO` y queda **inmutable para siempre** (el backend lo hace cumplir en cada escritura, no solo el frontend). Un borrador se puede seguir editando en cualquier momento; si el paciente ya tiene otra historia clínica en un turno posterior, el candado de cierre legal solo corta al intentar **firmar** (409 del backend), no bloquea guardar como borrador.
- **Componentes que renderiza**:
  - `HistoriaClinicaFormComponent` (única, sin alternancia de sub-formularios como en Odontograma)
- **Datos que carga / endpoints** (orquestado por `HistoriaClinicaStateService.loadForAppointment`, un `forkJoin`):
  - `GET /api/appointments/{id}/historia-clinica` (404 tolerado → registro vacío en `BORRADOR`)
  - `GET /api/appointments/{id}` (para decidir si corresponde marcar el turno `EN_CURSO`)
  - Efecto secundario: si el turno está `PENDIENTE` o `CONFIRMADO` y el registro es editable, se dispara `PATCH /api/appointments/{id}/status?status=EN_CURSO` al entrar a la vista (mismo efecto que en Odontograma).
  - Guardar borrador: `PATCH /api/appointments/{id}/historia-clinica`.
  - Firmar: `PATCH /api/appointments/{id}/historia-clinica/firmar` — no idempotente, protegido en el componente contra doble click (`signing()` guard) además del `[disabled]` del botón.
- **Permisos adicionales**: dentro del formulario, las secciones "Datos del paciente" y "Antecedentes" (que sincronizan `Patient`/`Patient.anamnesis`) exigen además `TURNOS:MANAGE` o `SEGUIMIENTO:PACIENTES` — ver [COMPONENTS.md](./COMPONENTS.md#historia-clínica-featureshistoria-clinica) y [FORMS.md](./FORMS.md#historia-clínica).

---

## Seguimiento de Pacientes

- **Ruta**: `/seguimiento`
- **Componente**: `SeguimientoViewComponent` — [`src/app/features/seguimiento/seguimiento-view/seguimiento-view.component.ts`](../src/app/features/seguimiento/seguimiento-view/seguimiento-view.component.ts)
- **Permisos**: `authGuard`, requiere capacidad `SEGUIMIENTO:VIEW`.
- **Propósito**: doble función en una sola página:
  1. **Historial por paciente** (columna izquierda): lista **paginada** de pacientes con turnos en un
     rango de fechas (por defecto hoy → hoy + 30 días), búsqueda con debounce, deuda total, turnos del
     paciente en ese rango, documentos adjuntos, alta/edición de paciente. **Reescrito 2026-08-08**:
     antes cargaba todos los pacientes de la organización sin filtro de fecha por defecto y ofrecía un
     select de año/mes de turnos por cada paciente — ver [DEUDA_TECNICA.md § 8](./DEUDA_TECNICA.md)
     para el detalle del cambio y su impacto en `frontend-proyecto-tests`.
  2. **Gestión de profesionales y usuarios de la organización** (columna derecha, `app-profesionales-panel`) — alta/edición/baja de profesionales, activar/desactivar, invitar nuevos usuarios, y (desde una sesión anterior) documentos adjuntos por profesional.
- **Componentes que renderiza**:
  - `AppointmentListOverflowComponent` (lista de turnos de un paciente, con expandir/colapsar si desborda; botón de documentos del turno)
  - `MiniCalendarPickerComponent` ×2, cross-constrained (`[maxDate]`/`[minDate]`) para el rango desde/hasta — mismo patrón que `panel-view.component.html`
  - `PatientWizardPanelComponent` → embebe `PatientWizardComponent`/`PatientFormComponent` (alta/edición de paciente); emite `saved` para que la página refresque la página actual sin recargar todo
  - `ProfesionalesPanelComponent` → embebe `ProfesionalDialogComponent` e `InvitationDialogComponent`
  - `TurnPaymentModalComponent` (modal de pago/observaciones al hacer click en un turno de la lista)
  - `TurnClinicalModalComponent` (modal de resumen clínico de solo lectura del turno — odontograma/periodontograma —, abierto sobre el mismo turno seleccionado; el botón "Abrir ficha clínica completa" navega al módulo clínico correspondiente, ver [COMPONENTS.md](./COMPONENTS.md#turnclinicalmodalcomponent-app-turn-clinical-modal))
  - `DocumentosModalComponent` (compartido) — documentos de un turno o de un paciente, ver [COMPONENTS.md](./COMPONENTS.md)
- **Datos que carga / endpoints** (orquestado por `PatientDataService`, servicio scoped al componente, no singleton — reescrito 2026-08-08, ver [STATE.md](./STATE.md#patientdataservice-seguimiento)):
  - `GET /api/appointments/seguimiento?desde=&hasta=&page=&size=&search=` (**nuevo**) — única fuente de la lista paginada: pacientes con turnos en el rango, sus turnos ya filtrados, y su deuda/total histórico.
  - `PatientService.getPatients()` (caché compartida) — ya **no** alimenta la lista de la página; se usa solo para el chequeo de duplicados de documento en el wizard de alta.
  - Documentos: `GET/POST /api/appointments/{id}/documentos`, `GET/POST /api/patients/{id}/documentos`, `GET /api/documentos/{id}/descarga`, `DELETE /api/documentos/{id}`.
  - Panel de profesionales: `ProfesionalService.getProfesionales()` (caché), `POST/PATCH/DELETE /api/profesionales/{id}`, `PATCH /api/profesionales/{id}/toggle-active`, `GET/POST /api/profesionales/{id}/documentos`.
  - Invitaciones: `GET/POST /api/invitations`, `DELETE /api/invitations/{id}`
  - Modal de pago: mismos endpoints de turno que en Turnos (`PATCH /api/appointments/{id}`, `/addPayment`)
- **Permisos adicionales**: el botón "Invitar usuario" y la sección de creación de acceso de usuario en `ProfesionalDialogComponent` solo se muestran si `AuthService.hasRole('OWNER')`.

> `GET /api/appointments/seguimiento-resumen` (sin paginar, deuda/turnos históricos de toda la
> organización) sigue existiendo en el backend (`bakend-proyecto-turnos/docs/API_ENDPOINTS.md`) pero
> esta página **ya no lo consume** — no se determinó desde este repo si algún otro caller lo sigue usando.

> Nota: aunque conceptualmente "gestionar profesionales" suena a Configuraciones, en el código real ese panel vive dentro de la página **Seguimiento**, no en Configuraciones. Ver también la nota de memoria del proyecto sobre autorización diferida (`ProfesionalController` sin chequeo de rol propio en el backend).

---

## Configuraciones

- **Ruta**: `/configuraciones`
- **Componente**: `ConfiguracionesViewComponent` — [`src/app/features/configuraciones/configuraciones-view/configuraciones-view.component.ts`](../src/app/features/configuraciones/configuraciones-view/configuraciones-view.component.ts)
- **Permisos**: `authGuard`, requiere capacidad `CONFIGURACIONES:VIEW`.
- **Propósito**: **hoy solo contiene** el editor de la plantilla de mensaje de WhatsApp que se usa para recordatorios de turno (con vista previa en vivo, contador de caracteres y botones para insertar variables `{paciente}`, `{fecha}`, `{hora}`, `{profesional}`).
- **Componentes que renderiza**: ninguno de features — es un panel único autocontenido.
- **Datos que carga / endpoints**:
  - `ConfigurationService.getConfig()` (caché reactiva, poblada automáticamente al loguearse vía `GET /api/configuration`; si falla, cae a una plantilla por defecto hardcodeada).
  - Guardar: `PUT /api/configuration` con `{ mensajeWhatsapp }`.
- La tarjeta "Plan Pro / 3 de 5 cupos utilizados" en el header es **contenido estático hardcodeado en el HTML** (no viene de ningún endpoint) — ver "Pendiente" abajo.

---

## Coberturas (Obras sociales / prepagas)

- **Ruta**: `/coberturas`
- **Componente**: `CoberturasViewComponent` — [`src/app/features/coberturas/coberturas-view/coberturas-view.component.ts`](../src/app/features/coberturas/coberturas-view/coberturas-view.component.ts)
- **Permisos**: `authGuard`, requiere capacidad `COBERTURA:VIEW`.
- **Propósito**: catálogo (multi-país LatAm) de coberturas/obras sociales/prepagas: favoritos, notas propias, teléfono/web propios, documentos adjuntos (convenios, nomencladores, etc.), y gestión de "intermediarios"/agrupaciones de coberturas.
- **Componentes que renderiza**: ninguno de `shared/`; usa `ReactiveFormsModule` directo para el formulario de intermediario (modal propio, sin componente separado) y `ConfirmDialogComponent` para confirmar el borrado de una institución.
- **Datos que carga / endpoints** (`CoberturasService` + `IntermediariosService`):
  - `GET /api/coberturas/paises` (qué países tienen catálogo real cargado)
  - `GET /api/coberturas?pais=...` (listado, filtrable por país activo — los "países activos" se persisten en `localStorage`, ver [STATE.md](./STATE.md))
  - `PUT /api/coberturas/{id}/favorito`, `/notas`, `/telefono`, `/web` (ediciones puntuales, optimistic update en favoritos)
  - `POST /api/coberturas/{id}/archivos` (subida de PDF/DOC/DOCX, máx. 20MB), `DELETE /api/coberturas/archivos/{id}`, `GET /api/coberturas/archivos/{id}/descarga` (blob, dispara descarga en el navegador)
  - `GET/POST/PUT/DELETE /api/intermediarios` (agrupaciones de coberturas por intermediario/broker)
- El país por defecto del selector de "nuevo intermediario" es `organizationPais` del usuario logueado (`AuthService.getCurrentUser()`).

## Panel Superadmin

- **Ruta**: `/admin`
- **Componente**: `AdminViewComponent` — [`src/app/features/admin/admin-view/admin-view.component.ts`](../src/app/features/admin/admin-view/admin-view.component.ts)
- **Permisos**: `authGuard`, requiere **rol** `ADMIN` (`data: { role: 'ADMIN' }`), no capacidad — ver [ROUTES.md](./ROUTES.md) y [PERMISOS.md § 9](./PERMISOS.md). Un `OWNER`/`USER` que entra a `/admin` cae en `/403`; un `ADMIN` siempre aterriza acá al loguearse, sin importar si además tiene capacidades de alguna organización (`resolveHomeRouteForUser`, ver ROUTES.md).
- **Propósito**: operación del SaaS, no de una clínica — panel cross-organización para quien administra la plataforma, no para el personal de una clínica. Lista todas las organizaciones dadas de alta con métricas agregadas (usuarios, pacientes, turnos) y permite activar/desactivar cada una, editar su plan/facturación, reemplazar el set completo de módulos contratados, y gestionar los usuarios de cualquier organización (activar/desactivar, cambiar rol).
- **Componentes que renderiza**: `AdminOrganizationPlanDialogComponent`, `AdminOrganizationModulesDialogComponent`, `AdminOrganizationUsersDialogComponent` — los tres son diálogos hermanos, montados con `*ngIf`/`[open]` en el mismo template, no ruteados.
- **Datos que carga / endpoints** (`AdminService`, base `/api/admin`):
  - `GET /organizations` (listado inicial, sin paginación — lista plana con scroll)
  - `GET /organizations/{orgId}` , `PATCH /organizations/{orgId}/toggle-active`
  - `PUT /organizations/{orgId}/plan` (`planNombre`, `planPrecio`, `fechaContratacion`, `fechaUltimoPago` — sin lógica de cobro, campos administrativos)
  - `PUT /organizations/{orgId}/modules` (reemplazo total del set de módulos contratados, no incremental)
  - `GET /organizations/{orgId}/users`, `PATCH /organizations/{orgId}/users/{userId}/toggle-active`, `PUT /organizations/{orgId}/users/{userId}/role`
- **Sin confirmación en acciones destructivas**: a diferencia de otras páginas (Turnos, Coberturas) que usan `ConfirmDialogComponent` antes de una baja, acá desactivar una organización, desactivar un usuario o cambiarle el rol dispara el `PATCH`/`PUT` **de inmediato** al hacer click/`change`, sin diálogo de confirmación intermedio. La única protección contra un error es del lado del backend (`AdminGuard`: no autodesactivarse, no dejar el sistema sin ningún `ADMIN` activo) — ver "Pendiente" abajo y [DEUDA_TECNICA.md](./DEUDA_TECNICA.md).
- **Sin tests**: ni specs unitarios (`*.spec.ts`) ni cobertura E2E — los `data-testid` sí están puestos en los cuatro componentes, listos para que alguien escriba cualquiera de los dos.

## Pendiente de completar por el desarrollador

- La tarjeta de plan/cupos de usuarios en Configuraciones (`"Plan Pro"`, `"3 / 5"`) sigue siendo estática. **Ya no es una incógnita si existe un endpoint de plan/facturación real** — existe (`PUT /api/admin/organizations/{orgId}/plan`, ver arriba) — pero es exclusivo del panel superadmin (`ADMIN`), cross-organización; no hay ningún endpoint para que una organización lea/muestre **su propio** plan desde Configuraciones. Conectar esta tarjeta a datos reales requeriría un endpoint nuevo del lado del `OWNER`, no reutilizar el del panel admin.
- No hay página de "perfil de usuario" propio (cambiar contraseña, editar datos personales del usuario logueado) detectada en las rutas.
- Agregar confirmación (`ConfirmDialogComponent`, ya usado en otras páginas) antes de desactivar una organización o un usuario, o cambiarle el rol, desde el panel superadmin — hoy esas acciones son inmediatas, sin paso intermedio.
