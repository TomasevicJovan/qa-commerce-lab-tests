import { test, expect } from '@core/fixtures';
import { CheckoutPage, HomePage, OrderPage, ProductListPage } from '@pages/index';
import { CARDS, PRODUCTS } from '@core/test-data';
import { ensureStock } from '@core/flows/order-flow';
import { futureExpiry } from '@core/factories/checkout-factory';
import { config } from '@core/config';
import type { Order } from '@api/types';

// The session lifetime is a global lab switch, so this flow runs alone in the serial "lab-scenarios" project.
test.describe('End-to-end flows', { tag: '@e2e' }, () => {
  test('E2E-07 Session expires during checkout', { tag: '@regression' }, async ({ page, api, customer, lab }) => {
    test.setTimeout(90_000);
    const SESSION_SECONDS = 20;
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    const { stillMug } = PRODUCTS;
    await ensureStock(api, stillMug.id, 1);
    await lab.set({ sessionSeconds: SESSION_SECONDS });

    await test.step('sign in after the change and CART-001 add Still Ceramic Mug', async () => {
      await home.goto();
      await home.header.openSignIn();
      await home.authDialog.signIn(customer.email, customer.password);
      await expect(home.header.accountButton).toHaveText(`${customer.name} ▾`);
      await list.goto({ q: stillMug.name });
      await list.grid.addToBag(stillMug.name);
      await expect(home.header.bagCount).toHaveText('1');
    });

    await test.step('open checkout and wait until the session expires', async () => {
      await checkout.goto();
      await checkout.fillCard({ holder: 'Alex Tester', number: CARDS.visa.number, expiry: futureExpiry(), cvc: CARDS.visa.cvc, save: false });
      await page.waitForTimeout((SESSION_SECONDS + 2) * 1_000); // the session lifetime set above, plus two seconds
    });

    await test.step('CHK-060 place order and AUTH-028 signed out with a message', async () => {
      await checkout.placeOrder();
      await home.notifications.expectShown('warning', { title: 'Signed out', message: 'Your session has expired. Please sign in again.' });
      await expect(home.header.accountButton).toHaveText('Sign in');
      expect(await (await api.orders.list()).json(), 'the first attempt creates no order').toEqual([]);
    });

    await test.step('AUTH-020 sign in again; the bag is kept', async () => {
      await lab.set({ sessionSeconds: 3600 });
      await home.header.openSignIn();
      await home.authDialog.signIn(customer.email, customer.password);
      await expect(home.header.bagCount).toHaveText('1');
    });

    await test.step('CHK-060 place order and ORD-002 payment successful', async () => {
      await checkout.goto();
      await checkout.waitForForm();
      await expect(checkout.summaryItems).toHaveCount(1);
      await checkout.fillCard({ holder: 'Alex Tester', number: CARDS.visa.number, expiry: futureExpiry(), cvc: CARDS.visa.cvc, save: false });
      await checkout.placeOrder();
      await expect(order.bannerFor('confirmed')).toBeVisible({ timeout: config.orderTimeoutMs });
      expect((await (await api.orders.list()).json()) as Order[], 'exactly one order').toHaveLength(1);
    });
  });
});
