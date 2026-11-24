import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { CheckoutPage, OrderPage, OrdersPage } from '@pages/index';
import { CARDS, PRODUCTS, type TestCard } from '@core/test-data';
import { drainStockTo, ensureStock, placeAndSettle, placeOrder, setCart } from '@core/flows/order-flow';
import { pay } from '@core/factories/checkout-factory';
import { calculateTotals, formatUsd } from '@core/pricing';
import { config } from '@core/config';
import { createApiClients, type ApiClients } from '@api/index';

const { stillMug, novaChair, arcHeadphones, markHighlighter, pureToothbrush } = PRODUCTS;
const settle = { timeout: config.orderTimeoutMs };
const mugTotal = formatUsd(calculateTotals([{ unitPrice: stillMug.price, quantity: 1 }]).total); // $31.00
const shortIdFromUrl = (page: Page) => (page.url().split('/').pop() as string).slice(0, 8);

/** Saves the card, fills the bag with one product and places the order on the checkout page. */
async function placeInBrowser(page: Page, api: ApiClients, saveCards: (...c: TestCard[]) => Promise<unknown>, card: TestCard, productId = stillMug.id) {
  await saveCards(card);
  await ensureStock(api, productId, 1);
  await setCart(api, [{ productId, quantity: 1 }]);
  const checkout = new CheckoutPage(page);
  await checkout.goto();
  await checkout.waitForForm();
  await checkout.placeOrder();
  await expect(page).toHaveURL(/#order\/[0-9a-f-]{36}$/);
  return checkout;
}

/** Checkout for a customer without saved cards, so the empty card form fails validation. */
async function openEmptyCheckout(page: Page, api: ApiClients) {
  await setCart(api, [{ productId: stillMug.id, quantity: 1 }]);
  const checkout = new CheckoutPage(page);
  await checkout.goto();
  await checkout.waitForForm();
  return checkout;
}

test.describe('Orders, order page and payment messages', { tag: '@orders' }, () => {
  test.describe('order page', () => {
    test('ORD-002 Approved payment shows Payment successful', { tag: '@smoke' }, async ({ signedInPage: page, api, saveCards }) => {
      const order = new OrderPage(page);
      await placeInBrowser(page, api, saveCards, CARDS.visa);

      await expect(order.bannerFor('confirmed')).toBeVisible(settle);
      await expect(order.heading).toHaveText('Thank you for your order.');
      await expect(order.banner).toHaveText(`Payment successfulThank you! Your payment of ${mugTotal} went through and the order is confirmed.`);
    });

    test('ORD-003 Declined card shows Payment failed', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      const order = new OrderPage(page);
      await placeInBrowser(page, api, saveCards, CARDS.declined);

      await expect(order.bannerFor('cancelled')).toBeVisible(settle);
      await expect(order.heading).toHaveText('About your order.');
      await expect(order.banner).toHaveText(
        'Payment failedYour card was declined. The order was cancelled, the products went back into stock and you were not charged.',
      );
    });

    test('ORD-004 Lost last unit shows Order not completed', { tag: '@regression' }, async ({ signedInPage: page, api, request, createUser, saveCards }) => {
      const order = new OrderPage(page);
      const customerA = createApiClients(request, (await createUser()).token);
      await drainStockTo(api, createApiClients(request, (await createUser()).token), novaChair.id, 1);
      await saveCards(CARDS.visa);
      await setCart(api, [{ productId: novaChair.id, quantity: 1 }]);
      const checkout = new CheckoutPage(page);
      await checkout.goto();
      await checkout.waitForForm();

      const { order: orderA } = await placeAndSettle(customerA, [{ productId: novaChair.id, quantity: 1 }], pay.wallet());
      expect(orderA.status).toBe('confirmed');
      await checkout.placeOrder();

      await expect(order.bannerFor('rejected')).toBeVisible(settle);
      await expect(order.banner).toHaveText('Order not completedA product in your order is out of stock. You were not charged.');
      await checkout.notifications.expectShown('error', {
        title: 'Order not completed',
        message: `A product in your order is out of stock. Order ${shortIdFromUrl(page)} could not be completed and you were not charged.`,
      });
    });

    test('ORD-005 Progress lists every status in order', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const order = new OrderPage(page);
      const { order: approved } = await placeAndSettle(api, [{ productId: markHighlighter.id, quantity: 1 }], pay.newCard(CARDS.visa));
      const { order: declined } = await placeAndSettle(api, [{ productId: markHighlighter.id, quantity: 1 }], pay.newCard(CARDS.declined));

      for (const { id, steps } of [
        { id: approved.id, steps: ['Order received', 'Processing payment', 'Confirmed'] },
        { id: declined.id, steps: ['Order received', 'Processing payment', 'Payment failed', 'Cancelled'] },
      ]) {
        await order.goto(id);
        await expect(order.timeline.locator('strong')).toHaveText(steps);
        for (const time of await order.timeline.locator('time').all()) await expect(time).toHaveText(/\d{1,2}:\d{2}:\d{2}/);
      }
    });

    test('ORD-006 Summary shows products, totals, payment, address and time', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const order = new OrderPage(page);
      const { order: placed } = await placeAndSettle(api, [{ productId: arcHeadphones.id, quantity: 1 }], { ...pay.newCard(CARDS.mastercard), coupon: 'SAVE10' });

      await order.goto(placed.id);

      await expect(order.items).toHaveText(`1 × ${arcHeadphones.name} · ${formatUsd(arcHeadphones.price)}`);
      await expect(order.totals.value('Coupon SAVE10')).toHaveText('−$12.90');
      await expect(order.totals.value('Mastercard 10%')).toHaveText('−$11.61');
      await expect(order.totals.value('Total')).toHaveText('$111.49');
      await expect(order.fact('Payment')).toHaveText(`Mastercard •••• ${CARDS.mastercard.last4}`);
      await expect(order.fact('Deliver to')).toHaveText('Alex Tester12 Test Avenue71000 Sarajevo, BA');
      const placedOn = await page.evaluate((iso) => new Date(iso).toLocaleString(), placed.createdAt);
      await expect(order.fact('Placed')).toHaveText(placedOn);
    });

    test('ORD-008 Failed order can put products back in the bag', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const order = new OrderPage(page);
      const { order: declined } = await placeAndSettle(api, [{ productId: stillMug.id, quantity: 1 }], pay.newCard(CARDS.declined));
      await order.goto(declined.id);

      await order.restoreBagButton.click();

      await order.notifications.expectShown('success', { title: 'Bag restored', message: 'The products are back in your bag. Try another payment method.' });
      await expect(page).toHaveURL(/#checkout$/);
      await expect(order.header.bagCount).toHaveText('1');
      expect(await (await api.cart.get()).json()).toEqual([{ productId: stillMug.id, quantity: 1 }]);
    });

    test('ORD-009 Confirmed order has no restore button', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const order = new OrderPage(page);
      const { order: confirmed } = await placeAndSettle(api, [{ productId: pureToothbrush.id, quantity: 1 }], pay.wallet());

      await order.goto(confirmed.id);

      await expect(order.bannerFor('confirmed')).toBeVisible();
      await expect(order.restoreBagButton).toHaveCount(0);
    });

    test("ORD-010 Another customer's order shows an error", { tag: '@regression' }, async ({ signedInPage: page, request, createUser }) => {
      const order = new OrderPage(page);
      const customerA = createApiClients(request, (await createUser()).token);
      const { order: orderA } = await placeOrder(customerA, [{ productId: pureToothbrush.id, quantity: 1 }], pay.wallet());

      await order.goto(orderA.id);

      await expect(order.main.locator('.inline-error')).toHaveText('Order not found');
      await expect(order.main.getByRole('link', { name: 'Back to my orders' })).toBeVisible();
      await expect(order.banner).toHaveCount(0);
      await expect(order.facts).toHaveCount(0);
    });

    test('ORD-011 Signed out order link asks to sign in', { tag: '@regression' }, async ({ page }) => {
      const order = new OrderPage(page);
      await order.goto('00000000-0000-4000-8000-000000000000');

      await expect(order.main.getByRole('heading', { name: 'Sign in to see this order' })).toBeVisible();
      await expect(order.main.getByRole('button', { name: 'Sign in' })).toBeVisible();
      await expect(order.main.getByRole('button', { name: 'Create account' })).toBeVisible();
    });
  });

  test.describe('messages', () => {
    test('ORD-020 Placing an order shows "Order placed"', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      const checkout = await placeInBrowser(page, api, saveCards, CARDS.visa, markHighlighter.id);

      await checkout.notifications.expectShown('success', {
        title: 'Order placed',
        message: `Order ${shortIdFromUrl(page)} was placed successfully. We are processing your payment now.`,
      });
    });

    test('ORD-022 Payment failed message for a declined card', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      const checkout = await placeInBrowser(page, api, saveCards, CARDS.declined, markHighlighter.id);
      const shortId = shortIdFromUrl(page);

      await expect(checkout.notifications.find('error', { title: 'Payment failed' })).toHaveText(
        `!Payment failedYour card was declined. Order ${shortId} was cancelled and you were not charged.×`,
        settle,
      );
    });

    test('ORD-024 Payment result is shown only once', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      const checkout = await placeInBrowser(page, api, saveCards, CARDS.visa, markHighlighter.id);
      const orderId = page.url().split('/').pop() as string;
      const paid = checkout.notifications.find('success', { title: 'Payment successful' });
      await expect(paid).toHaveCount(1, settle);

      await page.reload();
      await new OrdersPage(page).goto();
      await new OrderPage(page).goto(orderId);
      await page.waitForTimeout(4_500); // two polling rounds of the storefront

      await expect(paid).toHaveCount(0);
    });

    test('ORD-025 Messages close by click and by time', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      await page.clock.install();
      const checkout = await openEmptyCheckout(page, api);
      const notifications = checkout.notifications;
      // Real messages: an invalid form gives an error; going offline and back gives a warning and a success.
      await checkout.placeOrder();
      await page.context().setOffline(true);
      await page.context().setOffline(false);
      const error = notifications.find('error', { title: 'Order not placed' });
      const warning = notifications.find('warning', { title: 'No connection' });
      const success = notifications.find('success', { message: 'The connection is back.' });
      await expect(error).toBeVisible();
      await expect(success).toBeVisible();

      await warning.getByRole('button', { name: 'Dismiss notification' }).click();
      await page.clock.runFor(300);
      await expect(warning, 'clicked message closes at once').toHaveCount(0);

      await page.clock.runFor(4_400);
      await expect(success).toBeVisible();
      await page.clock.runFor(600);
      await expect(success, 'success closes after 5 s').toHaveCount(0);
      await expect(error).toBeVisible();

      await page.clock.runFor(4_000);
      await expect(error, 'error closes after 9 s').toHaveCount(0);
    });
  });

  test.describe('My orders', () => {
    test('ORD-030 My orders lists own orders newest first', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const orders = new OrdersPage(page);
      const { order: first } = await placeAndSettle(api, [{ productId: pureToothbrush.id, quantity: 1 }], pay.wallet());
      const { order: second } = await placeAndSettle(api, [{ productId: arcHeadphones.id, quantity: 1 }], { ...pay.wallet(), coupon: 'SAVE10' });

      await orders.goto();

      await expect(orders.orders).toHaveCount(2);
      await expect(orders.orders.nth(0)).toHaveAttribute('data-order-id', second.id);
      await expect(orders.orders.nth(1)).toHaveAttribute('data-order-id', first.id);
      const latest = orders.order(second.id);
      await expect(latest.getByRole('heading')).toHaveText(`Order ${second.id.slice(0, 8)}`);
      await expect(latest.locator('.hint')).toContainText(`${formatUsd(second.total)} · Test wallet · saved ${formatUsd(second.discount)}`);
      await expect(orders.statusOf(second.id)).toHaveText('confirmed');
      await expect(latest.locator('.order-items')).toHaveText(`1 × ${arcHeadphones.name} · ${formatUsd(arcHeadphones.price)}`);
      await expect(orders.order(first.id).locator('.hint')).not.toContainText('saved');
    });

    test('ORD-031 Order number opens the order page', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const orders = new OrdersPage(page);
      const { order } = await placeOrder(api, [{ productId: pureToothbrush.id, quantity: 1 }], pay.wallet());
      await orders.goto();

      await orders.order(order.id).getByRole('link', { name: `Order ${order.id.slice(0, 8)}` }).click();

      await expect(page).toHaveURL(new RegExp(`#order/${order.id}$`));
    });

    test('ORD-033 No orders shows the empty message', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const orders = new OrdersPage(page);
      await orders.goto();

      await expect(orders.emptyState).toBeVisible();
      await expect(orders.main.getByRole('link', { name: 'Explore the collection →' })).toBeVisible();
    });
  });
});
