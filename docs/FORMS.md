# Formularios — OdontoLite (turnos-app)

Librería de formularios: `@angular/forms`, usada en **dos estilos** según el formulario:
- **Reactive Forms** (`FormBuilder`/`FormGroup`/`Validators`) para los formularios más complejos o con validación condicional: paciente, profesional, intermediario de coberturas.
- **Template-driven** (`FormsModule`, `[(ngModel)]`) para formularios simples o con lógica de pasos manual: login/registro, invitaciones, plantilla de WhatsApp, todas las ediciones inline (paneles de turnos, modal de pago).

Los validadores custom compartidos viven en [`shared/validators/custom-validators.ts`](../src/app/shared/validators/custom-validators.ts):

| Validador | Regex/regla | Uso |
|---|---|---|
| `documentNumberValidator()` | `/^[A-Za-z0-9]{5,20}$/` | Documento de identidad genérico LatAm (DNI/RUT/CURP/Cédula/etc., sin dígito verificador por país) |
| `phoneValidator()` | `/^[\d\s\-\(\)\+]{7,20}$/` | Teléfono |
| `personNameValidator()` | `/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ'\- ]+$/` | Nombre de persona (letras, espacios, guion, apóstrofe) |
| `nonNegativeMoneyValidators` | `[Validators.min(0)]` | Campos de dinero |

---

## Login

- **Componente**: `LoginComponent` — template-driven, `loginData: LoginRequest = { username, password }`.
- **Campos**: `username` (texto libre, acepta usuario o email), `password`.
- **Validación cliente**: solo "campos completos" (`if (!username || !password)`), sin regex.
- **Endpoint**: `POST /api/auth/login`.
- **Feedback**: `errorMessage` en un `alert-danger` + toast (`NotificationService.showError`) con el mensaje del backend si falla.

## Registro (wizard de 2 pasos)

- **Componente**: `LoginComponent` (mismo archivo, `isLoginMode = false`).
- **Paso 1 — Organización** (`registerStep === 'org'`):
  | Campo | Requerido | Validación |
  |---|---|---|
  | Modo (`selectedOrgMode`) | — | `'new'` (crear organización) o `'join'` (unirse por invitación) |
  | `organizacionNombre` | si modo `new` | no vacío (trim), máx. 120 caracteres (`maxlength`) |
  | `pais` | si modo `new` | select de `PAISES_LATAM` (`shared/constants/paises-latam.ts`), no vacío |
  | `invitationCode` | si modo `join` | no vacío (trim) |
- **Paso 2 — Cuenta** (`registerStep === 'account'`), validado manualmente en `onRegister()` (no usa `Validators` de Angular, arma un `fieldErrors: Record<string,string>`):
  | Campo | Requerido | Validación |
  |---|---|---|
  | `nombre` | sí | `PERSON_NAME_PATTERN` |
  | `apellido` | no | — |
  | `identificacion` | no | `DOCUMENT_NUMBER_PATTERN` si se completa |
  | `telefono` | no | `PHONE_PATTERN` si se completa |
  | `username` | sí | mínimo 3 caracteres |
  | `email` | sí | regex email local (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) |
  | `password` | sí | mínimo 6 caracteres |
  | `confirmPassword` | sí | debe coincidir con `password` |
- **Endpoint**: `POST /api/auth/register`. Body condicional: `{ organizacionNombre, pais }` (modo `new`, el usuario queda `OWNER`) **o** `{ invitationToken }` (modo `join`, hereda los módulos que le otorgó la invitación).
- **Feedback**: errores por campo debajo de cada input (`fieldErrors`), más `errorMessage` general y toast si falla el submit.

---

## Formulario de paciente (`patient-form` + `patient-wizard`)

- **Definición de controles**: función pura [`getPatientFormConfig(fb)`](../src/app/shared/components/patient-form/patient-form.config.ts), reutilizada por **tres** puntos de entrada:
  1. `AppointmentDialogComponent` (alta de turno con paciente nuevo o existente) — agrega además los campos de turno/pago.
  2. `PatientWizardPanelComponent` (alta/edición de paciente desde Seguimiento, sin campos de turno).
  3. Directamente por `PatientFormComponent`/`PatientWizardComponent` como shell reutilizable (5 pasos si incluye turno, 4 si no — ver [`patient-wizard.config.ts`](../src/app/shared/components/patient-wizard/patient-wizard.config.ts)).
