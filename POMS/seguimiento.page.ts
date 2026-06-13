import { Page, Locator } from '@playwright/test';

export class SeguimientoPage {
  readonly page: Page;

  // ── PÁGINA ─────────────────────────────────────────────────────
  readonly trackingPage: Locator;
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;

  // ── NAVBAR ─────────────────────────────────────────────────────
  readonly navbar: Locator;
  readonly navPanel: Locator;
  readonly navTurnos: Locator;
  readonly navOdontograma: Locator;
  readonly navSeguimiento: Locator;
  readonly navConfiguraciones: Locator;
  readonly navLogoutBtn: Locator;

  // ── BÚSQUEDA Y LISTA ───────────────────────────────────────────
  readonly searchInput: Locator;
  readonly noResults: Locator;
  readonly patientsList: Locator;

  // ── PANEL FORMULARIO PACIENTE ──────────────────────────────────
  readonly patientFormPanel: Locator;
  readonly formTitle: Locator;
  readonly formSubtitle: Locator;
  readonly sectionPersonalTitle: Locator;
  readonly sectionMedicalTitle: Locator;
  readonly sectionCoverageTitle: Locator;
  readonly patientClearBtn: Locator;
  readonly patientSaveBtn: Locator;
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

  // ── MODAL TURNO ────────────────────────────────────────────────
  readonly turnModal: Locator;
  readonly turnModalTitle: Locator;
  readonly turnModalPatientName: Locator;
  readonly turnModalDate: Locator;
  readonly turnBonoRow: Locator;
  readonly turnTreatmentRow: Locator;
  readonly turnExtrasRow: Locator;
  readonly turnBonoValue: Locator;
  readonly turnTreatmentValue: Locator;
  readonly turnExtrasValue: Locator;
  readonly turnPaidValue: Locator;
  readonly turnTotalValue: Locator;
  readonly turnPendingBalance: Locator;
  readonly turnPaymentInput: Locator;
  readonly turnAddPaymentBtn: Locator;
  readonly turnFullPaymentLabel: Locator;
  readonly turnFullPaymentCheckbox: Locator;
  readonly turnEditBonoBtn: Locator;
  readonly turnEditTreatmentBtn: Locator;
  readonly turnEditExtrasBtn: Locator;
  readonly turnEditPaymentObsBtn: Locator;
  readonly turnEditTurnObsBtn: Locator;
  readonly turnPaymentObsText: Locator;
  readonly turnTurnObsText: Locator;
  readonly turnWhatsappBtn: Locator;
  readonly turnWhatsappDisabledBtn: Locator;
  readonly turnCloseBtn: Locator;
  readonly turnDismissBtn: Locator;

  // ── TOAST ─────────────────────────────────────────────────────
  readonly toastContainer: Locator;
  readonly toastMessage: Locator;
  readonly toastCloseBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    const formPanel = page.getByTestId('tracking-patient-form-panel');

    // Página
    this.trackingPage = page.getByTestId('tracking-page');
    this.pageTitle = page.getByTestId('tracking-page-title');
    this.pageSubtitle = page.getByTestId('tracking-page-subtitle');

    // Navbar
    this.navbar = page.getByTestId('navbar');
    this.navPanel = page.getByTestId('navbar-tab-panel');
    this.navTurnos = page.getByTestId('navbar-tab-turnos');
    this.navOdontograma = page.getByTestId('navbar-tab-odontograma');
    this.navSeguimiento = page.getByTestId('navbar-tab-seguimiento');
    this.navConfiguraciones = page.getByTestId('navbar-tab-configuraciones');
    this.navLogoutBtn = page.getByTestId('navbar-logout-btn');

    // Búsqueda y lista
    this.searchInput = page.getByTestId('tracking-search-input');
    this.noResults = page.getByTestId('tracking-no-results');
    this.patientsList = page.getByTestId('tracking-patients-list');

