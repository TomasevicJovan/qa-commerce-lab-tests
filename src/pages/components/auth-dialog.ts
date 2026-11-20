import type { Locator, Page } from '@playwright/test';

/** Native <dialog> used for both sign-in and registration. */
export class AuthDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly error: Locator;
  readonly signInButton: Locator;
  readonly createAccountButton: Locator;
  readonly switchToRegister: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.getByRole('heading', { level: 2 });
    this.nameInput = this.root.getByLabel('Your name');
    this.emailInput = this.root.getByLabel('Email address');
    this.passwordInput = this.root.getByLabel('Password');
    this.error = this.root.getByRole('alert');
    this.signInButton = this.root.getByRole('button', { name: 'Sign in →' });
    this.createAccountButton = this.root.getByRole('button', { name: 'Create account →' });
    this.switchToRegister = this.root.getByRole('button', { name: 'New here? Create an account' });
  }

  /** The form is prefilled with the demo account, so fields are always cleared first. */
  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async register(name: string, email: string, password: string): Promise<void> {
    await this.switchToRegister.click();
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.createAccountButton.click();
  }
}
