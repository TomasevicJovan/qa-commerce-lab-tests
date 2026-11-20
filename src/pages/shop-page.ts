import { expect, type Locator, type Page } from '@playwright/test';
import { AuthDialog } from './components/auth-dialog';
import { BagDialog } from './components/bag-dialog';
import { CheckoutDialog } from './components/checkout-dialog';
import { Header } from './components/header';

export type CategoryFilter = 'All objects' | 'Audio' | 'Workspace' | 'Travel' | 'Home';

/**
 * The product collection (#shop).
 * Cards are located by their accessible name (product name), which works in both
 * stable and dynamic locator modes. Test ids are deliberately not relied on.
 */
export class ShopPage {
  readonly header: Header;
  readonly authDialog: AuthDialog;
  readonly bag: BagDialog;
  readonly checkout: CheckoutDialog;
  readonly grid: Locator;
  readonly cards: Locator;
  readonly cardTitles: Locator;
  readonly resultCount: Locator;
  readonly searchInput: Locator;
  readonly sortSelect: Locator;
  readonly nextPageButton: Locator;
  readonly previousPageButton: Locator;
  readonly pageIndicator: Locator;
  readonly emptyState: Locator;
  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.authDialog = new AuthDialog(page);
    this.bag = new BagDialog(page);
    this.checkout = new CheckoutDialog(page);
    this.grid = page.getByRole('region', { name: 'Product collection' });
    this.cards = page.locator('#products').getByRole('article');
    this.cardTitles = this.cards.getByRole('heading', { level: 3 });
    this.resultCount = page.locator('#result-count');
    this.searchInput = page.getByLabel('Search products');
    this.sortSelect = page.getByLabel('Sort products');
    this.nextPageButton = page.getByRole('button', { name: 'Next' });
    this.previousPageButton = page.getByRole('button', { name: 'Previous' });
    this.pageIndicator = page.locator('.page-controls span');
    this.emptyState = page.locator('#products').getByText('No objects found. Try another search.');
    this.toast = page.getByRole('status');
  }

  async goto(): Promise<void> {
    await this.page.goto('/#shop');
    await this.waitUntilReady();
  }

  /**
   * Header buttons exist in the static HTML before app.js attaches their click handlers,
   * so an early click silently does nothing. The app renders the collection only after it
   * has restored the session and cart, which makes rendered results a reliable "ready" signal.
   * The generous timeout covers the lab's renderDelay scenario (up to 5 s).
   */
  async waitUntilReady(): Promise<void> {
    await expect(this.cards.first().or(this.emptyState)).toBeVisible({ timeout: 15_000 });
  }

  productCard(name: string): Locator {
    return this.cards.filter({ has: this.page.getByRole('heading', { name, exact: true }) });
  }

  addToBagButton(name: string): Locator {
    // Every card has an identical "Add to bag +" button, so it must be scoped to its card.
    return this.productCard(name).getByRole('button', { name: 'Add to bag +', exact: true });
  }

  priceOf(name: string): Locator {
    return this.productCard(name).locator('.price');
  }

  async addToBag(name: string): Promise<void> {
    await this.addToBagButton(name).click();
  }

  /** Search is debounced (350 ms); callers assert on the resulting state, never on a timer. */
  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
  }

  async sortByPrice(): Promise<void> {
    await this.sortSelect.selectOption('price');
  }

  async filterBy(category: CategoryFilter): Promise<void> {
    await this.page.getByRole('button', { name: category, exact: true }).click();
  }
}
