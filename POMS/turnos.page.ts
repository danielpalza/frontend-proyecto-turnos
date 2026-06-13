import { Page, Locator } from '@playwright/test';

export class TurnosPage {
  readonly page: Page;

  // ── PÁGINA ─────────────────────────────────────────────────────
  readonly turnosPage: Locator;
  readonly turnosLoading: Locator;
  readonly turnosError: Locator;

  // ── NAVBAR ─────────────────────────────────────────────────────
  readonly navbar: Locator;
  readonly navPanel: Locator;
  readonly navTurnos: Locator;
  readonly navOdontograma: Locator;
  readonly navSeguimiento: Locator;
  readonly navConfiguraciones: Locator;
  readonly navLogoutBtn: Locator;

  // ── CALENDARIO ─────────────────────────────────────────────────
  readonly calendarSection: Locator;
  readonly searchPendingCheckbox: Locator;
  readonly searchInput: Locator;
  readonly todayBtn: Locator;
  readonly prevMonthBtn: Locator;
  readonly monthLabel: Locator;
  readonly nextMonthBtn: Locator;

  // ── PANEL DE TURNOS (derecha) ──────────────────────────────────
  readonly panelSection: Locator;
  readonly appointmentsPanel: Locator;
  readonly appointmentsNoDaySelected: Locator;
  readonly appointmentsSelectedState: Locator;
  readonly appointmentsNoTurns: Locator;
  readonly appointmentsList: Locator;
  readonly appointmentsHeader: Locator;
  readonly appointmentsDateIcon: Locator;
  readonly appointmentAddBtn: Locator;
  readonly dayCountBadge: Locator;

  // ── TOAST ─────────────────────────────────────────────────────
  readonly toastContainer: Locator;
  readonly toastMessage: Locator;
  readonly toastCloseBtn: Locator;

  // ── DIALOG "NUEVA CITA" ────────────────────────────────────────
  readonly appointmentDialog: Locator;
  readonly appointmentDialogCloseBtn: Locator;
  readonly appointmentForm: Locator;
  readonly patientSearchInput: Locator;
  readonly patientSelectedAlert: Locator;
  // Datos personales
  readonly patientNameInput: Locator;
  readonly patientBirthdateInput: Locator;
  readonly patientAgeInput: Locator;
  readonly patientDniInput: Locator;
  readonly patientPhoneInput: Locator;
  readonly patientEmailInput: Locator;
  readonly patientAddressInput: Locator;
  readonly patientCityInput: Locator;
  readonly patientEmergencyContactInput: Locator;
  // Antecedentes médicos
  readonly patientDiseasesInput: Locator;
  readonly patientAllergiesInput: Locator;
  readonly patientMedicationInput: Locator;
  readonly patientSurgeriesInput: Locator;
  readonly patientPregnancyInput: Locator;
  readonly patientPacemakerInput: Locator;
  readonly patientSubstancesInput: Locator;
  // Cobertura
  readonly patientInsuranceSelect: Locator;
  readonly patientPlanInput: Locator;
  readonly patientAffiliateInput: Locator;
  readonly patientInsuranceExpiryInput: Locator;
  readonly patientTitularSelect: Locator;
  // Datos del turno
  readonly patientProfesionalSelect: Locator;
  readonly patientTimeInput: Locator;
  readonly patientAppointmentNotesInput: Locator;
  // Detalles de pago
  readonly patientBonoInput: Locator;
  readonly patientTreatmentInput: Locator;
  readonly patientExtrasInput: Locator;
  readonly patientPaymentInput: Locator;
  readonly patientBalanceDisplay: Locator;
  readonly patientPaymentNotesInput: Locator;
  // Botones dialog
  readonly appointmentCancelBtn: Locator;
  readonly appointmentSaveBtn: Locator;

