import { randomUUID } from 'node:crypto';
import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { CheckoutPage, OrderPage, OrdersPage } from '@pages/index';
import { AUTH_TEXT, CARDS, CHECKOUT_TEXT, COUPONS, ORDER_TEXT, PAYMENT_TEXT, PRODUCTS, STOREFRONT_TIMING, TOTALS_TEXT, type TestCard } from '@data/index';
import { drainStockTo, ensureStock, placeAndSettle, placeOrder, setCart } from '@core/flows/order-flow';
import { formatAddress, pay } from '@core/factories/checkout-factory';
import { calculateTotals, formatUsd } from '@core/pricing';
import { config } from '@core/config';
import { createApiClients, type ApiClients } from '@api/index';

const { stillMug, novaChair, arcHeadphones, markHighlighter, pureToothbrush, domeLamp } = PRODUCTS;
const { banners, notifications } = ORDER_TEXT;
const settle = { timeout: config.orderTimeoutMs };
const mugTotal = calculateTotals([{ unitPrice: stillMug.price, quantity: 1 }]).total;

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
      await expect(order.heading).toHaveText(ORDER_TEXT.headings.confirmed);
      await expect(order.banner).toHaveText(banners.confirmed(mugTotal));
    });

    test('ORD-003 Declined card shows Payment failed', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      const order = new OrderPage(page);
      await placeInBrowser(page, api, saveCards, CARDS.declined);

      await expect(order.bannerFor('cancelled')).toBeVisible(settle);
      await expect(order.heading).toHaveText(ORDER_TEXT.headings.failed);
      await expect(order.banner).toHaveText(banners.declined);
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
      await expect(order.banner).toHaveText(banners.outOfStock);
    });

    test('ORD-005 Progress lists every status in order', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const order = new OrderPage(page);
      const { order: approved } = await placeAndSettle(api, [{ productId: markHighlighter.id, quantity: 1 }], pay.newCard(CARDS.visa));
      const { order: declined } = await placeAndSettle(api, [{ productId: markHighlighter.id, quantity: 1 }], pay.newCard(CARDS.declined));

      for (const { id, steps } of [
        { id: approved.id, steps: ORDER_TEXT.steps.confirmed },
        { id: declined.id, steps: ORDER_TEXT.steps.declined },
      ]) {
        await order.goto(id);
        await expect(order.timelineSteps).toHaveText([...steps]);
        for (const time of await order.timelineTimes.all()) await expect(time).toHaveText(/\d{1,2}:\d{2}:\d{2}/);
      }
    });

    test('ORD-006 Summary shows products, totals, payment, address and time', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const order = new OrderPage(page);
      const { order: placed, body } = await placeAndSettle(api, [{ productId: arcHeadphones.id, quantity: 1 }], { ...pay.newCard(CARDS.mastercard), coupon: COUPONS.save10 });
      const expected = calculateTotals([{ unitPrice: arcHeadphones.price, quantity: 1 }], { coupon: COUPONS.save10, cardBrand: 'mastercard' });

      await order.goto(placed.id);

      await expect(order.items).toHaveText(ORDER_TEXT.itemLine(1, arcHeadphones.name, arcHeadphones.price));
      await expect(order.totals.value(TOTALS_TEXT.coupon(COUPONS.save10))).toHaveText(TOTALS_TEXT.minus(expected.couponDiscount));
      await expect(order.totals.value(TOTALS_TEXT.mastercard)).toHaveText(TOTALS_TEXT.minus(expected.paymentDiscount));
      await expect(order.totals.value(TOTALS_TEXT.total)).toHaveText(formatUsd(expected.total));
      await expect(order.fact(ORDER_TEXT.facts.payment)).toHaveText(PAYMENT_TEXT.card(CARDS.mastercard.brand, CARDS.mastercard.last4));
      await expect(order.fact(ORDER_TEXT.facts.deliverTo)).toHaveText(formatAddress(body.address));
      const placedOn = await page.evaluate((iso) => new Date(iso).toLocaleString(), placed.createdAt);
      await expect(order.fact(ORDER_TEXT.facts.placed)).toHaveText(placedOn);
    });

    test('ORD-008 Failed order can put products back in the bag', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const order = new OrderPage(page);
      const { order: declined } = await placeAndSettle(api, [{ productId: stillMug.id, quantity: 1 }], pay.newCard(CARDS.declined));
      await order.goto(declined.id);

      await order.restoreBagButton.click();

      await order.notifications.expectShown('success', notifications.bagRestored);
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

      await expect(order.notFoundMessage).toHaveText(ORDER_TEXT.notFound);
      await expect(order.backToOrdersLink).toBeVisible();
      await expect(order.banner).toHaveCount(0);
      await expect(order.facts).toHaveCount(0);
    });

    test('ORD-011 Signed out order link asks to sign in', { tag: '@regression' }, async ({ page }) => {
      const order = new OrderPage(page);
      await order.goto(randomUUID());

      await expect(order.emptyMessageHeading).toHaveText(AUTH_TEXT.signedOutPages.order);
      await expect(order.signedOutSignIn).toBeVisible();
      await expect(order.signedOutCreateAccount).toBeVisible();
    });
  });

  test.describe('messages', () => {
    test('ORD-020 Placing an order shows "Order placed"', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      const checkout = await placeInBrowser(page, api, saveCards, CARDS.visa, markHighlighter.id);

      await checkout.notifications.expectShown('success', {
        title: CHECKOUT_TEXT.notifications.placed.title,
        message: CHECKOUT_TEXT.notifications.placed.message(new OrderPage(page).idFromUrl()),
      });
    });

    test('ORD-022 Payment failed message for a declined card', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      const checkout = await placeInBrowser(page, api, saveCards, CARDS.declined, markHighlighter.id);
      const orderId = new OrderPage(page).idFromUrl();

      await expect(checkout.notifications.find('error', { title: notifications.declined.title })).toContainText(
        notifications.declined.message(orderId),
        settle,
      );
    });

    test('ORD-023 Out of stock message', { tag: '@regression' }, async ({ signedInPage: page, api, request, createUser, saveCards }) => {
      // Same race as ORD-004, on its own product so the two tests never share the last unit.
      const lamp = domeLamp;
      const customerA = createApiClients(request, (await createUser()).token);
      await drainStockTo(api, createApiClients(request, (await createUser()).token), lamp.id, 1);
      await saveCards(CARDS.visa);
      await setCart(api, [{ productId: lamp.id, quantity: 1 }]);
      const checkout = new CheckoutPage(page);
      await checkout.goto();
      await checkout.waitForForm();
      const { order: orderA } = await placeAndSettle(customerA, [{ productId: lamp.id, quantity: 1 }], pay.wallet());
      expect(orderA.status).toBe('confirmed');

      await checkout.placeOrder();

      await expect(page).toHaveURL(/#order\//);
      await expect(checkout.notifications.find('error', { title: notifications.outOfStock.title })).toContainText(
        notifications.outOfStock.message(new OrderPage(page).idFromUrl()),
        settle,
      );
    });

    test('ORD-024 Payment result is shown only once', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      const checkout = await placeInBrowser(page, api, saveCards, CARDS.visa, markHighlighter.id);
      const orderId = new OrderPage(page).idFromUrl();
      const paid = checkout.notifications.find('success', { title: notifications.paid.title });
      await expect(paid).toHaveCount(1, settle);

      await page.reload();
      await new OrdersPage(page).goto();
      await new OrderPage(page).goto(orderId);
      await page.waitForTimeout(STOREFRONT_TIMING.orderPollMs * 2 + 500); // two polling rounds of the storefront

      await expect(paid).toHaveCount(0);
    });

    test('ORD-025 Messages close by click and by time', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      await page.clock.install();
      const checkout = await openEmptyCheckout(page, api);
      const shown = checkout.notifications;
      // Real messages: an invalid form gives an error; going offline and back gives a warning and a success.
      await checkout.placeOrder();
      await page.context().setOffline(true);
      await page.context().setOffline(false);
      const error = shown.find('error', { title: CHECKOUT_TEXT.notifications.invalidForm.title });
      const warning = shown.find('warning', { title: notifications.offline.title });
      const success = shown.find('success', { message: notifications.online.message });
      await expect(error).toBeVisible();
      await expect(success).toBeVisible();

      await shown.dismissButton(warning).click();
      await page.clock.runFor(300);
      await expect(warning, 'clicked message closes at once').toHaveCount(0);

      await page.clock.runFor(STOREFRONT_TIMING.notificationMs - 600);
      await expect(success).toBeVisible();
      await page.clock.runFor(600);
      await expect(success, 'success closes after 5 s').toHaveCount(0);
      await expect(error).toBeVisible();

      await page.clock.runFor(STOREFRONT_TIMING.errorNotificationMs - STOREFRONT_TIMING.notificationMs);
      await expect(error, 'error closes after 9 s').toHaveCount(0);
    });
  });

  test.describe('My orders', () => {
    test('ORD-030 My orders lists own orders newest first', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const orders = new OrdersPage(page);
      const { order: first } = await placeAndSettle(api, [{ productId: pureToothbrush.id, quantity: 1 }], pay.wallet());
      const { order: second } = await placeAndSettle(api, [{ productId: arcHeadphones.id, quantity: 1 }], { ...pay.wallet(), coupon: COUPONS.save10 });

      await orders.goto();

      await expect(orders.orders).toHaveCount(2);
      expect(await orders.orderIds()).toEqual([second.id, first.id]);
      await expect(orders.orderLink(second.id)).toHaveText(ORDER_TEXT.eyebrow(second.id));
      await expect(orders.summaryOf(second.id)).toContainText(ORDER_TEXT.listHint(second.total, PAYMENT_TEXT.wallet, second.discount));
      await expect(orders.statusOf(second.id)).toHaveText(ORDER_TEXT.listStatus.confirmed);
      await expect(orders.itemsOf(second.id)).toHaveText(ORDER_TEXT.itemLine(1, arcHeadphones.name, arcHeadphones.price));
      await expect(orders.summaryOf(first.id)).toContainText(ORDER_TEXT.listHint(first.total, PAYMENT_TEXT.wallet));
      await expect(orders.summaryOf(first.id)).not.toContainText(ORDER_TEXT.listSavedMarker);
    });

    test('ORD-031 Order number opens the order page', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const orders = new OrdersPage(page);
      const { order } = await placeOrder(api, [{ productId: pureToothbrush.id, quantity: 1 }], pay.wallet());
      await orders.goto();

      await orders.openOrder(order.id);

      await expect(page).toHaveURL(new RegExp(`#order/${order.id}$`));
    });

    test('ORD-033 No orders shows the empty message', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const orders = new OrdersPage(page);
      await orders.goto();

      await expect(orders.emptyState).toBeVisible();
      await expect(orders.emptyMessageLink).toHaveText(ORDER_TEXT.noOrdersLink);
    });
  });
});
