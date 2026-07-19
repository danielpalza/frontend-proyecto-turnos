# Componentes — OdontoLite (turnos-app)

Todos los componentes son **standalone** (`standalone: true`, sin `NgModule`). Se documentan acá los componentes reutilizables/hijos; los contenedores enrutados por página están en [PAGES.md](./PAGES.md). Los servicios que cada uno consume están detallados en [STATE.md](./STATE.md) (estado) y en las páginas que los usan.

## Layout

### `NavbarComponent` (`app-navbar`)
- **Archivo**: [`src/app/layout/navbar/navbar.component.ts`](../src/app/layout/navbar/navbar.component.ts)
- **Propósito**: barra superior con logo/nombre de organización, pestañas de navegación filtradas por módulos habilitados del usuario, y botón de logout.
- **Props/Inputs**: ninguno (lee todo de `AuthService`).
- **Eventos/Outputs**: ninguno (navega directamente con `Router`).
- **Servicios que usa**: `AuthService` (módulos habilitados, nombre de organización/usuario, logout), `OdontogramaStateService` (último `appointmentId` activo, para el link de Odontograma), `NotificationService` (toast si se intenta ir a Odontograma sin turno activo).
- **Dónde aparece**: en `App` (raíz), condicionado a `!url.includes('/login')` — es decir, en todas las páginas protegidas.

## Shared (`src/app/shared/`)

### `SearchInputComponent` (`app-search-input`)
- **Archivo**: [`shared/components/search-input/search-input.component.ts`](../src/app/shared/components/search-input/search-input.component.ts)
- **Propósito**: input de búsqueda con dropdown de resultados combinando pacientes y/o profesionales, con debounce configurable y filtro opcional "solo con saldo pendiente".
- **Inputs**: `patients`, `profesionales`, `searchType: 'patient'|'profesional'|'both'`, `placeholder`, `selectedValue`, `showIcon`, `debounceTime`, `showPendingOnlyFilter`, `pendingOnly`.
- **Outputs**: `select` (`SearchResult`), `clear`, `searchChange` (string), `pendingOnlyChange` (boolean).
- **Dónde aparece**: `MonthCalendarComponent` (filtro del calendario de turnos), `PatientFormComponent` (buscador de paciente existente dentro del wizard).

### `MiniCalendarPickerComponent` (`app-mini-calendar-picker`)
- **Archivo**: [`shared/components/mini-calendar-picker/mini-calendar-picker.component.ts`](../src/app/shared/components/mini-calendar-picker/mini-calendar-picker.component.ts)
- **Propósito**: selector de fecha única compacto (popover con mini-calendario), con soporte de `minDate`/`maxDate` para encadenar dos instancias (rango "desde"/"hasta").
- **Inputs**: `selectedDate`, `referenceMonth`, `minDate`, `maxDate`, `inputId`.
- **Outputs**: `dateChange` (string `YYYY-MM-DD`).
- **Dónde aparece**: `PanelViewComponent` (filtro de rango de fechas del dashboard, dos instancias enlazadas).