  // ── DIALOG "CONFIRMAR ELIMINACIÓN" ────────────────────────────
  readonly confirmDialog: Locator;
  readonly confirmDialogTitle: Locator;
  readonly confirmDialogDetail: Locator;
  readonly confirmDialogCloseBtn: Locator;
  readonly confirmDialogCancelBtn: Locator;
  readonly confirmDialogConfirmBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // Página
    this.turnosPage = page.getByTestId('turnos-page');
    this.turnosLoading = page.getByTestId('turnos-loading');
    this.turnosError = page.getByTestId('turnos-error');

    // Navbar
    this.navbar = page.getByTestId('navbar');
    this.navPanel = page.getByTestId('navbar-tab-panel');
    this.navTurnos = page.getByTestId('navbar-tab-turnos');
    this.navOdontograma = page.getByTestId('navbar-tab-odontograma');
    this.navSeguimiento = page.getByTestId('navbar-tab-seguimiento');
    this.navConfiguraciones = page.getByTestId('navbar-tab-configuraciones');
    this.navLogoutBtn = page.getByTestId('navbar-logout-btn');

    // Calendario
    this.calendarSection = page.getByTestId('calendar-panel');
    this.searchPendingCheckbox = page.getByTestId('search-pending-checkbox');
    this.searchInput = page.getByTestId('calendar-panel').getByTestId('search-input');
    this.todayBtn = page.getByTestId('calendar-today-btn');
    this.prevMonthBtn = page.getByTestId('calendar-prev-month-btn');
    this.monthLabel = page.getByTestId('calendar-month-label');
    this.nextMonthBtn = page.getByTestId('calendar-next-month-btn');

    // Panel
    this.panelSection = page.getByTestId('turnos-panel-section');
    this.appointmentsPanel = page.getByTestId('appointments-panel');
    this.appointmentsNoDaySelected = page.getByTestId('appointments-empty-state');
    this.appointmentsSelectedState = page.getByTestId('appointments-selected-state');
    this.appointmentsNoTurns = page.getByTestId('appointments-no-turns');
    this.appointmentsList = page.getByTestId('appointments-list');
    this.appointmentsHeader = page.getByTestId('appointments-header');
    this.appointmentsDateIcon = page.getByTestId('appointments-date-icon');
    this.appointmentAddBtn = page.getByTestId('appointment-add-btn');
    this.dayCountBadge = page.getByTestId('appointments-day-count');

    // Toast
    this.toastContainer = page.getByTestId('toast-container');
    this.toastMessage = page.getByTestId('toast-message');
    this.toastCloseBtn = page.getByTestId('toast-close-btn');

    // Dialog Nueva Cita
    this.appointmentDialog = page.getByTestId('appointment-dialog');
    this.appointmentDialogCloseBtn = page.getByTestId('appointment-close-btn');
    this.appointmentForm = page.getByTestId('appointment-form');
    this.patientSearchInput = page.getByTestId('patient-search-section').getByTestId('search-input');
    this.patientSelectedAlert = page.getByTestId('patient-selected-alert');
    this.patientNameInput = page.getByTestId('patient-name-input');
    this.patientBirthdateInput = page.getByTestId('patient-birthdate-input');
    this.patientAgeInput = page.getByTestId('patient-age-input');
    this.patientDniInput = page.getByTestId('patient-dni-input');
    this.patientPhoneInput = page.getByTestId('patient-phone-input');
    this.patientEmailInput = page.getByTestId('patient-email-input');
    this.patientAddressInput = page.getByTestId('patient-address-input');
    this.patientCityInput = page.getByTestId('patient-city-input');
    this.patientEmergencyContactInput = page.getByTestId('patient-emergency-contact-input');
    this.patientDiseasesInput = page.getByTestId('patient-diseases-input');
    this.patientAllergiesInput = page.getByTestId('patient-allergies-input');
    this.patientMedicationInput = page.getByTestId('patient-medication-input');
    this.patientSurgeriesInput = page.getByTestId('patient-surgeries-input');
    this.patientPregnancyInput = page.getByTestId('patient-pregnancy-input');
    this.patientPacemakerInput = page.getByTestId('patient-pacemaker-input');
    this.patientSubstancesInput = page.getByTestId('patient-substances-input');
    this.patientInsuranceSelect = page.getByTestId('patient-insurance-select');
    this.patientPlanInput = page.getByTestId('patient-plan-input');
    this.patientAffiliateInput = page.getByTestId('patient-affiliate-number-input');
    this.patientInsuranceExpiryInput = page.getByTestId('patient-insurance-expiry-input');
    this.patientTitularSelect = page.getByTestId('patient-titular-select');
    this.patientProfesionalSelect = page.getByTestId('patient-profesional-select');
    this.patientTimeInput = page.getByTestId('patient-time-input');
    this.patientAppointmentNotesInput = page.getByTestId('patient-appointment-notes-input');
    this.patientBonoInput = page.getByTestId('patient-bono-input');
    this.patientTreatmentInput = page.getByTestId('patient-treatment-input');
    this.patientExtrasInput = page.getByTestId('patient-extras-input');
    this.patientPaymentInput = page.getByTestId('patient-payment-input');
    this.patientBalanceDisplay = page.getByTestId('patient-balance-display');
    this.patientPaymentNotesInput = page.getByTestId('patient-payment-notes-input');
    this.appointmentCancelBtn = page.getByTestId('appointment-cancel-btn');
    this.appointmentSaveBtn = page.getByTestId('appointment-save-btn');

