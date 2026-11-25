import { test, expect } from '@core/fixtures';
import { CheckoutPage, HomePage, OrderPage } from '@pages/index';
import { CARDS, PRODUCTS } from '@core/test-data';
import { ensureStock, setCart } from '@core/flows/order-flow';
import { config } from '@core/config';

const { arcHeadphones, orbitLamp, noteJournal, stillMug, pocketNotebook } = PRODUCTS;

test.describe('Pricing', { tag: '@pricing' }, () => {
  test('PRICE-040 Bag shows shipping by the rules', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
    const home = new HomePage(page);

    await test.step('2 × Orbit Desk Lamp ships free', async () => {
      await setCart(api, [{ productId: orbitLamp.id, quantity: 2 }]);
      await home.goto();
      await home.header.openBag();
      await expect(home.bag.totals.value('Shipping')).toHaveText('On us');
      await expect(home.bag.totals.value('Total')).toHaveText('$158.00');
    });

    await test.step('1 × Arc Wireless Headphones pays $7.00', async () => {
      await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }]);
      // The bag dialog is still open; a reload picks up the new server-side bag.
      await page.reload();
      await home.waitUntilReady();
      await home.header.openBag();
      await expect(home.bag.totals.value('Shipping')).toHaveText('$7.00');
      await expect(home.bag.totals.value('Total')).toHaveText('$136.00');
    });
  });

  test('PRICE-041 Removing the last product without free shipping makes shipping free', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
    const home = new HomePage(page);
    await setCart(api, [{ productId: noteJournal.id, quantity: 1 }, { productId: stillMug.id, quantity: 1 }]);
    await home.goto();
    await home.header.openBag();
    await expect(home.bag.totals.value('Shipping')).toHaveText('$7.00');

    await home.bag.decrease(stillMug.name);

    await expect(home.bag.totals.value('Shipping')).toHaveText('On us');
    await expect(home.bag.totals.value('Total')).toHaveText('$18.00');
  });

  test('PRICE-042 Checkout total equals the order total', { tag: '@smoke' }, async ({ signedInPage: page, api, saveCards }) => {
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    await saveCards(CARDS.visa, CARDS.mastercard);
    await ensureStock(api, arcHeadphones.id, 1);
    await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }]);
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

  test('PRICE-043 Switching from Mastercard to Visa removes the discount', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    const checkout = new CheckoutPage(page);
    await saveCards(CARDS.visa, CARDS.mastercard);
    await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }]);
    await checkout.goto();
    await checkout.chooseSavedCard(CARDS.mastercard.last4);
    await expect(checkout.totals.row('Mastercard 10%')).toBeVisible();

    await checkout.chooseSavedCard(CARDS.visa.last4);

    await expect(checkout.totals.row('Mastercard 10%')).toHaveCount(0);
    await expect(checkout.totals.value('Total')).toHaveText('$136.00');
  });

  test('PRICE-044 Checkout shows the same rounded amounts as the server', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    await saveCards(CARDS.mastercard);
    await ensureStock(api, pocketNotebook.id, 1);
    await setCart(api, [{ productId: pocketNotebook.id, quantity: 1 }]);
    await checkout.goto();

    await checkout.coupon.fill('SAVE10');
    await expect(checkout.totals.value('Coupon SAVE10')).toHaveText('−$2.00');
    await expect(checkout.totals.value('Mastercard 10%')).toHaveText('−$1.80');
    await expect(checkout.totals.value('Total')).toHaveText('$23.15');

    // A preview that differed from the server would be rejected with "Price changed".
    await checkout.placeOrder();
    await expect(order.bannerFor('confirmed')).toBeVisible({ timeout: config.orderTimeoutMs });
    await expect(order.totals.value('Total')).toHaveText('$23.15');
  });
});