### `PatientFormComponent` (`app-patient-form`)
- **Archivo**: [`shared/components/patient-form/patient-form.component.ts`](../src/app/shared/components/patient-form/patient-form.component.ts)
- **Propósito**: formulario completo de datos de paciente (personales, antecedentes médicos, cobertura, y opcionalmente turno/pago). Es el formulario "hoja" que renderiza cada paso del wizard.
- **Inputs**: `form: FormGroup` (requerido, se lo arma quien lo use vía `getPatientFormConfig`), `activeStep: number | null` (si es `null` muestra todas las secciones), `showSearch`, `showAppointmentDetails`, `showPaymentDetails`, `existingPatients`, `selectedPatient`, `profesionales`, `isCheckingAvailability`, `availabilityError`, `calcularResto: () => number`.
- **Outputs**: `patientSelect` (`Patient`), `clearPatient`.
- **Servicios que usa**: `CoberturasService` (carga opciones de cobertura del país de la organización), `AuthService` (país de la organización).
- **Dónde aparece**: dentro de `PatientWizardComponent` (por lo tanto en `AppointmentDialogComponent` y `PatientWizardPanelComponent`).
- **Detalle de validaciones**: ver [FORMS.md](./FORMS.md#formulario-de-paciente-patient-form--patient-wizard).

### `PatientWizardComponent` (`app-patient-wizard`)
- **Archivo**: [`shared/components/patient-wizard/patient-wizard.component.ts`](../src/app/shared/components/patient-wizard/patient-wizard.component.ts)
- **Propósito**: shell de wizard de 5 pasos (o 4 si no incluye el paso de turno) que envuelve a `PatientFormComponent`: navegación por pasos con validación por paso, acordeón de revisión final antes de guardar.
- **Inputs**: `form`, `includeAppointmentStep` (agrega el paso "Turno y pago"), `showSearch`, `existingPatients`, `selectedPatient`, `profesionales`, `isCheckingAvailability`, `availabilityError`, `calcularResto`, `isSubmitting`.
- **Outputs**: `patientSelect`, `clearPatient`, `finish`, `cancel`.
- **Dónde aparece**: `AppointmentDialogComponent` (con `includeAppointmentStep = true`), `PatientWizardPanelComponent` (sin paso de turno).

## Calendario (`features/calendar`)

### `MonthCalendarComponent` (`app-month-calendar`)
- **Archivo**: [`features/calendar/components/month-calendar/month-calendar.component.ts`](../src/app/features/calendar/components/month-calendar/month-calendar.component.ts)
- **Propósito**: calendario mensual con conteo de turnos/pendientes/cancelados por día, navegación de mes, buscador integrado (`app-search-input`) y checkboxes de filtro rápido.
- **Inputs**: `currentDate`, `selectedDate`, `appointments`, `profesionales`, `patients`, `pendingOnly`, `pendientesOnly`, `canceladosOnly`.
- **Outputs**: `dateClick` (string), `monthChange` (`Date`), `filterChange` (`{type, term}`), `pendingOnlyChange`, `pendientesOnlyChange`, `canceladosOnlyChange`.
- **Dónde aparece**: `TurnosViewComponent`.

## Appointments (`features/appointments`)

### `AppointmentDialogComponent` (`app-appointment-dialog`)
- **Archivo**: [`features/appointments/components/appointment-dialog/appointment-dialog.component.ts`](../src/app/features/appointments/components/appointment-dialog/appointment-dialog.component.ts)
- **Propósito**: modal de alta de turno; combina selección/alta de paciente (vía `PatientWizardComponent`) con los datos propios del turno (profesional, hora, precios, pago inicial). Valida disponibilidad de horario contra el backend con debounce.
- **Inputs**: `open`, `selectedDate`, `existingPatients`, `profesionales`, `isLoading`.
- **Outputs**: `openChange` (boolean), `submitForm` (`{patientData, appointmentData}`).
- **Servicios que usa**: `AppointmentsService` (`checkAvailability`).
- **Dónde aparece**: `TurnosViewComponent`.

### `AppointmentsPanelComponent` (`app-appointments-panel`)
- **Archivo**: [`features/appointments/components/appointments-panel/appointments-panel.component.ts`](../src/app/features/appointments/components/appointments-panel/appointments-panel.component.ts)
- **Propósito**: panel de turnos del día seleccionado: pestañas por estado (Todos/Completado/Pendiente/Cancelado), tarjetas expandibles con edición inline de hora, profesional, precios (bono/tratamiento/extras), observaciones y registro de pagos; link directo a WhatsApp y al odontograma del turno.
- **Inputs**: `date`, `appointments`, `profesionales`, `patients`.
- **Outputs**: `delete` (string, id del turno), `addClick`.
- **Servicios que usa**: `AppointmentsService` (todas las ediciones inline vía `updateWithFeedback`/`addPaymentWithFeedback`), `ConfigurationService` (arma el link de WhatsApp con la plantilla configurada), `NotificationService`, `Router` (navega a `/odontograma/:id`).
- **Dónde aparece**: `TurnosViewComponent`.

### `ConfirmDialogComponent` (`app-confirm-dialog`)
- **Archivo**: [`features/appointments/components/confirm-dialog/confirm-dialog.component.ts`](../src/app/features/appointments/components/confirm-dialog/confirm-dialog.component.ts)
- **Propósito**: diálogo de confirmación genérico y reutilizable (título/mensaje/resumen configurables, variante visual danger/primary/neutral según `confirmButtonClass`).
- **Inputs**: `open`, `title`, `message`, `summary`, `isLoading`, `confirmText`, `cancelText`, `confirmButtonClass`, `dialogId`.
- **Outputs**: `confirm`, `cancel`, `openChange`.
- **Dónde aparece**: solo en `TurnosViewComponent` (confirmar cancelación de turno). **No** se reutiliza en `ProfesionalesPanelComponent`, que implementa su propio modal de confirmación de borrado con markup propio — ver [UI_RULES.md](./UI_RULES.md) para la inconsistencia.

## Patients (`features/patients`)

### `PatientComboboxComponent` (`app-patient-combobox`)
- **Archivo**: [`features/patients/components/patient-combobox/patient-combobox.component.ts`](../src/app/features/patients/components/patient-combobox/patient-combobox.component.ts)
- **Propósito**: combobox simple de selección de paciente por nombre (deduplicado por nombre completo).
- **Inputs**: `patients`, `value`.
- **Outputs**: `valueChange`, `selectPatient`.
- **Dónde aparece**: **en ningún template actualmente** — no se encontró ningún uso (`app-patient-combobox`) fuera de su propio archivo. Parece código huérfano; ver "Pendiente" al final de este documento.

## Configuraciones (`features/configuraciones`) — usados también desde Seguimiento

### `ProfesionalDialogComponent` (`app-profesional-dialog`)
- **Archivo**: [`features/configuraciones/components/profesional-dialog/profesional-dialog.component.ts`](../src/app/features/configuraciones/components/profesional-dialog/profesional-dialog.component.ts)
- **Propósito**: alta/edición de profesional, con sección opcional (solo `OWNER`, solo al crear) para generar un usuario de acceso al sistema vinculado (`crearAcceso`, `username`, `password` con medidor de fortaleza) y asignarle módulos habilitados.
- **Inputs**: `open`, `editingProfesional`, `isOwner`, `moduleOptions`, `isSaving`, `saveError`.
- **Outputs**: `openChange`, `save` (`ProfesionalCreateDTO`).
- **Dónde aparece**: `ProfesionalesPanelComponent` (dentro de la página **Seguimiento**, no Configuraciones — ver nota en [PAGES.md](./PAGES.md#seguimiento-de-pacientes)).
- **Detalle de validaciones**: ver [FORMS.md](./FORMS.md#formulario-de-profesional-profesionaldialogcomponent).

### `InvitationDialogComponent` (`app-invitation-dialog`)
- **Archivo**: [`features/configuraciones/components/invitation-dialog/invitation-dialog.component.ts`](../src/app/features/configuraciones/components/invitation-dialog/invitation-dialog.component.ts)
- **Propósito**: generar códigos de invitación (con selección de módulos habilitados y expiración opcional en días) para que otro usuario se una a la organización; lista y permite revocar invitaciones existentes.
- **Inputs**: `open`.
- **Outputs**: `openChange`.
- **Servicios que usa**: `InvitationService`.
- **Dónde aparece**: `ProfesionalesPanelComponent` (Seguimiento).

## Seguimiento (`features/seguimiento`)

### `ProfesionalesPanelComponent` (`app-profesionales-panel`)
- **Archivo**: [`features/seguimiento/components/profesionales-panel/profesionales-panel.component.ts`](../src/app/features/seguimiento/components/profesionales-panel/profesionales-panel.component.ts)
- **Propósito**: lista de profesionales de la organización con avatar, badge "Usuario" (si tiene acceso vinculado), activar/desactivar, editar, eliminar, e invitar usuarios. Envuelve `ProfesionalDialogComponent` e `InvitationDialogComponent`.
- **Inputs**: ninguno (carga todo de `ProfesionalService`).
- **Outputs**: ninguno.
- **Servicios que usa**: `ProfesionalService`, `AuthService` (`hasRole('OWNER')`).
- **Dónde aparece**: `SeguimientoViewComponent`.

### `PatientWizardPanelComponent` (`app-patient-wizard-panel`)
- **Archivo**: [`features/seguimiento/components/patient-wizard-panel/patient-wizard-panel.component.ts`](../src/app/features/seguimiento/components/patient-wizard-panel/patient-wizard-panel.component.ts)
- **Propósito**: envoltorio del wizard de paciente para alta/edición fuera del contexto de un turno (expone `openNew()`/`openEdit(patient)` públicos, invocados por el padre vía `@ViewChild`).
- **Inputs**: `patients`.
- **Outputs**: ninguno propio (el padre llama a sus métodos públicos directamente).
- **Servicios que usa**: `PatientService`.
- **Dónde aparece**: `SeguimientoViewComponent`.

### `AppointmentListOverflowComponent` (`app-appointment-list-overflow`)
- **Archivo**: [`features/seguimiento/components/appointment-list-overflow/appointment-list-overflow.component.ts`](../src/app/features/seguimiento/components/appointment-list-overflow/appointment-list-overflow.component.ts)
- **Propósito**: lista compacta de turnos de un paciente que detecta overflow con `ResizeObserver` y permite expandir/colapsar ("ver más").
- **Inputs**: `appointments`, `identificacion`.
- **Outputs**: `appointmentClick` (`Appointment`).
- **Método público**: `collapse()` (invocado por el padre al cambiar el filtro de año/mes).
- **Dónde aparece**: `SeguimientoViewComponent` (una instancia por paciente listado).

### `TurnPaymentModalComponent` (`app-turn-payment-modal`)
- **Archivo**: [`features/seguimiento/components/turn-payment-modal/turn-payment-modal.component.ts`](../src/app/features/seguimiento/components/turn-payment-modal/turn-payment-modal.component.ts)
- **Propósito**: modal de detalle de un turno con edición de precios (bono/tratamiento/extras), registro de pago, observaciones de pago y del turno, y link de WhatsApp.
- **Inputs**: `open`, `patient`, `appointment` (setter que resetea el estado interno de edición al recibir un turno nuevo).
- **Outputs**: `closed`, `appointmentUpdated` (`Appointment`).
- **Servicios que usa**: `AppointmentsService`, `ConfigurationService`.
- **Dónde aparece**: `SeguimientoViewComponent`.

## Odontograma (`features/odontograma`)

Todos comparten estado vía `OdontogramaStateService` (ver [STATE.md](./STATE.md)); ninguno recibe los datos clínicos por `@Input`, los leen directo del servicio.

### `OdontogramaFormComponent` (`app-odontograma-form`)
- **Archivo**: [`features/odontograma/components/odontograma-form/odontograma-form.component.ts`](../src/app/features/odontograma/components/odontograma-form/odontograma-form.component.ts)
- **Propósito**: grilla de piezas dentales permanentes y temporales agrupadas en cuadrantes; selecciona el diente activo (para la leyenda) y muestra sus íconos de estado/condición/movilidad/furca.
- **Inputs/Outputs**: ninguno.
- **Renderiza**: `ToothFacesComponent` por cada pieza.
- **Dónde aparece**: `OdontogramaViewComponent`.

### `ToothFacesComponent` (`app-tooth-faces`)
- **Archivo**: [`features/odontograma/components/tooth-faces/tooth-faces.component.ts`](../src/app/features/odontograma/components/tooth-faces/tooth-faces.component.ts)
- **Propósito**: SVG de una pieza dental con 5 caras clicables que ciclan estado clínico (`normal → caries → obturación → ausente`).
- **Inputs**: `toothNumber` (requerido), `size: 'sm'|'md'`.
- **Outputs**: ninguno (escribe directo en `OdontogramaStateService.cycleFace`).
- **Dónde aparece**: `OdontogramaFormComponent`.

### `OdontogramaLeyendComponent` (`app-odontograma-leyend`)
- **Archivo**: [`features/odontograma/components/odontograma-leyend/odontograma-leyend.component.ts`](../src/app/features/odontograma/components/odontograma-leyend/odontograma-leyend.component.ts)
- **Propósito**: panel lateral con checkboxes de estados (Ausencia/Implante/Corona/...), condiciones (Endodoncia/Fractura/...) y selects de movilidad (M0–M3) y furca (F0–F3), aplicados al diente actualmente seleccionado.
- **Dónde aparece**: `OdontogramaViewComponent` (oculto cuando el modo activo es periodontograma).

### `OdontogramaCommentComponent` (`app-odontograma-comment-component`)
- **Archivo**: [`features/odontograma/components/odontograma-comment/odontograma-comment.component.ts`](../src/app/features/odontograma/components/odontograma-comment/odontograma-comment.component.ts)
- **Propósito**: bloque reutilizable de título + textarea. Su comportamiento (editable o solo lectura, y a qué stream se conecta) se decide **por el valor exacto del `title`** que recibe (`"Comentarios del turno"`, `"Plan de tratamiento"`, `"Comentarios del turno anterior"`, `"Historia clinica del paciente"`) — es decir, es un componente "genérico" pero acoplado por string-matching, no por un `@Input` de modo explícito.
- **Inputs**: `title`, `rows`.
- **Dónde aparece**: `OdontogramaViewComponent` (4 instancias).

### `OdontogramaActionsComponent` (`app-odontograma-actions`)
- **Archivo**: [`features/odontograma/components/odontograma-actions/odontograma-actions.component.ts`](../src/app/features/odontograma/components/odontograma-actions/odontograma-actions.component.ts)
- **Propósito**: barra de acciones (imprimir con `window.print()` por defecto o evento custom si el padre escucha `print`; abrir `SaveOdontogramaDialogComponent`).
- **Inputs**: `activeForm: 'odontograma'|'periodontograma'`.
- **Outputs**: `print`.
- **Dónde aparece**: `OdontogramaViewComponent`.

### `SaveOdontogramaDialogComponent` (`app-save-odontograma-dialog`)
- **Archivo**: [`features/odontograma/components/save-odontograma-dialog/save-odontograma-dialog.component.ts`](../src/app/features/odontograma/components/save-odontograma-dialog/save-odontograma-dialog.component.ts)
- **Propósito**: modal final de guardado: precios/pago del turno + resumen de los comentarios cargados; al confirmar dispara el guardado combinado (`OdontogramaStateService.saveTurnoCompleto`) y navega a `/turnos`.
- **Inputs**: `open` (setter: al abrirse, refresca el snapshot de pago del turno desde el backend).
- **Outputs**: `openChange`.
- **Dónde aparece**: `OdontogramaActionsComponent`.

### `PeriodontogramaFormComponent` (`app-periodontograma-form`)
- **Archivo**: [`features/odontograma/components/periodontograma-form/periodontograma-form.component.ts`](../src/app/features/odontograma/components/periodontograma-form/periodontograma-form.component.ts)
- **Propósito**: tabla de periodontograma por arcada (superior/inferior), con inputs de profundidad de sondaje (PS) y margen gingival (MG) por sitio, KPIs calculados (% sangrado/placa/supuración/cálculo, PS promedio, sitios profundos ≥6mm), y navegación por teclado (Tab) entre inputs.
- **Renderiza**: `PerioToothSparklineComponent` por cara/diente.
- **Dónde aparece**: `OdontogramaViewComponent` (oculto cuando el modo activo es odontograma).

### `PerioToothSparklineComponent` (`app-perio-tooth-sparkline`)
- **Archivo**: [`features/odontograma/components/perio-tooth-sparkline/perio-tooth-sparkline.component.ts`](../src/app/features/odontograma/components/perio-tooth-sparkline/perio-tooth-sparkline.component.ts)
- **Propósito**: mini-gráfico SVG por cara dental (PS, MG, NIC derivado, relleno del saco, marcas de sangrado/placa/supuración/cálculo), con conectores visuales hacia los sitios distales/mesiales de las piezas vecinas para formar una curva continua por arcada.
- **Inputs**: `probing`, `nic`, `mg`, `bleeding`, `plaque`, `suppuration`, `calculus`, `present` (todos `required`), más `showAxisLabels`, `zeroAtBottom`, `toothId`, `chartFace`, `prevDistal*`, `nextMesial*` (datos de piezas vecinas para encadenar el trazo).
- **Dónde aparece**: `PeriodontogramaFormComponent` (una instancia por cara — vestibular/lingual — de cada diente).

## Pendiente de completar por el desarrollador

- `PatientComboboxComponent` no tiene ningún consumidor en el código actual. Confirmar si debe eliminarse o si está pensado para un flujo futuro no implementado todavía.
