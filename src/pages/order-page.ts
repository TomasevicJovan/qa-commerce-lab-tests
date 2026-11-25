import { expect, type Locator } from '@playwright/test';
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

  /** Waits until the order reaches one of the given final statuses and returns it. */
  async settledStatus(statuses: string[], timeout = config.orderTimeoutMs): Promise<string> {
    await expect(this.banner).toHaveAttribute('data-status', new RegExp(`^(${statuses.join('|')})$`), { timeout });
    return (await this.banner.getAttribute('data-status')) as string;
  }

  /** Order id of the order page that is open. */
  idFromUrl(): string {
    const match = /#order\/([0-9a-f-]{36})/.exec(this.page.url());
    if (!match?.[1]) throw new Error(`Not on an order page: ${this.page.url()}`);
    return match[1];
  }

  /** Steps of the progress list and their times. */
  readonly timelineSteps = this.timeline.locator('strong');
  readonly timelineTimes = this.timeline.locator('time');
  readonly notFoundMessage = this.main.locator('.inline-error');
  readonly backToOrdersLink = this.main.getByRole('link', { name: 'Back to my orders' });

  static readonly settleTimeout = config.orderTimeoutMs;
}