- **Reactive Forms**, `FormGroup` armado con `getPatientFormConfig(fb)`.

### Paso 1 — Datos personales
| Campo | Validación |
|---|---|
| `nombre` | requerido |
| `apellido` | requerido |
| `fechaNacimiento` | opcional (formato `YYYY-MM-DD`); dispara cálculo automático de `edad` (deshabilitado, solo lectura, calculado en `PatientFormComponent.setupFormLogic()` con tope de 150 años y rechazo de fechas futuras) |
| `identificacion` | requerido + `documentNumberValidator()` |
| `telefono` | requerido + `phoneValidator()` |
| `email` | requerido + `Validators.email` |
| `domicilio` | requerido |
| `localidad` | requerido |
| `contactoEmergencia` | opcional |

### Paso 2 — Antecedentes médicos (todos opcionales)
`enfermedades`, `alergias`, `medicacion`, `cirugias`, `embarazo`, `marcapasos`, `consumos`, `otrosAntecedentes` (`Validators.maxLength(300)`). Estos 8 campos **no se envían como columnas del paciente**: en `submitFormData()`/`savePatient()` se serializan a un único string JSON en `Patient.anamnesis`.

### Paso 3 — Cobertura
| Campo | Validación |
|---|---|
| `coberturaNombre` | requerido; buscador con autocompletado contra `GET /api/coberturas` (filtrado por país de la organización) + opción fija `"Particular"` (`COBERTURA_PARTICULAR`) |
| `coberturaId` | vínculo opcional al catálogo (`Cobertura.id`); vacío si el usuario escribió un nombre libre no listado |
| `planCategoria`, `coberturaNumero`, `coberturaVencimiento` | opcionales |
| `esTitular` | `'si'` \| `'no'` (radio/select) |
| `nombreTitular`, `identificacionTitular`, `parentesco` | **requeridos solo si** `esTitular === 'no'` **y** `coberturaNombre !== 'Particular'` (validadores agregados/quitados dinámicamente en `updateTitularValidators()`); `identificacionTitular` además valida `documentNumberValidator()` siempre (aunque no sea requerido) |
- Efecto secundario: elegir `"Particular"` limpia `coberturaId`/`planCategoria`/`coberturaNumero`/`coberturaVencimiento`/datos de titular y fuerza `esTitular = 'si'`.

### Paso 4 — Turno y pago (solo si `includeAppointmentStep = true`, es decir solo desde `AppointmentDialogComponent`)
| Campo | Validación |
|---|---|
| `profesionalId` | opcional |
| `hora` | opcional, formato `HH:mm`; dispara verificación de disponibilidad contra `GET /api/appointments/check-availability` con `debounceTime(300)` mientras el usuario escribe, y de nuevo al enviar |
| `observacionesTurno` | opcional |
| `precioBono`, `precioTratamiento`, `extras`, `montoPago` | `Validators.min(0)` |
| `observaciones` | opcional |

### Paso 5 — Revisión final
Solo lectura: resume todos los campos anteriores (`PATIENT_WIZARD_REVIEW_GROUPS`) antes de confirmar.

### Envío
- **Desde Turnos** (`AppointmentDialogComponent.onSubmit()`): valida el `FormGroup`, re-verifica disponibilidad de horario si hay profesional+hora, y emite `submitForm` con `{ patientData, appointmentData }`. `TurnosViewComponent.onCreateAppointment()` decide: si `patientData.id` no existe → `POST /api/patients` primero, luego `POST /api/appointments` con el `patientId` obtenido; si ya existe → `POST /api/appointments` directo.
- **Desde Seguimiento** (`PatientWizardPanelComponent.savePatient()`): `POST /api/patients` (alta) o `PATCH /api/patients/{id}` (edición), según si `selectedPatientForForm.id` existe.
- Antes de validar, ambos hacen `trim()` de los campos de texto obligatorios (nombre, apellido, identificación, teléfono, email, domicilio, localidad).

---

## Formulario de profesional (`ProfesionalDialogComponent`)

Reactive Forms, `FormGroup` propio (`buildForm()`):

