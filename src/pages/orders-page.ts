import type { Locator } from '@playwright/test';
import { BasePage } from './base-page';

/** My orders (#orders). Each order is an article carrying data-order-id. */
export class OrdersPage extends BasePage {
  readonly orders = this.main.locator('article[data-order-id]');
  readonly emptyState = this.main.getByText('A fresh start.');

  async goto(): Promise<void> {
    await this.open('#orders');
  }

  /** Order ids in the order the list shows them. */
  async orderIds(): Promise<string[]> {
    return this.orders.evaluateAll((articles) => articles.map((a) => a.getAttribute('data-order-id') ?? ''));
  }

  order(orderId: string): Locator {
    return this.main.locator(`[data-order-id="${orderId}"]`);
  }

  statusOf(orderId: string): Locator {
    return this.order(orderId).getByTestId('order-status');
  }

  /** "Order 1a2b3c4d" link that opens the order page. */
  orderLink(orderId: string): Locator {
    return this.order(orderId).getByRole('heading');
  }

  /** Opens an order from the list by clicking its number. */
  async openOrder(orderId: string): Promise<void> {
    await this.orderLink(orderId).getByRole('link').click();
  }

  /** Total, payment method and savings line of an order. */
  summaryOf(orderId: string): Locator {
    return this.order(orderId).locator('.hint');
  }

  itemsOf(orderId: string): Locator {
    return this.order(orderId).locator('.order-items');
  }
}