    // Panel formulario (scoped al panel derecho)
    this.patientFormPanel = formPanel;
    this.formTitle = page.getByTestId('tracking-form-title');
    this.formSubtitle = page.getByTestId('tracking-form-subtitle');
    this.sectionPersonalTitle = formPanel.getByTestId('tracking-section-personal-title');
    this.sectionMedicalTitle = formPanel.getByTestId('tracking-section-medical-title');
    this.sectionCoverageTitle = formPanel.getByTestId('tracking-section-coverage-title');
    this.patientClearBtn = page.getByTestId('tracking-patient-clear-btn');
    this.patientSaveBtn = page.getByTestId('tracking-patient-save-btn');
    this.patientNameInput = formPanel.getByTestId('patient-name-input');
    this.patientBirthdateInput = formPanel.getByTestId('patient-birthdate-input');
    this.patientAgeInput = formPanel.getByTestId('patient-age-input');
    this.patientDniInput = formPanel.getByTestId('patient-dni-input');
    this.patientPhoneInput = formPanel.getByTestId('patient-phone-input');
    this.patientEmailInput = formPanel.getByTestId('patient-email-input');
    this.patientAddressInput = formPanel.getByTestId('patient-address-input');
    this.patientCityInput = formPanel.getByTestId('patient-city-input');
    this.patientEmergencyContactInput = formPanel.getByTestId('patient-emergency-contact-input');
    this.patientDiseasesInput = formPanel.getByTestId('patient-diseases-input');
    this.patientAllergiesInput = formPanel.getByTestId('patient-allergies-input');
    this.patientMedicationInput = formPanel.getByTestId('patient-medication-input');
    this.patientSurgeriesInput = formPanel.getByTestId('patient-surgeries-input');
    this.patientPregnancyInput = formPanel.getByTestId('patient-pregnancy-input');
    this.patientPacemakerInput = formPanel.getByTestId('patient-pacemaker-input');
    this.patientSubstancesInput = formPanel.getByTestId('patient-substances-input');
    this.patientInsuranceSelect = formPanel.getByTestId('patient-insurance-select');
    this.patientPlanInput = formPanel.getByTestId('patient-plan-input');
    this.patientAffiliateInput = formPanel.getByTestId('patient-affiliate-number-input');
    this.patientInsuranceExpiryInput = formPanel.getByTestId('patient-insurance-expiry-input');
    this.patientTitularSelect = formPanel.getByTestId('patient-titular-select');

    // Modal turno
    this.turnModal = page.getByTestId('tracking-turn-modal');
    this.turnModalTitle = page.getByTestId('tracking-turn-modal-title');
    this.turnModalPatientName = page.getByTestId('tracking-turn-modal-patient-name');
    this.turnModalDate = page.getByTestId('tracking-turn-modal-date');
    this.turnBonoRow = page.getByTestId('tracking-turn-bono-row');
    this.turnTreatmentRow = page.getByTestId('tracking-turn-treatment-row');
    this.turnExtrasRow = page.getByTestId('tracking-turn-extras-row');
    this.turnBonoValue = page.getByTestId('tracking-turn-bono-value');
    this.turnTreatmentValue = page.getByTestId('tracking-turn-treatment-value');
    this.turnExtrasValue = page.getByTestId('tracking-turn-extras-value');
    this.turnPaidValue = page.getByTestId('tracking-turn-paid-value');
    this.turnTotalValue = page.getByTestId('tracking-turn-total-value');
    this.turnPendingBalance = page.getByTestId('tracking-turn-pending-balance');
    this.turnPaymentInput = page.getByTestId('tracking-turn-payment-input');
    this.turnAddPaymentBtn = page.getByTestId('tracking-turn-add-payment-btn');
    this.turnFullPaymentLabel = page.getByTestId('tracking-turn-full-payment-label');
    this.turnFullPaymentCheckbox = page.getByTestId('tracking-turn-full-payment-checkbox');
    this.turnEditBonoBtn = page.getByTestId('tracking-turn-edit-bono-btn');
    this.turnEditTreatmentBtn = page.getByTestId('tracking-turn-edit-treatment-btn');
    this.turnEditExtrasBtn = page.getByTestId('tracking-turn-edit-extras-btn');
    this.turnEditPaymentObsBtn = page.getByTestId('tracking-turn-edit-payment-obs-btn');
    this.turnEditTurnObsBtn = page.getByTestId('tracking-turn-edit-turn-obs-btn');
    this.turnPaymentObsText = page.getByTestId('tracking-turn-payment-obs-text');
    this.turnTurnObsText = page.getByTestId('tracking-turn-turn-obs-text');
    this.turnWhatsappBtn = page.getByTestId('tracking-turn-whatsapp-btn');
    this.turnWhatsappDisabledBtn = page.getByTestId('tracking-turn-whatsapp-disabled-btn');
    this.turnCloseBtn = page.getByTestId('tracking-turn-close-btn');
    this.turnDismissBtn = page.getByTestId('tracking-turn-dismiss-btn');

