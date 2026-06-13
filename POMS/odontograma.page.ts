import { Page, Locator } from '@playwright/test';

export type ToothFace = 'centro' | 'interior' | 'derecho' | 'inferior' | 'izquierdo';
export type MobilityValue = 'M0' | 'M1' | 'M2' | 'M3';
export type FurcationValue = 'F0' | 'F1' | 'F2' | 'F3';

export class OdontogramaPage {
  readonly page: Page;

  // ── PÁGINA ─────────────────────────────────────────────────────
  readonly odontogramPage: Locator;
  readonly odontogramLoading: Locator;
  readonly odontogramError: Locator;

  // ── NAVBAR ─────────────────────────────────────────────────────
  readonly navbar: Locator;
  readonly navPanel: Locator;
  readonly navTurnos: Locator;
  readonly navOdontograma: Locator;
  readonly navSeguimiento: Locator;
  readonly navConfiguraciones: Locator;
  readonly navLogoutBtn: Locator;

  // ── TABS ───────────────────────────────────────────────────────
  readonly odontogramTabBtn: Locator;
  readonly periodontogramTabBtn: Locator;

  // ── ODONTOGRAMA ────────────────────────────────────────────────
  readonly odontogramFormPanel: Locator;
  readonly odontogramBottomLegend: Locator;
  readonly legendPanel: Locator;
  readonly legendToggleBtn: Locator;
  readonly mobilitySelect: Locator;
  readonly furcationSelect: Locator;

  /** 0–8: Ausencia, Implante, Corona, Puente, Eripción, Retención, Erupción, Impactado, Extraer */
  readonly estadoCheckboxes: Locator[];

  /** 0=Endodoncia, 1=Fractura, 2=Lesion, 3=Dolor/Sensibilidad */
  readonly condicionCheckboxes: Locator[];

  // ── COMENTARIOS ────────────────────────────────────────────────
  readonly commentTurnPanel: Locator;
  readonly commentTurnInput: Locator;
  readonly treatmentPlanPanel: Locator;
  readonly treatmentPlanInput: Locator;
  readonly commentPreviousPanel: Locator;
  readonly commentPreviousInput: Locator;
  readonly clinicalHistoryPanel: Locator;
  readonly clinicalHistoryInput: Locator;

  // ── PERIODONTOGRAMA ────────────────────────────────────────────
  readonly periodontogramPanel: Locator;
  readonly periodontogramUpperArcBtn: Locator;
  readonly periodontogramLowerArcBtn: Locator;
  readonly periodontogramLegendTooltipBtn: Locator;

  // ── ACCIONES ───────────────────────────────────────────────────
  readonly actionsPanel: Locator;
  readonly printBtn: Locator;
  readonly odontogramSaveBtn: Locator;
  readonly periodontogramSaveBtn: Locator;
  readonly infoPanel: Locator;

  // ── MODAL GUARDAR ODONTOGRAMA ──────────────────────────────────
  readonly saveDialog: Locator;
  readonly saveModalTitle: Locator;
  readonly saveCloseBtn: Locator;
  readonly saveBonoInput: Locator;
  readonly saveTreatmentInput: Locator;
  readonly saveExtrasInput: Locator;
  readonly savePaymentInput: Locator;
  readonly saveTotalDisplay: Locator;
  readonly saveRemainingDisplay: Locator;
  readonly saveObservationsInput: Locator;
  readonly saveDentalStatusSection: Locator;
  readonly saveReminderSection: Locator;
  readonly saveCancelBtn: Locator;
  readonly saveConfirmBtn: Locator;

  // ── TOAST ─────────────────────────────────────────────────────
  readonly toastContainer: Locator;
  readonly toastMessage: Locator;
  readonly toastCloseBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // Página
    this.odontogramPage = page.getByTestId('odontogram-page');
    this.odontogramLoading = page.getByTestId('odontogram-loading');
    this.odontogramError = page.getByTestId('odontogram-error');

    // Navbar
    this.navbar = page.getByTestId('navbar');
    this.navPanel = page.getByTestId('navbar-tab-panel');
    this.navTurnos = page.getByTestId('navbar-tab-turnos');
    this.navOdontograma = page.getByTestId('navbar-tab-odontograma');
    this.navSeguimiento = page.getByTestId('navbar-tab-seguimiento');
    this.navConfiguraciones = page.getByTestId('navbar-tab-configuraciones');
    this.navLogoutBtn = page.getByTestId('navbar-logout-btn');

    // Tabs
    this.odontogramTabBtn = page.getByTestId('odontogram-tab-btn');
    this.periodontogramTabBtn = page.getByTestId('periodontogram-tab-btn');

    // Odontograma
    this.odontogramFormPanel = page.getByTestId('odontogram-form-panel');
    this.odontogramBottomLegend = page.getByTestId('odontogram-bottom-legend');
    this.legendPanel = page.getByTestId('odontogram-legend-panel');
    this.legendToggleBtn = page.getByTestId('odontogram-legend-toggle-btn');
    this.mobilitySelect = page.getByTestId('odontogram-mobility-select');
    this.furcationSelect = page.getByTestId('odontogram-furcation-select');

