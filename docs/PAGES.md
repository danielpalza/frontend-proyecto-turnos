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
- **Permisos**: `authGuard`, requiere módulo `PANEL`.
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
- **Permisos**: `authGuard`, requiere módulo `TURNOS`.
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
- **Permisos**: `authGuard`, requiere módulo `ODONTOGRAMA`. Se accede normalmente desde el panel de turnos (no hay link directo en el navbar sin un turno activo, ver [ROUTES.md](./ROUTES.md)).
- **Propósito**: ficha clínica dental de un turno concreto — odontograma (piezas dentales, caras, estados/condiciones) y periodontograma (sondaje, márgenes, sangrado/placa/supuración/cálculo), con guardado incremental (delta) y registro de pago del turno.
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

## Seguimiento de Pacientes

- **Ruta**: `/seguimiento`
- **Componente**: `SeguimientoViewComponent` — [`src/app/features/seguimiento/seguimiento-view/seguimiento-view.component.ts`](../src/app/features/seguimiento/seguimiento-view/seguimiento-view.component.ts)
- **Permisos**: `authGuard`, requiere módulo `SEGUIMIENTO`.
- **Propósito**: doble función en una sola página:
  1. **Historial por paciente** (columna izquierda): lista de pacientes con búsqueda, deuda total, turnos agrupados por año/mes, alta/edición de paciente.
  2. **Gestión de profesionales y usuarios de la organización** (columna derecha, `app-profesionales-panel`) — alta/edición/baja de profesionales, activar/desactivar, e invitar nuevos usuarios a la organización.
- **Componentes que renderiza**:
  - `AppointmentListOverflowComponent` (lista de turnos de un paciente, con expandir/colapsar si desborda)
  - `PatientWizardPanelComponent` → embebe `PatientWizardComponent`/`PatientFormComponent` (alta/edición de paciente)
  - `ProfesionalesPanelComponent` → embebe `ProfesionalDialogComponent` e `InvitationDialogComponent`
  - `TurnPaymentModalComponent` (modal de pago/observaciones al hacer click en un turno de la lista)
- **Datos que carga / endpoints** (orquestado por `PatientDataService`, servicio scoped al componente, no singleton):
  - `GET /api/appointments/seguimiento-resumen` (deuda total y turnos totales por paciente)
  - `PatientService.getPatients()` (caché compartida)
  - `GET /api/appointments/range?startDate=<año>-01-01&endDate=<año>-12-31` por cada año consultado (con caché en memoria por año, `ensureAllYearsLoaded` al filtrar "Todo")
  - Panel de profesionales: `ProfesionalService.getProfesionales()` (caché), `POST/PATCH/DELETE /api/profesionales/{id}`, `PATCH /api/profesionales/{id}/toggle-active`
  - Invitaciones: `GET/POST /api/invitations`, `DELETE /api/invitations/{id}`
  - Modal de pago: mismos endpoints de turno que en Turnos (`PATCH /api/appointments/{id}`, `/addPayment`)
- **Permisos adicionales**: el botón "Invitar usuario" y la sección de creación de acceso de usuario en `ProfesionalDialogComponent` solo se muestran si `AuthService.hasRole('OWNER')`.

> Nota: aunque conceptualmente "gestionar profesionales" suena a Configuraciones, en el código real ese panel vive dentro de la página **Seguimiento**, no en Configuraciones. Ver también la nota de memoria del proyecto sobre autorización diferida (`ProfesionalController` sin chequeo de rol propio en el backend).

---

## Configuraciones

- **Ruta**: `/configuraciones`
- **Componente**: `ConfiguracionesViewComponent` — [`src/app/features/configuraciones/configuraciones-view/configuraciones-view.component.ts`](../src/app/features/configuraciones/configuraciones-view/configuraciones-view.component.ts)
- **Permisos**: `authGuard`, requiere módulo `CONFIGURACIONES`.
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
- **Permisos**: `authGuard`, requiere módulo `COBERTURA`.
- **Propósito**: catálogo (multi-país LatAm) de coberturas/obras sociales/prepagas: favoritos, notas propias, teléfono/web propios, documentos adjuntos (convenios, nomencladores, etc.), y gestión de "intermediarios"/agrupaciones de coberturas.
- **Componentes que renderiza**: ninguno de `shared/`; usa `ReactiveFormsModule` directo para el formulario de intermediario (modal propio, sin componente separado) y `ConfirmDialogComponent` para confirmar el borrado de una institución.
- **Datos que carga / endpoints** (`CoberturasService` + `IntermediariosService`):
  - `GET /api/coberturas/paises` (qué países tienen catálogo real cargado)
  - `GET /api/coberturas?pais=...` (listado, filtrable por país activo — los "países activos" se persisten en `localStorage`, ver [STATE.md](./STATE.md))
  - `PUT /api/coberturas/{id}/favorito`, `/notas`, `/telefono`, `/web` (ediciones puntuales, optimistic update en favoritos)
  - `POST /api/coberturas/{id}/archivos` (subida de PDF/DOC/DOCX, máx. 20MB), `DELETE /api/coberturas/archivos/{id}`, `GET /api/coberturas/archivos/{id}/descarga` (blob, dispara descarga en el navegador)
  - `GET/POST/PUT/DELETE /api/intermediarios` (agrupaciones de coberturas por intermediario/broker)
- El país por defecto del selector de "nuevo intermediario" es `organizationPais` del usuario logueado (`AuthService.getCurrentUser()`).

## Pendiente de completar por el desarrollador

- La tarjeta de plan/cupos de usuarios en Configuraciones (`"Plan Pro"`, `"3 / 5"`) es estática — no se pudo determinar si hay un endpoint de facturación/planes real pendiente de conectar, o si es solo un placeholder visual.
- No hay página de "perfil de usuario" propio (cambiar contraseña, editar datos personales del usuario logueado) detectada en las rutas.
