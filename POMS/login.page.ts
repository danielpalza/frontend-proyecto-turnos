import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // ── CONTENEDORES ───────────────────────────────────────────────
  readonly appContainer: Locator;
  readonly appMain: Locator;
  readonly loginPage: Locator;
  readonly loginCard: Locator;
  readonly loginHeader: Locator;

  // ── HEADER / BRANDING ──────────────────────────────────────────
  readonly loginTitle: Locator;
  readonly loginSubtitle: Locator;

  // ── FORMULARIO LOGIN ───────────────────────────────────────────
  readonly loginForm: Locator;
  readonly usernameLabel: Locator;
  readonly usernameInput: Locator;
  readonly passwordLabel: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  // ── ERROR INLINE ───────────────────────────────────────────────
  readonly inlineError: Locator;

  // ── TOAST ───────────────────────────────────────────────────────
  readonly toastContainer: Locator;
  readonly toastMessage: Locator;
  readonly toastCloseButton: Locator;

  // ── NAVEGACIÓN LOGIN ↔ REGISTRO ─────────────────────────────────
  readonly registerText: Locator;
  readonly toggleModeLink: Locator;

  // ── REGISTRO — STEP 1: ROL ─────────────────────────────────────
  readonly registerRoleSelection: Locator;
  readonly registerRoleProfesionalCard: Locator;
  readonly registerRoleRecepcionistaCard: Locator;
  readonly registerNextBtn: Locator;

  // ── REGISTRO — STEP 2: DATOS ───────────────────────────────────
  readonly registerDetailsForm: Locator;
  readonly registerNameInput: Locator;
  readonly registerDniInput: Locator;
  readonly registerPhoneInput: Locator;
  readonly registerSpecialtyInput: Locator;
  readonly registerLicenseInput: Locator;
  readonly registerAddressInput: Locator;
  readonly registerCityInput: Locator;
  readonly registerBackBtn: Locator;

  // ── REGISTRO — STEP 3: CUENTA ───────────────────────────────────
  readonly registerAccountForm: Locator;
  readonly registerUsernameInput: Locator;
  readonly registerEmailInput: Locator;
  readonly registerPasswordInput: Locator;
  readonly registerConfirmPasswordInput: Locator;
  readonly registerSubmitBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    // Contenedores
    this.appContainer = page.getByTestId('app-container');
    this.appMain = page.getByTestId('app-main');
    this.loginPage = page.getByTestId('login-page');
    this.loginCard = page.getByTestId('login-card');
    this.loginHeader = page.getByTestId('login-header');

    // Header
    this.loginTitle = page.getByTestId('login-title');
    this.loginSubtitle = page.getByTestId('login-subtitle');

    // Formulario login
    this.loginForm = page.getByTestId('login-form');
    this.usernameLabel = page.getByTestId('login-username-label');
    this.usernameInput = page.getByTestId('login-username-input');
    this.passwordLabel = page.getByTestId('login-password-label');
    this.passwordInput = page.getByTestId('login-password-input');
    this.submitButton = page.getByTestId('login-submit-btn');

    // Error inline (solo visible cuando hay errorMessage)
    this.inlineError = page.getByTestId('login-error');

    // Toast
    this.toastContainer = page.getByTestId('toast-container');
    this.toastMessage = page.getByTestId('toast-message');
    this.toastCloseButton = page.getByTestId('toast-close-btn');

    // Navegación login ↔ registro
    this.registerText = page.getByTestId('login-register-text');
    this.toggleModeLink = page.getByTestId('login-toggle-mode-link');

    // Registro — step 1
    this.registerRoleSelection = page.getByTestId('register-role-selection');
    this.registerRoleProfesionalCard = page.getByTestId('register-role-profesional-card');
    this.registerRoleRecepcionistaCard = page.getByTestId('register-role-recepcionista-card');
    this.registerNextBtn = page.getByTestId('register-next-btn');

    // Registro — step 2
    this.registerDetailsForm = page.getByTestId('register-details-form');
    this.registerNameInput = page.getByTestId('register-name-input');
    this.registerDniInput = page.getByTestId('register-dni-input');
    this.registerPhoneInput = page.getByTestId('register-phone-input');
    this.registerSpecialtyInput = page.getByTestId('register-specialty-input');
    this.registerLicenseInput = page.getByTestId('register-license-input');
    this.registerAddressInput = page.getByTestId('register-address-input');
    this.registerCityInput = page.getByTestId('register-city-input');
    this.registerBackBtn = page.getByTestId('register-back-btn');

    // Registro — step 3
    this.registerAccountForm = page.getByTestId('register-account-form');
    this.registerUsernameInput = page.getByTestId('register-username-input');
    this.registerEmailInput = page.getByTestId('register-email-input');
    this.registerPasswordInput = page.getByTestId('register-password-input');
    this.registerConfirmPasswordInput = page.getByTestId('register-confirm-password-input');
    this.registerSubmitBtn = page.getByTestId('register-submit-btn');
  }

  // ── Navegación ──────────────────────────────────────────────────
  async goto() {
    await this.page.goto('/login');
  }

  async waitForLoginForm() {
    await this.loginForm.waitFor({ state: 'visible' });
  }

  // ── Login ───────────────────────────────────────────────────────
  async fillUsername(username: string) {
    await this.usernameInput.fill(username);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(username: string, password: string) {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.submit();
  }

  // ── Cambio de modo ──────────────────────────────────────────────
  async switchToRegister() {
    await this.toggleModeLink.click();
    await this.registerRoleSelection.waitFor({ state: 'visible' });
  }

  async switchToLogin() {
    await this.toggleModeLink.click();
    await this.loginForm.waitFor({ state: 'visible' });
  }

  /** @deprecated Usar toggleModeLink o switchToRegister() */
  async clickCreateAccount() {
    await this.switchToRegister();
  }

  // ── Registro — helpers ───────────────────────────────────────────
  async selectProfesionalRole() {
    await this.registerRoleProfesionalCard.click();
  }

  async selectRecepcionistaRole() {
    await this.registerRoleRecepcionistaCard.click();
  }

  async goToNextRegisterStep() {
    await this.registerNextBtn.click();
  }

  async goToPrevRegisterStep() {
    await this.registerBackBtn.click();
  }

  async submitRegister() {
    await this.registerSubmitBtn.click();
  }

  // ── Toast ───────────────────────────────────────────────────────
  async closeToast() {
    await this.toastCloseButton.click();
  }

  async waitForToast() {
    await this.toastMessage.waitFor({ state: 'visible' });
  }

  async waitForToastToDisappear() {
    await this.toastMessage.waitFor({ state: 'hidden' });
  }

  async getToastText(): Promise<string> {
    return (await this.page.getByTestId('toast-body').textContent() ?? '').trim();
  }

  async isToastVisible(): Promise<boolean> {
    return this.toastMessage.isVisible();
  }

  // ── Error inline ────────────────────────────────────────────────
  async getInlineErrorText(): Promise<string> {
    return (await this.inlineError.textContent() ?? '').trim();
  }

  async isInlineErrorVisible(): Promise<boolean> {
    return this.inlineError.isVisible();
  }
}
