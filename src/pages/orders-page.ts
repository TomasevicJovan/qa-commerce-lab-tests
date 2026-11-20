import type { Locator, Page } from '@playwright/test';

/** Customer orders (#orders). Each order is an article carrying data-order-id. */
export class OrdersPage {
  readonly heading: Locator;
  readonly signedOutMessage: Locator;
  readonly signInButton: Locator;
  readonly orders: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Your orders.' });
    this.signedOutMessage = page.getByText('Sign in to see your orders.');
    this.signInButton = page.locator('#orders-signin');
    this.orders = page.locator('article[data-order-id]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/#orders');
  }

  order(orderId: string): Locator {
    return this.page.locator(`[data-order-id="${orderId}"]`);
  }

  statusOf(orderId: string): Locator {
    return this.order(orderId).getByTestId('order-status');
  }
}
