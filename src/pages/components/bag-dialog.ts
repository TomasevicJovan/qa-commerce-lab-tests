import type { Locator, Page } from '@playwright/test';
import { Totals } from './totals';

/** Shopping bag dialog: lines, quantity controls and totals. */
export class BagDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly lines: Locator;
  readonly emptyState: Locator;
  readonly continueLink: Locator;
  readonly closeButton: Locator;
  readonly totals: Totals;

  constructor(private readonly page: Page) {
    this.root = page.locator('dialog#dialog');
    this.title = this.root.getByRole('heading', { level: 2 });
    this.lines = this.root.locator('.cart-item');
    this.emptyState = this.root.getByText('Your bag is waiting for a good find.');
    this.continueLink = this.root.getByRole('link', { name: 'Continue to checkout →' });
    this.closeButton = this.root.getByRole('button', { name: 'Close dialog' });
    this.totals = new Totals(this.root);
  }

  line(productName: string): Locator {
    return this.lines.filter({ has: this.page.getByRole('heading', { name: productName, exact: true }) });
  }

  /** Price line of a product: price, original price for a deal, "Free shipping". */
  priceOf(productName: string): Locator {
    return this.line(productName).locator('.cart-detail p');
  }

  /** Crossed-out original price of a deal. */
  originalPriceOf(productName: string): Locator {
    return this.priceOf(productName).locator('s');
  }

  quantityOf(productName: string): Locator {
    return this.line(productName).locator('.qty span');
  }

  async increase(productName: string): Promise<void> {
    await this.root.getByRole('button', { name: `Add one ${productName}`, exact: true }).click();
  }

  async decrease(productName: string): Promise<void> {
    await this.root.getByRole('button', { name: `Remove one ${productName}`, exact: true }).click();
  }

  async continueToCheckout(): Promise<void> {
    await this.continueLink.click();
  }
}
