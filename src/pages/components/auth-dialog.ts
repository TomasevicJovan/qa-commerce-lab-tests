import type { Locator, Page } from '@playwright/test';

export type AuthField = 'name' | 'email' | 'password' | 'confirm';

/** Native <dialog> used for both sign-in and registration. */
export class AuthDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmInput: Locator;
  readonly formError: Locator;
  readonly signInButton: Locator;
  readonly createAccountButton: Locator;
  readonly switchToRegister: Locator;
  readonly switchToSignIn: Locator;

  constructor(page: Page) {
    this.root = page.locator('dialog#dialog');
    this.title = this.root.getByRole('heading', { level: 2 });
    this.nameInput = this.root.getByLabel('Your name');
    this.emailInput = this.root.getByLabel('Email address');
    this.passwordInput = this.root.getByLabel('Password', { exact: true });
    this.confirmInput = this.root.getByLabel('Confirm password');
    this.formError = this.root.locator('.form-error');
    this.signInButton = this.root.getByRole('button', { name: 'Sign in →' });
    this.createAccountButton = this.root.getByRole('button', { name: 'Create account →' });
    this.switchToRegister = this.root.getByRole('button', { name: 'New here? Create an account' });
    this.switchToSignIn = this.root.getByRole('button', { name: 'Already have an account? Sign in' });
  }

  /** Error message shown under a field. */
  fieldError(field: AuthField): Locator {
    return this.root.locator(`#error-${field}`);
  }

  input(field: AuthField): Locator {
    return { name: this.nameInput, email: this.emailInput, password: this.passwordInput, confirm: this.confirmInput }[field];
  }

  /** The form is prefilled with the demo account, so fields are always filled, never appended to. */
  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  /** Fills the registration form; any field left undefined is not touched. */
  async fillRegistration(values: Partial<Record<AuthField, string>>): Promise<void> {
    for (const field of ['name', 'email', 'password', 'confirm'] as const) {
      const value = values[field];
      if (value !== undefined) await this.input(field).fill(value);
    }
  }

  async register(name: string, email: string, password: string, confirm = password): Promise<void> {
    await this.fillRegistration({ name, email, password, confirm });
    await this.createAccountButton.click();
  }

  async close(): Promise<void> {
    await this.root.press('Escape');
  }
}