    this.estadoCheckboxes = Array.from({ length: 9 }, (_, i) =>
      page.getByTestId(`odontogram-estado-checkbox-${i}`)
    );
    this.condicionCheckboxes = Array.from({ length: 4 }, (_, i) =>
      page.getByTestId(`odontogram-condicion-checkbox-${i}`)
    );

    // Comentarios
    this.commentTurnPanel = page.getByTestId('odontogram-comment-turn-panel');
    this.commentTurnInput = page.getByTestId('odontogram-comment-turn-input');
    this.treatmentPlanPanel = page.getByTestId('odontogram-treatment-plan-panel');
    this.treatmentPlanInput = page.getByTestId('odontogram-treatment-plan-input');
    this.commentPreviousPanel = page.getByTestId('odontogram-comment-previous-panel');
    this.commentPreviousInput = page.getByTestId('odontogram-comment-previous-input');
    this.clinicalHistoryPanel = page.getByTestId('odontogram-clinical-history-panel');
    this.clinicalHistoryInput = page.getByTestId('odontogram-clinical-history-input');

    // Periodontograma
    this.periodontogramPanel = page.getByTestId('periodontogram-panel');
    this.periodontogramUpperArcBtn = page.getByTestId('periodontogram-upper-arc-btn');
    this.periodontogramLowerArcBtn = page.getByTestId('periodontogram-lower-arc-btn');
    this.periodontogramLegendTooltipBtn = page.getByTestId('periodontogram-legend-tooltip-btn');

    // Acciones
    this.actionsPanel = page.getByTestId('odontogram-actions-panel');
    this.printBtn = page.getByTestId('odontogram-print-btn');
    this.odontogramSaveBtn = page.getByTestId('odontogram-save-btn');
    this.periodontogramSaveBtn = page.getByTestId('periodontogram-save-btn');
    this.infoPanel = page.getByTestId('odontogram-info-panel');

    // Modal guardar
    this.saveDialog = page.getByTestId('odontogram-save-dialog');
    this.saveModalTitle = page.getByTestId('odontogram-save-modal-title');
    this.saveCloseBtn = page.getByTestId('odontogram-save-close-btn');
    this.saveBonoInput = page.getByTestId('odontogram-save-bono-input');
    this.saveTreatmentInput = page.getByTestId('odontogram-save-treatment-input');
    this.saveExtrasInput = page.getByTestId('odontogram-save-extras-input');
    this.savePaymentInput = page.getByTestId('odontogram-save-payment-input');
    this.saveTotalDisplay = page.getByTestId('odontogram-save-total-display');
    this.saveRemainingDisplay = page.getByTestId('odontogram-save-remaining-display');
    this.saveObservationsInput = page.getByTestId('odontogram-save-observations-input');
    this.saveDentalStatusSection = page.getByTestId('odontogram-save-dental-status');
    this.saveReminderSection = page.getByTestId('odontogram-save-reminder-section');
    this.saveCancelBtn = page.getByTestId('odontogram-save-cancel-btn');
    this.saveConfirmBtn = page.getByTestId('odontogram-save-confirm-btn');

