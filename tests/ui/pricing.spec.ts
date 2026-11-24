import { test, expect } from '@core/fixtures';
import { CheckoutPage, OrderPage } from '@pages/index';
import { CARDS, PRODUCTS } from '@core/test-data';
import { ensureStock, setCart } from '@core/flows/order-flow';
import { config } from '@core/config';

test.describe('Pricing', { tag: '@pricing' }, () => {
  test('PRICE-042 Checkout total equals the order total', { tag: '@smoke' }, async ({ signedInPage: page, api, saveCards }) => {
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    const product = PRODUCTS.arcHeadphones;
    await saveCards(CARDS.visa, CARDS.mastercard);
    await ensureStock(api, product.id, 1);
    await setCart(api, [{ productId: product.id, quantity: 1 }]);
    await checkout.goto();

    await test.step('checkout shows the discounted total', async () => {
      await checkout.coupon.fill('SAVE10');
      await checkout.chooseSavedCard(CARDS.mastercard.last4);
      await expect(checkout.totals.value('Coupon SAVE10')).toHaveText('−$12.90');
      await expect(checkout.totals.value('Mastercard 10%')).toHaveText('−$11.61');
      await expect(checkout.totals.value('Total')).toHaveText('$111.49');
    });

    await test.step('the order shows the same lines and total', async () => {
      await checkout.placeOrder();
      await expect(order.bannerFor('confirmed')).toBeVisible({ timeout: config.orderTimeoutMs });
      await expect(order.totals.value('Coupon SAVE10')).toHaveText('−$12.90');
      await expect(order.totals.value('Mastercard 10%')).toHaveText('−$11.61');
      await expect(order.totals.value('Total')).toHaveText('$111.49');
    });
  });
});
