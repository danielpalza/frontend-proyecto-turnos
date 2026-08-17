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

### `CanDirective` (`[appCan]`)
- **Archivo**: [`shared/directives/can.directive.ts`](../src/app/shared/directives/can.directive.ts)
- **Propósito**: directiva de atributo (no estructural) que **deshabilita** el elemento host cuando al usuario le falta una capacidad y le agrega un `title` (tooltip) explicando qué capacidad falta (`capabilityDeniedMessage()`, ver [`core/auth/capabilities.ts`](../src/app/core/auth/capabilities.ts)). El nodo **permanece en el DOM** — a diferencia de `*appCanShow` — con clase `capability-locked`, `aria-disabled="true"` y, si el tag lo soporta (`BUTTON`/`INPUT`/`SELECT`/`TEXTAREA`/`FIELDSET`/`OPTGROUP`/`OPTION`), el atributo `disabled`. Pensada para controles dentro de una pantalla ya visible, donde conviene que el usuario vea que la acción existe pero no la tiene habilitada (y para que specs de Playwright puedan asertar el estado `disabled`). **Nota de corrección**: la tabla de directivas en [`src/app/shared/README.md`](../src/app/shared/README.md) tenía esta descripción intercambiada con la de `*appCanShow` — ya corregida ahí.
- **Input**: `appCan: string` (requerido) — código de capacidad, p. ej. `'CONFIGURACIONES:VIEW'`.
- **Se re-evalúa**: en cada emisión de `AuthService.currentUser$` y en cada `ngOnChanges` (si el binding cambia).
- **Dónde aparece**: ~12 componentes, entre ellos `AppointmentsPanelComponent`, `TurnPaymentModalComponent`, `TurnClinicalModalComponent`, `ProfesionalesPanelComponent`.