| Campo | Validación |
|---|---|
| `nombre` | requerido |
| `apellido` | requerido |
| `identificacion` | `documentNumberValidator()` (opcional) |
| `especialidad` | opcional |
| `matricula` | opcional |
| `email` | `Validators.email` (opcional) |
| `telefono` | `phoneValidator()` (opcional) |
| `crearAcceso` (checkbox) | solo visible/aplicable si `isOwner && !isEditing` (`canCreateAccess`) |
| `username` | requerido **solo si** `crearAcceso` está tildado |
| `password` | requerido + mínimo 6 caracteres **solo si** `crearAcceso` está tildado; incluye medidor de fortaleza visual (`passwordStrength()`, 4 niveles según longitud/mayúsculas+números/símbolos) |
| `moduleCodes` (no es `FormControl`, es un array de clase aparte, `string[]`) | si `crearAcceso` (alta) o `canEditModules` (edición de un profesional que ya tiene usuario vinculado y el actor es `OWNER`), debe tener al menos 1 módulo seleccionado (validado a mano en `handleSubmit()`, no por Angular Validators) |

- **Endpoint**: `POST /api/profesionales` (alta) o `PATCH /api/profesionales/{id}` (edición), disparado por `ProfesionalesPanelComponent.onSaveProfesional()`.
- El campo `activo` no es editable desde este formulario: se preserva el valor existente al editar, o se fuerza `true` al crear; el toggle activo/inactivo tiene su propio botón fuera del formulario (`PATCH /api/profesionales/{id}/toggle-active`).

## Formulario de invitación (`InvitationDialogComponent`)

Template-driven (campos sueltos, no `FormGroup`):

| Campo | Validación |
|---|---|
| `moduleCodes` (checkboxes múltiples sobre `MODULE_OPTIONS`) | al menos 1 seleccionado (`createError` si no) |
| `expiresInDays` | opcional (número) |

- **Endpoint**: `POST /api/invitations`. El token generado (`OrganizationInvitation.token`) solo viene poblado en la respuesta de creación — no se puede recuperar después, por eso hay un botón "copiar" (`navigator.clipboard.writeText`).
- Revocar: `DELETE /api/invitations/{id}`.

## Formulario de intermediario/agrupación (`CoberturasViewComponent`)

Reactive Forms:

| Campo | Validación |
|---|---|
| `nombre` | requerido, `Validators.minLength(2)` |
| `pais` | requerido (select `PAISES_LATAM`) |
| `telefono`, `web`, `notas` | opcionales |
| `coberturaIds` (`string[]`) | multi-selección por checkbox de las coberturas del país elegido |

- **Endpoint**: `POST /api/intermediarios` (alta) o `PUT /api/intermediarios/{id}` (edición), vía `guardarIntermediario()`.

## Plantilla de mensaje de WhatsApp (`ConfiguracionesViewComponent`)

- Template-driven: un único `<textarea [(ngModel)]="whatsappTemplate">`, límite de `1024` caracteres (medido sobre el mensaje **ya interpolado** con datos de ejemplo, no sobre la plantilla cruda con los tokens `{...}` literales).
- No hay validación de formato — cualquier texto es válido, incluidos los tokens `{paciente}`, `{fecha}`, `{hora}`, `{profesional}` (y el alias legado `{doctor}`, ver `ConfigurationService.buildMessage()`).
- **Endpoint**: `PUT /api/configuration` con `{ mensajeWhatsapp }` (trim aplicado en el servicio antes de enviar).

## Ediciones inline de pago/turno (`AppointmentsPanelComponent`, `TurnPaymentModalComponent`)

No usan `FormGroup`: son campos sueltos por tarjeta/turno (`number`/`string`), con validación mínima manual (`monto <= 0` bloquea el submit, `newValue < 0` bloquea el guardado de precio). Cada campo editable (hora, profesional, precio de bono/tratamiento/extras, observaciones de pago, observaciones del turno) tiene su propio ciclo abrir edición → guardar/cancelar, y llama a `AppointmentsService.updateWithFeedback()`/`addPaymentWithFeedback()` → `PATCH /api/appointments/{id}` o `/addPayment`.

## Pendiente de completar por el desarrollador

- No hay validación de formato específico por país para `identificacion`/`telefono` (la regex es genérica LatAm); si se necesita dígito verificador por país (CUIT/RUT/CURP, etc.) no está implementado en el frontend.
- No se determinó un límite máximo de tamaño para los campos de texto libre de antecedentes médicos (`enfermedades`, `alergias`, etc.) — solo `otrosAntecedentes` tiene `maxLength(300)`.