    // Toast
    this.toastContainer = page.getByTestId('toast-container');
    this.toastMessage = page.getByTestId('toast-message');
    this.toastCloseBtn = page.getByTestId('toast-close-btn');
  }

  // ── Navegación ──────────────────────────────────────────────────
  async goto(appointmentId: number | string) {
    await this.page.goto(`/odontograma/${appointmentId}`);
  }

  /** @deprecated Usar goto(appointmentId) */
  async navigate(appointmentId: number | string = 1) {
    await this.goto(appointmentId);
  }

  async switchToOdontogram() {
    await this.odontogramTabBtn.click();
    await this.odontogramFormPanel.waitFor({ state: 'visible' });
  }

  async switchToPeriodontogram() {
    await this.periodontogramTabBtn.click();
    await this.periodontogramPanel.waitFor({ state: 'visible' });
  }

  async selectUpperArc() {
    await this.periodontogramUpperArcBtn.click();
  }

  async selectLowerArc() {
    await this.periodontogramLowerArcBtn.click();
  }

  async openPeriodontogramLegendTooltip() {
    await this.periodontogramLegendTooltipBtn.click();
  }

  // ── Odontograma — dientes y caras ───────────────────────────────
  odontogramTooth(toothNumber: number): Locator {
    return this.page.getByTestId(`odontogram-tooth-${toothNumber}`);
  }

  odontogramToothFaces(toothNumber: number): Locator {
    return this.page.getByTestId(`odontogram-tooth-faces-${toothNumber}`);
  }

  toothFace(toothNumber: number, face: ToothFace): Locator {
    const testIdMap = {
      centro: 'arco-centro',
      interior: 'arco-interior',
      derecho: 'arco-derecho',
      inferior: 'arco-inferior',
      izquierdo: 'arco-izquierdo',
    } as const;
    return this.odontogramToothFaces(toothNumber).getByTestId(testIdMap[face]);
  }

  async selectTooth(toothNumber: number) {
    await this.odontogramTooth(toothNumber).click();
  }

  async isToothSelected(toothNumber: number): Promise<boolean> {
    const cls = await this.odontogramTooth(toothNumber).getAttribute('class');
    return cls?.includes('selected') ?? false;
  }

  async clickToothFace(toothNumber: number, face: ToothFace) {
    await this.toothFace(toothNumber, face).click();
  }

  async getToothFaceColor(toothNumber: number, face: ToothFace): Promise<string | null> {
    return this.toothFace(toothNumber, face).getAttribute('fill');
  }

  // ── Leyenda odontograma ─────────────────────────────────────────
  estadoCheckbox(index: number): Locator {
    return this.estadoCheckboxes[index];
  }

  condicionCheckbox(index: number): Locator {
    return this.condicionCheckboxes[index];
  }

  async toggleLegend() {
    await this.legendToggleBtn.click();
  }

  async isLegendExpanded(): Promise<boolean> {
    return this.estadoCheckboxes[0].isVisible();
  }

  async checkEstado(estadoIndex: number) {
    await this.estadoCheckboxes[estadoIndex].check();
  }

  async uncheckEstado(estadoIndex: number) {
    await this.estadoCheckboxes[estadoIndex].uncheck();
  }

  async checkCondicion(condicionIndex: number) {
    await this.condicionCheckboxes[condicionIndex].check();
  }

  async uncheckCondicion(condicionIndex: number) {
    await this.condicionCheckboxes[condicionIndex].uncheck();
  }

  async setMobility(value: MobilityValue) {
    await this.mobilitySelect.selectOption(value);
  }

  async setFurcation(value: FurcationValue) {
    await this.furcationSelect.selectOption(value);
  }

  // ── Periodontograma — helpers dinámicos ─────────────────────────
  periodontogramTooth(toothId: number): Locator {
    return this.page.getByTestId(`periodontogram-tooth-${toothId}`);
  }

  /** pos: 0=mesial, 1=central, 2=distal */
  periodontogramPsVest(toothId: number, pos: number): Locator {
    return this.page.getByTestId(`periodontogram-ps-vest-${toothId}-${pos}`);
  }

  periodontogramPsLing(toothId: number, pos: number): Locator {
    return this.page.getByTestId(`periodontogram-ps-ling-${toothId}-${pos}`);
  }

  periodontogramNicDisplay(toothId: number): Locator {
    return this.page.getByTestId(`periodontogram-nic-display-${toothId}`);
  }

  periodontogramMobility(toothId: number): Locator {
    return this.page.getByTestId(`periodontogram-mobility-${toothId}`);
  }

  periodontogramFurcation(toothId: number): Locator {
    return this.page.getByTestId(`periodontogram-furcation-${toothId}`);
  }

  periodontogramMiniChart(toothId: number, face: 'vest' | 'ling' = 'vest'): Locator {
    return this.page.getByTestId(`periodontogram-mini-chart-${toothId}-${face}`);
  }

  // ── Comentarios ─────────────────────────────────────────────────
  async fillCommentTurn(text: string) {
    await this.commentTurnInput.fill(text);
  }

  async fillTreatmentPlan(text: string) {
    await this.treatmentPlanInput.fill(text);
  }

  async fillCommentPrevious(text: string) {
    await this.commentPreviousInput.fill(text);
  }

  async fillClinicalHistory(text: string) {
    await this.clinicalHistoryInput.fill(text);
  }

  // ── Guardar odontograma ─────────────────────────────────────────
  async openSaveDialog() {
    await this.odontogramSaveBtn.click();
    await this.waitForSaveDialog();
  }

  /** @deprecated Usar openSaveDialog() */
  async clickGuardar() {
    await this.openSaveDialog();
  }

  async waitForSaveDialog() {
    await this.saveDialog.waitFor({ state: 'visible' });
  }

  /** @deprecated Usar waitForSaveDialog() */
  async waitForSaveModal() {
    await this.waitForSaveDialog();
  }

  async fillSaveModalBono(value: number) {
    await this.saveBonoInput.fill(String(value));
  }

  async fillSaveModalTreatment(value: number) {
    await this.saveTreatmentInput.fill(String(value));
  }

  async fillSaveModalExtras(value: number) {
    await this.saveExtrasInput.fill(String(value));
  }

  async fillSaveModalPayment(value: number) {
    await this.savePaymentInput.fill(String(value));
  }

  async fillSaveModalObservations(text: string) {
    await this.saveObservationsInput.fill(text);
  }

  async confirmSave() {
    await this.saveConfirmBtn.click();
  }

  async cancelSave() {
    await this.saveCancelBtn.click();
  }

  async closeSaveDialog() {
    await this.saveCloseBtn.click();
    await this.saveDialog.waitFor({ state: 'hidden' });
  }

  /** @deprecated Usar closeSaveDialog() */
  async closeSaveModal() {
    await this.closeSaveDialog();
  }

  async savePeriodontogram() {
    await this.periodontogramSaveBtn.click();
  }

  async print() {
    await this.printBtn.click();
  }

  // ── Toast ───────────────────────────────────────────────────────
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