### `CanShowDirective` (`*appCanShow`)
- **Archivo**: [`shared/directives/can.directive.ts`](../src/app/shared/directives/can.directive.ts) (mismo archivo que `CanDirective`)
- **Propósito**: directiva **estructural** que muestra/oculta contenido (lo quita del DOM con `ViewContainerRef.clear()`, no solo lo esconde con CSS) según si el usuario tiene la capacidad indicada. Pensada para navegación (pestañas, ítems de menú) donde un control gris deshabilitado no aporta nada — a diferencia de `[appCan]`, que sí deja el elemento visible pero bloqueado.
- **Input**: `appCanShow: string` (requerido) — código de capacidad.
- **Se re-evalúa**: igual que `CanDirective` (`currentUser$` + `ngOnChanges`).
- **Dónde aparece**: ítems de navegación filtrados por capacidad (ver [ROUTES.md](./ROUTES.md#capacidades-de-vista-datacapability-y-su-relación-con-el-navbar)).

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
- **Dónde aparece**: `PanelViewComponent` (filtro de rango de fechas del dashboard, dos instancias enlazadas); **desde 2026-08-08**, `SeguimientoViewComponent` (mismo patrón de dos instancias enlazadas, reemplaza a los antiguos selects de año/mes por paciente).

### `DocumentosModalComponent` (`app-documentos-modal`) — nuevo, 2026-08-08
- **Archivo**: [`shared/components/documentos-modal/documentos-modal.component.ts`](../src/app/shared/components/documentos-modal/documentos-modal.component.ts)
- **Propósito**: modal compartido de documentos adjuntos (subir/listar/descargar/eliminar), parametrizado por tipo de entidad — cubre Turno, Paciente y Profesional con el mismo componente. Mismo patrón de subida/descarga que ya usaba Coberturas, generalizado. Primer modal del repo que combina `appScrollLock` **y** `appBodyPortal` desde el día uno (ver [DEUDA_TECNICA.md § 1.1](./DEUDA_TECNICA.md) sobre los siete modales legacy que no lo hacen).
- **Inputs**: `open`, `tipoEntidad` (`'APPOINTMENT'|'PATIENT'|'PROFESIONAL'`), `entidadId`, `titulo`.
- **Outputs**: `closed`.
- **Servicios que usa**: `DocumentosService`, `NotificationService`, `ErrorHandlerService`.
- **Reglas de cliente**: extensión (`pdf`/`docx`/`doc`) y tamaño (20MB) se validan antes de subir, mismos límites que el backend — evita el viaje de red para un archivo que el backend va a rechazar igual.
- **Capacidad de gestión dinámica**: `capabilityManage` resuelve `PROFESIONALES:MANAGE` si `tipoEntidad === 'PROFESIONAL'`, `SEGUIMIENTO:PACIENTES` en el resto — espejo en el cliente de cómo `DocumentoController` resuelve la capacidad en runtime del lado del backend.
- **Dónde aparece**: `SeguimientoViewComponent` (documentos de turno y de paciente), `ProfesionalesPanelComponent` (documentos de profesional).

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
- **Dónde aparece**: `TurnosViewComponent` (confirmar cancelación de turno) y `CoberturasViewComponent` (confirmar borrado de una institución/intermediario). **No** se reutiliza en `ProfesionalesPanelComponent`, que implementa su propio modal de confirmación de borrado con markup propio — ver [UI_RULES.md](./UI_RULES.md) para la inconsistencia.

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
- **Propósito**: lista de profesionales de la organización con avatar, badge "Usuario" (si tiene acceso vinculado), activar/desactivar, editar, eliminar, invitar usuarios, y (desde 2026-08-08) un botón de documentos por profesional que abre `DocumentosModalComponent`. Envuelve `ProfesionalDialogComponent` e `InvitationDialogComponent`.
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
- **Propósito**: lista compacta de turnos de un paciente que detecta overflow con `ResizeObserver` y permite expandir/colapsar ("ver más"); dropdown de acciones por turno (pago/observaciones, resumen clínico, documentos).
- **Inputs**: `appointments`, `identificacion`.
- **Outputs**: `appointmentClick` (`Appointment`, abre el modal de pago), `clinicalClick` (`Appointment`, abre el resumen clínico), `documentsClick` (`Appointment`, abre `DocumentosModalComponent`).
- **Método público**: `collapse()` (invocado por el padre al cambiar de página o de rango de fechas — antes, al cambiar el filtro de año/mes por paciente, eliminado el 2026-08-08).
- **`@ViewChild('apptList')` es un setter, no un campo + `ngAfterViewInit`** — desconecta/reconecta el `ResizeObserver` cada vez que el div `#apptList` aparece o desaparece del DOM (detrás de `*ngIf="appointments.length > 0"`), en vez de asumir que existe. Ver [DEUDA_TECNICA.md § 7.1](./DEUDA_TECNICA.md) para el bug que este diseño corrige y por qué se prefirió sobre un guard simple.
- **Dónde aparece**: `SeguimientoViewComponent` (una instancia por paciente listado).

### `TurnPaymentModalComponent` (`app-turn-payment-modal`)
- **Archivo**: [`features/seguimiento/components/turn-payment-modal/turn-payment-modal.component.ts`](../src/app/features/seguimiento/components/turn-payment-modal/turn-payment-modal.component.ts)
- **Propósito**: modal de detalle de un turno con edición de precios (bono/tratamiento/extras), registro de pago, observaciones de pago y del turno, y link de WhatsApp.
- **Inputs**: `open`, `patient`, `appointment` (setter que resetea el estado interno de edición al recibir un turno nuevo).
- **Outputs**: `closed`, `appointmentUpdated` (`Appointment`).
- **Servicios que usa**: `AppointmentsService`, `ConfigurationService`.
- **Dónde aparece**: `SeguimientoViewComponent`.

### `TurnClinicalModalComponent` (`app-turn-clinical-modal`)
- **Archivo**: [`features/seguimiento/components/turn-clinical-modal/turn-clinical-modal.component.ts`](../src/app/features/seguimiento/components/turn-clinical-modal/turn-clinical-modal.component.ts)
- **Propósito**: modal de **resumen clínico de solo lectura** de un turno (odontograma + periodontograma: caras/estados por diente cambiados en ese turno, movilidad/furca, KPIs de periodontograma) para consultarlo sin salir de Seguimiento. No documentado previamente en este archivo — coexiste con `TurnPaymentModalComponent` (que cubre precios/pago/observaciones) en la misma vista, ambos abiertos sobre el mismo `selectedAppointment` del padre.
- **Inputs**: `open`, `appointment` (setter que clona el turno recibido).
- **Outputs**: `closed`.
- **Servicios que usa**: `OdontogramaService`, `PeriodontogramaService` (carga vía `forkJoin`, con `switchMap` para descartar respuestas de un turno anterior), `ModuleRulesService` (resuelve `rutaClinica`/label a partir de `appointment.moduloClinicoCodigo`, para no hardcodear "odontograma").
- **Método público clave**: `openClinicalModule()` — navega a `/<rutaClinica>/<appointmentId>` resuelta dinámicamente (antes `openOdontogram()`, fijo a `/odontograma/<id>`); protegido en el template con `[appCan]="clinicalModuleCapability"` (`<MODULO>:VIEW` del módulo del turno, no una capacidad fija de Odontograma).
- **Dónde aparece**: `SeguimientoViewComponent`, junto a `TurnPaymentModalComponent` (ver [PAGES.md § Seguimiento](./PAGES.md#seguimiento-de-pacientes) — antes solo mencionaba el modal de pago).

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
- **Propósito**: bloque reutilizable de título + contenido. Su comportamiento (qué renderiza, si es editable, y a qué stream se conecta) se decide **por el valor exacto del `title`** que recibe (`"Comentarios del turno"`, `"Plan de tratamiento"`, `"Comentarios del turno anterior"`, `"Historia clinica del paciente"`) — es decir, es un componente "genérico" pero acoplado por string-matching, no por un `@Input` de modo explícito.
- Las tres primeras variantes muestran un **textarea** (las dos primeras editables). La de **historia clínica** es distinta: no es un texto libre sino los antecedentes médicos del paciente (`Patient.anamnesis`, cargado en el paso 2 del wizard), y se renderiza como **lista punteada** de `Etiqueta: valor` — omitiendo los campos vacíos — más el texto de "Otros antecedentes" debajo. Sin datos muestra "Sin antecedentes registrados".
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

## Historia Clínica (`features/historia-clinica`)

Módulo clínico `HISTORIA_CLINICA_FREE`, hermano de Odontograma: es el segundo módulo con ficha clínica propia, y el primero construido sobre el diseño explícitamente multi-módulo (ver [ARCHITECTURE.md](./ARCHITECTURE.md)). Comparte estado vía `HistoriaClinicaStateService` (facade, ver [STATE.md](./STATE.md)) — mirror simplificado de `OdontogramaStateService`: acá no hace falta separar en sub-servicios por dominio, la ficha es un único `HistoriaClinicaResponse` plano de 6 secciones fijas.

### `HistoriaClinicaViewComponent` (`app-historia-clinica-view`)
- **Archivo**: [`features/historia-clinica/components/historia-clinica-view/historia-clinica-view.component.ts`](../src/app/features/historia-clinica/components/historia-clinica-view/historia-clinica-view.component.ts)
- **Propósito**: contenedor de ruta (`/historia-clinica/:appointmentId`), mirror de `OdontogramaViewComponent`: resuelve el `appointmentId` de la URL, dispara la carga (`HistoriaClinicaStateService.loadForAppointment`) y controla el estado de carga/error/solo-lectura de toda la página. Sin alternancia de sub-formularios (no hay equivalente a odontograma/periodontograma acá): es una sola ficha.
- **Inputs/Outputs**: ninguno (contenedor enrutado, lee todo de `ActivatedRoute` y del servicio de estado).
- **Signals propios**: `loading`, `loadError`, `editable` (turno cerrado: registro `FIRMADO`, o el paciente tiene un registro clínico posterior — banner de solo lectura en el template).
- **Servicios que usa**: `HistoriaClinicaStateService`.
- **Renderiza**: `HistoriaClinicaFormComponent` (una vez resuelta la carga, sin error).
- **Dónde aparece**: enrutado directo, ver [PAGES.md](./PAGES.md#historia-clínica) y [ROUTES.md](./ROUTES.md).

### `HistoriaClinicaFormComponent` (`app-historia-clinica-form`)
- **Archivo**: [`features/historia-clinica/components/historia-clinica-form/historia-clinica-form.component.ts`](../src/app/features/historia-clinica/components/historia-clinica-form/historia-clinica-form.component.ts)
- **Propósito**: formulario Reactive Forms de las 6 secciones fijas (datos del paciente, motivo de consulta, condición actual, antecedentes médicos, examen físico, diagnóstico + CIE10 + indicaciones), con flujo borrador/firma: "Guardar borrador" (`saveDraft`, sin bloquear) vs. "Firmar y guardar" (`sign`, con modal de confirmación propio — `showSignConfirm` — y bloqueo permanente del registro tras firmar). Detalle de secciones/validaciones en [FORMS.md](./FORMS.md#historia-clínica).
- **Inputs/Outputs**: ninguno (lee/escribe directo contra `HistoriaClinicaStateService`, igual patrón que los componentes de Odontograma).
- **Signals propios**: `editable`, `saving`, `signing`, `saveError`, `showSignConfirm`.
- **Gate de permisos interno**: las secciones "Datos del paciente" y "Antecedentes" (comparten datos con `Patient`/`Patient.anamnesis` — editarlas sincroniza también la ficha del paciente) exigen `TURNOS:MANAGE` o `SEGUIMIENTO:PACIENTES` (`canEditPatientData`, vía `AuthService.hasCapability`), **independiente** de si el usuario puede editar el resto de la historia clínica; sin ese permiso esos controles quedan deshabilitados aunque el formulario esté editable. El payload que se envía usa `form.value` (no `getRawValue()`) a propósito, para que los controles deshabilitados no viajen como "cambiados".
- **Servicios que usa**: `HistoriaClinicaStateService`, `AuthService`.
- **Dónde aparece**: `HistoriaClinicaViewComponent`.

### `SuscripcionBannerComponent` (`app-suscripcion-banner`)
- **Archivo**: [`shared/components/suscripcion-banner/suscripcion-banner.component.ts`](../src/app/shared/components/suscripcion-banner/suscripcion-banner.component.ts)
- **Propósito**: aviso persistente montado directo en `app.html` (shell raíz, no en una feature) para que se vea en toda la app cuando la suscripción de la organización tiene un problema — tres motivos distintos y mutuamente excluyentes: baja efectiva (`estadoSuscripcion === 'CANCELADA'`), baja agendada (`cancelacionDesde` seteado) o pago vencido (`estadoPago === 'VENCIDO'`). Dos tonos: advertencia mientras quedan días de gracia, error una vez que ya está en solo lectura (`soloLectura`) — en ese caso el botón de cerrar (`dismiss()`) se oculta, porque el usuario necesita saber por qué no puede guardar nada.
- **Inputs/Outputs**: ninguno — se autoabastece vía `SubscriptionService.getSubscription()`.
- **Servicios que usa**: `SubscriptionService`.
- **Dónde aparece**: `AppComponent` (`app.html`), visible en toda la aplicación mientras haya sesión.

## Admin (`features/admin`) — panel superadmin, nuevo 2026-08-09

Cross-organización, exclusivo del rol `ADMIN` (no del sistema de capacidades) — ver [PERMISOS.md § 9](./PERMISOS.md#9-rol-admin--panel-superadmin-mecanismo-aparte) y [PAGES.md](./PAGES.md#panel-superadmin). De los cinco componentes (los cuatro originales del 2026-08-09 más `AdminPagosPanelComponent` de la pantalla de pagos, 2026-08-15), solo este último tiene spec unitario — ver [TESTING.md § 8](./TESTING.md#8-huecos-conocidos). Ninguno tiene cobertura E2E — ver [DEUDA_TECNICA.md](./DEUDA_TECNICA.md).

### `AdminViewComponent` (`app-admin-view`)
- **Archivo**: [`features/admin/admin-view/admin-view.component.ts`](../src/app/features/admin/admin-view/admin-view.component.ts)
- **Propósito**: contenedor de ruta (`/admin`). Carga y lista **todas** las organizaciones (`AdminService.listarOrganizaciones()`, sin paginar — lista plana con scroll) con nombre, slug, país, estado activo/inactivo, resumen de plan, y tres chips de conteo (usuarios/pacientes/turnos). Por fila: activar/desactivar (dispara el `PATCH` directo, sin confirmación), y tres botones que abren cada uno de los diálogos hijos.
- **Inputs/Outputs**: ninguno (contenedor enrutado).
- **Servicios que usa**: `AdminService`, `NotificationService`.
- **Renderiza**: `AdminOrganizationPlanDialogComponent`, `AdminOrganizationModulesDialogComponent`, `AdminOrganizationUsersDialogComponent` — los tres montados como hermanos, alternados por flags booleanos (`*ngIf`), no ruteados.
- **Dónde aparece**: enrutado directo, ver [ROUTES.md](./ROUTES.md).

### `AdminOrganizationPlanDialogComponent` (`app-admin-organization-plan-dialog`)
- **Archivo**: [`features/admin/components/admin-organization-plan-dialog/admin-organization-plan-dialog.component.ts`](../src/app/features/admin/components/admin-organization-plan-dialog/admin-organization-plan-dialog.component.ts)
- **Propósito**: selector del plan real contra el catálogo (`GET /api/subscription/planes`), marcando el vigente y mostrando precio y cupos de cada uno. Avisa cuando la elección es una **baja** (se aplica al cierre del período, no al instante) y cuando la organización está dada de baja. Hasta 2026-08-15 era un formulario de 4 campos de texto libre (`planNombre`, `planPrecio`, `fechaContratacion`, `fechaUltimoPago`) que no estaban conectados con nada: se editaban y no afectaban ni cupos ni facturación.
- **Inputs**: `open`, `organization`, `isSaving`, `saveError`.
- **Outputs**: `openChange`, `save` (`PlanType`) — el padre (`AdminViewComponent`) hace el `PUT` real y cierra el diálogo.
- **Dónde aparece**: `AdminViewComponent`.

### `AdminPagosPanelComponent` (`app-admin-pagos-panel`)
- **Archivo**: [`features/admin/components/admin-pagos-panel/admin-pagos-panel.component.ts`](../src/app/features/admin/components/admin-pagos-panel/admin-pagos-panel.component.ts)
- **Propósito**: contenido de la pestaña "Pagos" de `/admin`. Tabla cross-organización con plan, importe, período, vencimiento y estado de cobro; permite confirmar el pago de un período al recibir la transferencia (con `ConfirmDialogComponent` de por medio) y desplegar el historial de cada clínica on demand.
- **Inputs/Outputs**: ninguno — se autoabastece vía `AdminService`.
- **Dónde aparece**: `AdminViewComponent`, pestaña "Pagos".
- **Tests**: `admin-pagos-panel.component.spec.ts` (7 casos).

### `AdminOrganizationModulesDialogComponent` (`app-admin-organization-modules-dialog`)
- **Archivo**: [`features/admin/components/admin-organization-modules-dialog/admin-organization-modules-dialog.component.ts`](../src/app/features/admin/components/admin-organization-modules-dialog/admin-organization-modules-dialog.component.ts)
- **Propósito**: grilla de tarjetas de módulo (mismo `MODULE_OPTIONS`/mismo patrón visual que el selector de módulos de `ProfesionalDialogComponent`), pre-tildada desde `organization.modules` filtrado a `activo`. El submit emite el set completo de códigos seleccionados — **reemplazo total**, no incremental, coincide con la semántica de `PUT .../modules` del backend.
- **Inputs**: `open`, `organization`.
- **Outputs**: `openChange`, `save` (`string[]` de `moduleCodes`).
- **Dónde aparece**: `AdminViewComponent`.

### `AdminOrganizationUsersDialogComponent` (`app-admin-organization-users-dialog`)
- **Archivo**: [`features/admin/components/admin-organization-users-dialog/admin-organization-users-dialog.component.ts`](../src/app/features/admin/components/admin-organization-users-dialog/admin-organization-users-dialog.component.ts)
- **Propósito**: a diferencia de los otros dos diálogos (puramente presentacionales, emiten y dejan que el padre llame al backend), **este hace sus propias llamadas HTTP**: al abrirse carga los usuarios de la organización (`AdminService.listarUsuarios`), y cada fila tiene un `<select>` de rol (`ADMIN_ROLE_OPTIONS`: Dueño/Superadmin/Usuario) que hace `PUT` inmediato en `change`, y un botón de activar/desactivar que hace `PATCH` inmediato — ninguno de los dos con confirmación previa. Si el `PUT` de rol falla, revierte el `<select>` al valor anterior a mano. Sin guard del lado del cliente contra apuntarse a uno mismo — confía enteramente en `AdminGuard` del backend y muestra el mensaje de error que devuelva.
- **Inputs**: `open`, `organization`.
- **Outputs**: `openChange`.
- **Dónde aparece**: `AdminViewComponent`.

## Pendiente de completar por el desarrollador

- `PatientComboboxComponent` no tiene ningún consumidor en el código actual. Confirmar si debe eliminarse o si está pensado para un flujo futuro no implementado todavía.
