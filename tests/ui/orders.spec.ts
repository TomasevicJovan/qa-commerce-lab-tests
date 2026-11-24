import { test, expect } from '@core/fixtures';
import { CheckoutPage, OrderPage } from '@pages/index';
import { CARDS, PRODUCTS } from '@core/test-data';
import { ensureStock, setCart } from '@core/flows/order-flow';
import { calculateTotals, formatUsd } from '@core/pricing';
import { config } from '@core/config';

test.describe('Orders, order page and payment messages', { tag: '@orders' }, () => {
  test('ORD-002 Approved payment shows Payment successful', { tag: '@smoke' }, async ({ signedInPage: page, api, saveCards }) => {
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    const product = PRODUCTS.stillMug;
    const total = calculateTotals([{ unitPrice: product.price, quantity: 1 }]).total;
    await saveCards(CARDS.visa);
    await ensureStock(api, product.id, 1);
    await setCart(api, [{ productId: product.id, quantity: 1 }]);
    await checkout.goto();

    await checkout.placeOrder();

    await expect(order.bannerFor('confirmed')).toBeVisible({ timeout: config.orderTimeoutMs });
    await expect(order.heading).toHaveText('Thank you for your order.');
    await expect(order.banner).toHaveText(
      `Payment successfulThank you! Your payment of ${formatUsd(total)} went through and the order is confirmed.`,
    );
  });
});