    // Toast
    this.toastContainer = page.getByTestId('toast-container');
    this.toastMessage = page.getByTestId('toast-message');
    this.toastCloseBtn = page.getByTestId('toast-close-btn');
  }

  // ── Navegación ──────────────────────────────────────────────────
  async goto() {
    await this.page.goto('/seguimiento');
  }

  // ── Búsqueda ──────────────────────────────────────────────────────
  async searchByText(text: string) {
    await this.searchInput.fill(text);
  }

  async clearSearch() {
    await this.searchInput.clear();
  }

  // ── Cards de paciente ({id} = DNI) ───────────────────────────────
  patientCard(dni: string): Locator {
    return this.page.getByTestId(`tracking-patient-card-${dni}`);
  }

  patientName(dni: string): Locator {
    return this.page.getByTestId(`tracking-patient-name-${dni}`);
  }

  patientDebt(dni: string): Locator {
    return this.page.getByTestId(`tracking-patient-debt-${dni}`);
  }

  patientDniDisplay(dni: string): Locator {
    return this.page.getByTestId(`tracking-patient-dni-display-${dni}`);
  }

  patientInsuranceDisplay(dni: string): Locator {
    return this.page.getByTestId(`tracking-patient-insurance-display-${dni}`);
  }

  patientHistoryLabel(dni: string): Locator {
    return this.page.getByTestId(`tracking-patient-history-label-${dni}`);
  }

  patientAppointmentsList(dni: string): Locator {
    return this.page.getByTestId(`tracking-patient-appointments-${dni}`);
  }

  patientEditBtn(dni: string): Locator {
    return this.page.getByTestId(`tracking-patient-edit-btn-${dni}`);
  }

  async editPatient(dni: string) {
    await this.patientEditBtn(dni).click();
  }

  // ── Badges de turno ({id} = appointment id) ───────────────────────
  appointmentItem(id: number): Locator {
    return this.page.getByTestId(`tracking-appointment-item-${id}`);
  }

  appointmentDate(id: number): Locator {
    return this.page.getByTestId(`tracking-appointment-date-${id}`);
  }

  appointmentAmount(id: number): Locator {
    return this.page.getByTestId(`tracking-appointment-amount-${id}`);
  }

  async openTurnModal(id: number) {
    await this.appointmentItem(id).click();
    await this.turnModal.waitFor({ state: 'visible' });
  }

  async closeTurnModal() {
    await this.turnDismissBtn.click();
    await this.turnModal.waitFor({ state: 'hidden' });
  }

  // ── Formulario paciente ───────────────────────────────────────────
  async clearPatientForm() {
    await this.patientClearBtn.click();
  }

  async savePatient() {
    await this.patientSaveBtn.click();
  }

  async fillPatientMinimal(data: {
    name: string;
    dni: string;
    phone: string;
    email: string;
    address: string;
    city: string;
  }) {
    await this.patientNameInput.fill(data.name);
    await this.patientDniInput.fill(data.dni);
    await this.patientPhoneInput.fill(data.phone);
    await this.patientEmailInput.fill(data.email);
    await this.patientAddressInput.fill(data.address);
    await this.patientCityInput.fill(data.city);
  }

  // ── Modal — acciones de pago ─────────────────────────────────────
  async addTurnPayment(amount: number) {
    await this.turnPaymentInput.fill(String(amount));
    await this.turnAddPaymentBtn.click();
  }

  async markFullPayment() {
    await this.turnFullPaymentCheckbox.check();
  }

  async editBono() {
    await this.turnEditBonoBtn.click();
  }

  async editTreatment() {
    await this.turnEditTreatmentBtn.click();
  }

  async editExtras() {
    await this.turnEditExtrasBtn.click();
  }

  async editPaymentObservations() {
    await this.turnEditPaymentObsBtn.click();
  }

  async editTurnObservations() {
    await this.turnEditTurnObsBtn.click();
  }

  // ── Toast ─────────────────────────────────────────────────────────
  async waitForToast() {
    await this.toastMessage.waitFor({ state: 'visible' });
  }

  async waitForToastToDisappear() {
    await this.toastMessage.waitFor({ state: 'hidden' });
  }

  async getToastText(): Promise<string> {
    return (await this.page.getByTestId('toast-body').textContent() ?? '').trim();
  }

  async closeToast() {
    await this.toastCloseBtn.click();
  }
}