    // Confirm dialog
    this.confirmDialog = page.getByTestId('confirm-dialog');
    this.confirmDialogTitle = page.getByTestId('confirm-dialog-title');
    this.confirmDialogDetail = page.getByTestId('confirm-dialog-detail');
    this.confirmDialogCloseBtn = page.getByTestId('confirm-dialog-close-btn');
    this.confirmDialogCancelBtn = page.getByTestId('confirm-dialog-cancel-btn');
    this.confirmDialogConfirmBtn = page.getByTestId('confirm-dialog-confirm-btn');
  }

  // ── Navegación ──────────────────────────────────────────────────
  async goto() {
    await this.page.goto('/turnos');
  }

  // ── Calendario ──────────────────────────────────────────────────
  calendarDay(date: string): Locator {
    return this.page.getByTestId(`calendar-day-${date}`);
  }

  calendarDayBadge(date: string): Locator {
    return this.page.getByTestId(`calendar-day-badge-${date}`);
  }

  calendarTodayBadge(): Locator {
    return this.page.getByTestId('calendar-today-badge');
  }

  async clickDay(date: string) {
    await this.calendarDay(date).click();
  }

  async goToNextMonth() {
    await this.nextMonthBtn.click();
  }

  async goToPrevMonth() {
    await this.prevMonthBtn.click();
  }

  async goToToday() {
    await this.todayBtn.click();
  }

  async searchByText(text: string) {
    await this.searchInput.fill(text);
  }

  async togglePendingFilter() {
    await this.searchPendingCheckbox.click();
  }

  // ── Appointment Card ────────────────────────────────────────────
  appointmentItem(id: number): Locator {
    return this.page.getByTestId(`appointment-item-${id}`);
  }

  appointmentHeader(id: number): Locator {
    return this.page.getByTestId(`appointment-item-header-${id}`);
  }

  appointmentPatientName(id: number): Locator {
    return this.page.getByTestId(`appointment-patient-name-${id}`);
  }

  appointmentProfessional(id: number): Locator {
    return this.page.getByTestId(`appointment-professional-${id}`);
  }

  appointmentTime(id: number): Locator {
    return this.page.getByTestId(`appointment-time-${id}`);
  }

  appointmentStatusBadge(id: number): Locator {
    return this.page.getByTestId(`appointment-status-badge-${id}`);
  }

  appointmentExpandBtn(id: number): Locator {
    return this.page.getByTestId(`appointment-expand-btn-${id}`);
  }

  appointmentStartBtn(id: number): Locator {
    return this.page.getByTestId(`appointment-start-btn-${id}`);
  }

  appointmentDeleteBtn(id: number): Locator {
    return this.page.getByTestId(`appointment-delete-btn-${id}`);
  }

  appointmentPaymentInput(id: number): Locator {
    return this.page.getByTestId(`appointment-payment-input-${id}`);
  }

  appointmentAddPaymentBtn(id: number): Locator {
    return this.page.getByTestId(`appointment-add-payment-btn-${id}`);
  }

  appointmentPatientDni(id: number): Locator {
    return this.page.getByTestId(`appointment-patient-dni-${id}`);
  }

  appointmentPaymentPending(id: number): Locator {
    return this.page.getByTestId(`appointment-payment-pending-${id}`);
  }

  appointmentFullPaymentCheckbox(id: number): Locator {
    return this.page.getByTestId(`appointment-full-payment-checkbox-${id}`);
  }

  appointmentFullPaymentLabel(id: number): Locator {
    return this.page.getByTestId(`appointment-full-payment-label-${id}`);
  }

  appointmentEditProfessional(id: number): Locator {
    return this.page.getByTestId(`appointment-edit-professional-${id}`);
  }

  appointmentEditTime(id: number): Locator {
    return this.page.getByTestId(`appointment-edit-time-${id}`);
  }

  appointmentEditBono(id: number): Locator {
    return this.page.getByTestId(`appointment-edit-bono-${id}`);
  }

  appointmentEditTreatment(id: number): Locator {
    return this.page.getByTestId(`appointment-edit-treatment-${id}`);
  }

  appointmentEditExtras(id: number): Locator {
    return this.page.getByTestId(`appointment-edit-extras-${id}`);
  }

  appointmentEditPaymentObs(id: number): Locator {
    return this.page.getByTestId(`appointment-edit-payment-obs-${id}`);
  }

  appointmentEditTurnObs(id: number): Locator {
    return this.page.getByTestId(`appointment-edit-turn-obs-${id}`);
  }

  async expandAppointment(id: number) {
    await this.appointmentExpandBtn(id).click();
    await this.appointmentPatientDni(id).waitFor({ state: 'visible' });
  }

  async startAppointment(id: number) {
    await this.appointmentStartBtn(id).click();
  }

  async deleteAppointment(id: number) {
    await this.appointmentDeleteBtn(id).click();
  }

  // ── Dialog Nueva Cita ───────────────────────────────────────────
  async openNewAppointmentDialog() {
    await this.appointmentAddBtn.click();
    await this.appointmentDialog.waitFor({ state: 'visible' });
  }

  async closeAppointmentDialog() {
    await this.appointmentDialogCloseBtn.click();
    await this.appointmentDialog.waitFor({ state: 'hidden' });
  }

  async fillNewAppointmentMinimal(data: {
    name: string;
    dni: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    time: string;
  }) {
    await this.patientNameInput.fill(data.name);
    await this.patientDniInput.fill(data.dni);
    await this.patientPhoneInput.fill(data.phone);
    await this.patientEmailInput.fill(data.email);
    await this.patientAddressInput.fill(data.address);
    await this.patientCityInput.fill(data.city);
    await this.patientTimeInput.fill(data.time);
  }

  async saveAppointment() {
    await this.appointmentSaveBtn.click();
  }

  // ── Confirm Dialog ──────────────────────────────────────────────
  async waitForConfirmDialog() {
    await this.confirmDialog.waitFor({ state: 'visible' });
  }

  async confirmDelete() {
    await this.confirmDialogConfirmBtn.click();
  }

  async cancelDelete() {
    await this.confirmDialogCancelBtn.click();
  }

  // ── Toast ───────────────────────────────────────────────────────
  async waitForToast() {
    await this.toastMessage.waitFor({ state: 'visible' });
  }

  async getToastText(): Promise<string> {
    return (await this.page.getByTestId('toast-body').textContent() ?? '').trim();
  }

  async closeToast() {
    await this.toastCloseBtn.click();
  }
}
