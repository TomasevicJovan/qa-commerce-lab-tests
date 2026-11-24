import { test, expect } from '@core/fixtures';
import { CheckoutPage, OrderPage } from '@pages/index';
import { CARDS, PRODUCTS } from '@core/test-data';
import { ensureStock, setCart } from '@core/flows/order-flow';

// Lab switches are global, so these tests run alone in the serial "lab-scenarios" project.
test.describe('Orders, order page and payment messages', { tag: '@orders' }, () => {
  test('ORD-001 Order page opens after placing an order', { tag: '@smoke' }, async ({ signedInPage: page, api, saveCards, lab }) => {
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    await lab.set({ paymentDelay: 3000 });
    await saveCards(CARDS.visa);
    await ensureStock(api, PRODUCTS.stillMug.id, 1);
    await setCart(api, [{ productId: PRODUCTS.stillMug.id, quantity: 1 }]);
    await checkout.goto();

    await checkout.placeOrder();

    await expect(page).toHaveURL(/#order\/[0-9a-f-]{36}$/);
    const shortId = (page.url().split('/').pop() as string).slice(0, 8);
    await expect(order.eyebrow).toHaveText(`Order ${shortId}`);
    await expect(order.heading).toHaveText('Almost there.');
    await expect(order.banner).toHaveAttribute('data-status', /^(pending|payment_pending)$/);
    await expect(order.banner).toContainText(/Order received|Processing your payment/);
  });
});
