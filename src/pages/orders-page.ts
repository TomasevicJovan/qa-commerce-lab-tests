import type { Locator } from '@playwright/test';
import { BasePage } from './base-page';

/** My orders (#orders). Each order is an article carrying data-order-id. */
export class OrdersPage extends BasePage {
  readonly orders = this.main.locator('article[data-order-id]');
  readonly emptyState = this.main.getByText('A fresh start.');

  async goto(): Promise<void> {
    await this.open('#orders');
  }

  order(orderId: string): Locator {
    return this.main.locator(`[data-order-id="${orderId}"]`);
  }

  statusOf(orderId: string): Locator {
    return this.order(orderId).getByTestId('order-status');
  }
}
