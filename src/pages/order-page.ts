import type { Locator } from '@playwright/test';
import { config } from '@core/config';
import { BasePage } from './base-page';
import { Totals } from './components/totals';

/** Order page (#order/<id>) with a live status banner. */
export class OrderPage extends BasePage {
  readonly banner = this.page.locator('#order-banner [data-status]');
  readonly timeline = this.main.locator('.timeline li');
  readonly items = this.main.locator('.order-items');
  readonly facts = this.main.locator('.order-facts');
  readonly totals = new Totals(this.main.locator('.order-layout aside'));
  readonly restoreBagButton = this.page.locator('#retry-order');
  readonly eyebrow = this.main.locator('.eyebrow');

  async goto(orderId: string): Promise<void> {
    await this.open(`#order/${orderId}`);
  }

  /** Waits until the banner shows the given status (orders settle asynchronously). */
  bannerFor(status: string): Locator {
    return this.page.locator(`#order-banner [data-status="${status}"]`);
  }

  fact(label: 'Payment' | 'Deliver to' | 'Placed'): Locator {
    return this.facts.locator(`dt:text-is("${label}") + dd`);
  }

  static readonly settleTimeout = config.orderTimeoutMs;
}
