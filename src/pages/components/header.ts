import { expect, type Locator, type Page } from '@playwright/test';
import { CategoriesMenu } from './categories-menu';

/** Header and navigation row shared by every page. */
export class Header {
  readonly brand: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly wishlistLink: Locator;
  readonly wishlistCount: Locator;
  readonly accountButton: Locator;
  readonly createAccountButton: Locator;
  readonly accountMenu: Locator;
  readonly bagButton: Locator;
  readonly bagCount: Locator;
  readonly blackFridayLink: Locator;
  readonly freeShippingLink: Locator;
  readonly popularLinks: Locator;
  readonly categories: CategoriesMenu;

  constructor(private readonly page: Page) {
    this.brand = page.getByRole('link', { name: 'Forma home' });
    this.searchInput = page.getByRole('searchbox', { name: 'Search products' });
    this.searchButton = page.getByRole('button', { name: 'Search', exact: true });
    this.wishlistLink = page.locator('#wishlist-open');
    this.wishlistCount = page.locator('#wishlist-count');
    // The account button's text switches between "Sign in" and "<name> ▾", so its id is the stable anchor.
    this.accountButton = page.locator('#account');
    this.createAccountButton = page.locator('#register-open');
    this.accountMenu = page.locator('#account-menu');
    this.bagButton = page.locator('#cart-open');
    this.bagCount = page.locator('#cart-count');
    const nav = page.getByRole('navigation', { name: 'Shop navigation' });
    this.blackFridayLink = nav.getByRole('link', { name: 'Black Friday', exact: true });
    this.freeShippingLink = nav.getByRole('link', { name: 'Free shipping', exact: true });
    this.popularLinks = page.locator('#popular-categories a');
    this.categories = new CategoriesMenu(page);
  }

  async search(text: string, submit = true): Promise<void> {
    await this.searchInput.fill(text);
    if (submit) await this.searchInput.press('Enter');
  }

  async openSignIn(): Promise<void> {
    await this.accountButton.click();
  }

  async openRegistration(): Promise<void> {
    await this.createAccountButton.click();
  }

  async openAccountMenu(): Promise<void> {
    await this.accountButton.click();
    await expect(this.accountMenu).toBeVisible();
  }

  async signOut(): Promise<void> {
    await this.openAccountMenu();
    await this.accountMenu.getByRole('button', { name: 'Sign out' }).click();
  }

  async openBag(): Promise<void> {
    await this.bagButton.click();
  }

  popularLink(name: string): Locator {
    return this.popularLinks.filter({ hasText: new RegExp(`^${name.replace(/[&]/g, '\\$&')}$`) });
  }
}
