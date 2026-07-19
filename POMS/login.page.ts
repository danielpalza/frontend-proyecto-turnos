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

  // ── REGISTRO — STEP 1: ORGANIZACIÓN ─────────────────────────────
  readonly registerOrgSelection: Locator;
  readonly registerOrgNewCard: Locator;
  readonly registerOrgJoinCard: Locator;
  readonly registerOrgNameInput: Locator;
  readonly registerOrgCodeInput: Locator;
  readonly registerNextBtn: Locator;

  // ── REGISTRO — STEP 2: CUENTA ───────────────────────────────────
  readonly registerAccountForm: Locator;
  readonly registerNameInput: Locator;
  readonly registerLastnameInput: Locator;
  readonly registerIdentificacionInput: Locator;
  readonly registerPhoneInput: Locator;
  readonly registerUsernameInput: Locator;
  readonly registerEmailInput: Locator;
  readonly registerPasswordInput: Locator;
  readonly registerConfirmPasswordInput: Locator;
  readonly registerSubmitBtn: Locator;
  readonly registerBackBtn: Locator;

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

    // Registro — step 1 (organización)
    this.registerOrgSelection = page.getByTestId('register-org-selection');
    this.registerOrgNewCard = page.getByTestId('register-org-new-card');
    this.registerOrgJoinCard = page.getByTestId('register-org-join-card');
    this.registerOrgNameInput = page.getByTestId('register-org-name-input');
    this.registerOrgCodeInput = page.getByTestId('register-org-code-input');
    this.registerNextBtn = page.getByTestId('register-next-btn');

    // Registro — step 2 (cuenta)
    this.registerAccountForm = page.getByTestId('register-account-form');
    this.registerNameInput = page.getByTestId('register-name-input');
    this.registerLastnameInput = page.getByTestId('register-lastname-input');
    this.registerIdentificacionInput = page.getByTestId('register-dni-input');
    this.registerPhoneInput = page.getByTestId('register-phone-input');
    this.registerUsernameInput = page.getByTestId('register-username-input');
    this.registerEmailInput = page.getByTestId('register-email-input');
    this.registerPasswordInput = page.getByTestId('register-password-input');
    this.registerConfirmPasswordInput = page.getByTestId('register-confirm-password-input');
    this.registerSubmitBtn = page.getByTestId('register-submit-btn');
    this.registerBackBtn = page.getByTestId('register-back-btn');
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
    await this.registerOrgSelection.waitFor({ state: 'visible' });
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
  async selectNewOrganization() {
    await this.registerOrgNewCard.click();
  }

  async selectJoinOrganization() {
    await this.registerOrgJoinCard.click();
  }

  async fillOrgName(name: string) {
    await this.registerOrgNameInput.fill(name);
  }

  async fillOrgCode(code: string) {
    await this.registerOrgCodeInput.fill(code);
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