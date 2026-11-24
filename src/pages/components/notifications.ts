import { expect, type Locator, type Page } from '@playwright/test';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/** Messages in the top-right corner. Errors use role=alert, the rest role=status. */
export class Notifications {
  readonly all: Locator;

  constructor(page: Page) {
    this.all = page.locator('#notifications .notification');
  }

  /** A notification of the given type whose title and/or message match. */
  find(type: NotificationType, text: { title?: string; message?: string | RegExp } = {}): Locator {
    let item = this.all.and(this.all.page().locator(`[data-type="${type}"]`));
    if (text.title) item = item.filter({ has: this.all.page().locator('strong', { hasText: text.title }) });
    if (text.message) item = item.filter({ has: this.all.page().locator('p', { hasText: text.message }) });
    return item;
  }

  async expectShown(type: NotificationType, text: { title?: string; message?: string | RegExp }): Promise<void> {
    await expect(this.find(type, text).first()).toBeVisible();
  }

  async dismissAll(): Promise<void> {
    for (const button of await this.all.getByRole('button', { name: 'Dismiss notification' }).all()) await button.click();
  }
}
