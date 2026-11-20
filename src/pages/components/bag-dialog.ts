import type { Locator, Page } from '@playwright/test';
import { Totals } from './totals';

/** Shopping bag dialog: lines, quantity controls and totals. */
export class BagDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly lines: Locator;
  readonly emptyState: Locator;
  readonly continueButton: Locator;
  readonly totals: Totals;

  constructor(private readonly page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.getByRole('heading', { level: 2 });
    this.lines = this.root.locator('.cart-item');
    this.emptyState = this.root.getByText('Your bag is waiting for a good find.');
    this.continueButton = this.root.getByRole('button', { name: 'Continue to checkout →' });
    this.totals = new Totals(this.root);
  }

  line(productName: string): Locator {
    return this.lines.filter({ has: this.page.getByRole('heading', { name: productName, exact: true }) });
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
    await this.continueButton.click();
  }
}
