import { test, expect } from '@core/fixtures';
import { CheckoutPage, OrderPage } from '@pages/index';
import { CARDS, PRODUCTS } from '@core/test-data';
import { ensureStock, setCart } from '@core/flows/order-flow';
import { calculateTotals, formatUsd } from '@core/pricing';

test.describe('Checkout and card payments', { tag: '@checkout' }, () => {
  test('CHK-003 Page shows all sections and the summary', { tag: '@smoke' }, async ({ signedInPage: page, api }) => {
    const checkout = new CheckoutPage(page);
    const arc = PRODUCTS.arcHeadphones;
    const orbit = PRODUCTS.orbitLamp;
    await setCart(api, [{ productId: arc.id, quantity: 1 }, { productId: orbit.id, quantity: 2 }]);

    await checkout.goto();

    await expect(checkout.heading).toHaveText('Checkout');
    await expect(checkout.form.locator('h2')).toHaveText(['1 Delivery address', '2 Payment', '3 Discount code', 'Order summary']);
    await expect(checkout.summaryItems).toHaveCount(2);
    await expect(checkout.summaryItems.filter({ hasText: arc.name })).toContainText(`1 × ${formatUsd(arc.price)}`);
    await expect(checkout.summaryItems.filter({ hasText: arc.name })).toContainText(formatUsd(arc.price));
    await expect(checkout.summaryItems.filter({ hasText: orbit.name })).toContainText(`2 × ${formatUsd(orbit.price)}`);
    await expect(checkout.summaryItems.filter({ hasText: orbit.name })).toContainText(formatUsd(orbit.price * 2));
    await expect(checkout.placeOrderButton).toHaveText('Place order →');
  });

  test('CHK-060 Pay with an approved saved card', { tag: '@smoke' }, async ({ signedInPage: page, api, saveCards }) => {
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    const product = PRODUCTS.stillMug;
    await saveCards(CARDS.visa);
    await ensureStock(api, product.id, 1);
    await setCart(api, [{ productId: product.id, quantity: 1 }]);
    await checkout.goto();
    await expect(checkout.savedCardRadio(CARDS.visa.last4)).toBeChecked();

    await checkout.placeOrder();

    await expect(page).toHaveURL(/#order\/[0-9a-f-]{36}$/);
    const orderId = page.url().split('/').pop() as string;
    await checkout.notifications.expectShown('success', {
      title: 'Order placed',
      message: `Order ${orderId.slice(0, 8)} was placed successfully. We are processing your payment now.`,
    });
    await expect(checkout.header.bagCount).toHaveText('0');
    await expect(order.eyebrow).toHaveText(`Order ${orderId.slice(0, 8)}`);
  });
});

export const mugTotal = calculateTotals([{ unitPrice: PRODUCTS.stillMug.price, quantity: 1 }]).total;
