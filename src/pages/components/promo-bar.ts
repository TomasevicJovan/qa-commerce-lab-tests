import type { Locator, Page } from '@playwright/test';

/** Green promotion bar with rotating messages. */
export class PromoBar {
  readonly root: Locator;
  readonly message: Locator;
  readonly counter: Locator;
  readonly previous: Locator;
  readonly next: Locator;
  readonly pause: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('region', { name: 'Promotions' });
    this.message = page.locator('#promo-message');
    this.counter = this.message.locator('.promo-count');
    this.previous = page.getByRole('button', { name: 'Previous promotion' });
    this.next = page.getByRole('button', { name: 'Next promotion' });
    this.pause = page.locator('#promo-pause');
  }

  /** Message text without the "n/4" counter. */
  async text(): Promise<string> {
    const full = (await this.message.textContent()) ?? '';
    const counter = (await this.counter.textContent()) ?? '';
    return full.replace(counter, '').trim();
  }
}
