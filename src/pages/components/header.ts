import type { Locator, Page } from '@playwright/test';

export type NavTarget = 'The collection' | 'My orders' | 'QA laboratory';

/** Top bar shared by every route: navigation, account button and bag. */
export class Header {
  readonly accountButton: Locator;
  readonly bagButton: Locator;
  readonly bagCount: Locator;
  private readonly nav: Locator;

  constructor(private readonly page: Page) {
    // The account button's text switches between "Sign in" and "<name> · Sign out", so its id is the stable anchor.
    this.accountButton = page.locator('#account');
    this.bagButton = page.getByRole('button', { name: 'Open shopping bag' });
    this.bagCount = page.locator('#cart-count');
    this.nav = page.getByRole('navigation', { name: 'Main navigation' });
  }

  navLink(target: NavTarget): Locator {
    return this.nav.getByRole('link', { name: target });
  }

  async goTo(target: NavTarget): Promise<void> {
    await this.navLink(target).click();
  }

  async openSignIn(): Promise<void> {
    await this.accountButton.click();
  }

  async signOut(): Promise<void> {
    await this.accountButton.click();
  }

  async openBag(): Promise<void> {
    await this.bagButton.click();
  }
}
