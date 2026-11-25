import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { CheckoutPage, HomePage, OrderPage, OrdersPage } from '@pages/index';
import { CARDS, PRODUCTS } from '@core/test-data';
import { availableStock, ensureStock, placeAndSettle, placeOrder, setCart, waitForTerminalOrder } from '@core/flows/order-flow';
import { pay } from '@core/factories/checkout-factory';
import { calculateTotals, formatUsd } from '@core/pricing';
import { config } from '@core/config';
import type { ApiClients } from '@api/index';
import type { Order, Payment } from '@api/types';

const { stillMug, markHighlighter, pureToothbrush } = PRODUCTS;
const settle = { timeout: config.orderTimeoutMs };

/** Signed-in customer with a saved Visa and one Still Ceramic Mug, on the checkout page. */
async function readyToOrder(page: Page, api: ApiClients, saveCards: (...c: typeof CARDS.visa[]) => Promise<unknown>) {
  await saveCards(CARDS.visa);
  await ensureStock(api, stillMug.id, 1);
  await setCart(api, [{ productId: stillMug.id, quantity: 1 }]);
  const checkout = new CheckoutPage(page);
  await checkout.goto();
  await checkout.waitForForm();
  return checkout;
}

/** Polls the order until it reaches the given status (also non-terminal ones). */
async function waitForStatus(api: ApiClients, orderId: string, status: string): Promise<Order> {
  let latest: Order | undefined;
  await expect.poll(async () => (latest = (await (await api.orders.get(orderId)).json()) as Order).status, settle).toBe(status);
  return latest as Order;
}

// Lab switches are global, so these tests run alone in the serial "lab-scenarios" project.
test.describe('Orders, order page and payment messages', { tag: '@orders' }, () => {
  test.describe('in the browser', () => {
    test('ORD-001 Order page opens after placing an order', { tag: '@smoke' }, async ({ signedInPage: page, api, saveCards, lab }) => {
      const order = new OrderPage(page);
      await lab.set({ paymentDelay: 3000 });
      const checkout = await readyToOrder(page, api, saveCards);

      await checkout.placeOrder();

      await expect(page).toHaveURL(/#order\/[0-9a-f-]{36}$/);
      const shortId = (page.url().split('/').pop() as string).slice(0, 8);
      await expect(order.eyebrow).toHaveText(`Order ${shortId}`);
      await expect(order.heading).toHaveText('Almost there.');
      await expect(order.banner).toHaveAttribute('data-status', /^(pending|payment_pending)$/);
      await expect(order.banner).toContainText(/Order received|Processing your payment/);
    });

    test('ORD-007 Banner updates without reload', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards, lab }) => {
      const order = new OrderPage(page);
      await lab.set({ pausePayments: true });
      const checkout = await readyToOrder(page, api, saveCards);
      await checkout.placeOrder();
      await expect(order.bannerFor('payment_pending')).toContainText('Processing your payment', settle);
      let reloaded = false;
      page.on('load', () => (reloaded = true));

      await lab.set({ pausePayments: false });

      await expect(order.bannerFor('confirmed')).toContainText('Payment successful', settle);
      expect(reloaded, 'page was not reloaded').toBe(false);
    });

    test('ORD-021 Payment successful message appears on another page', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards, lab }) => {
      const home = new HomePage(page);
      await lab.set({ paymentDelay: 4000 });
      const checkout = await readyToOrder(page, api, saveCards);
      await checkout.placeOrder();
      await expect(page).toHaveURL(/#order\//);
      const shortId = (page.url().split('/').pop() as string).slice(0, 8);

      await home.header.brand.click();

      await expect(page).toHaveURL(/#home$/);
      const total = formatUsd(calculateTotals([{ unitPrice: stillMug.price, quantity: 1 }]).total);
      await expect(home.notifications.find('success', { title: 'Payment successful' })).toContainText(
        `Payment of ${total} was successful. Order ${shortId} is confirmed.`,
        { timeout: 15_000 },
      );
      await expect(page).toHaveURL(/#home$/);
    });

    test('ORD-032 Status changes without reload', { tag: '@regression' }, async ({ signedInPage: page, api, lab }) => {
      const orders = new OrdersPage(page);
      await lab.set({ pausePayments: true });
      const { order } = await placeOrder(api, [{ productId: pureToothbrush.id, quantity: 1 }], pay.wallet());
      await waitForStatus(api, order.id, 'payment_pending');
      await orders.goto();
      await expect(orders.statusOf(order.id)).toHaveText('payment pending');

      await lab.set({ pausePayments: false });

      await expect(orders.statusOf(order.id)).toHaveText('confirmed', settle);
    });
  });

  test.describe('API', { tag: '@api' }, () => {
    for (const mode of ['decline', 'timeout'] as const) {
      test(`ORD-043 Lab decline and timeout cancel the order: ${mode}`, { tag: '@regression' }, async ({ api, lab }) => {
        const stockBefore = await availableStock(api, markHighlighter.id);
        await lab.set({ paymentMode: mode });

        const { order } = await placeAndSettle(api, [{ productId: markHighlighter.id, quantity: 1 }], pay.newCard(CARDS.visa));

        expect(order).toMatchObject({ status: 'cancelled', reason: mode });
        expect(await availableStock(api, markHighlighter.id)).toBe(stockBefore);
      });
    }

    test('ORD-045 Paused inventory holds the order', { tag: '@regression' }, async ({ api, lab }) => {
      const stockBefore = await availableStock(api, pureToothbrush.id);
      await lab.set({ pauseInventory: true });

      const { order } = await placeOrder(api, [{ productId: pureToothbrush.id, quantity: 1 }], pay.wallet());
      await new Promise((r) => setTimeout(r, 2000));

      expect(((await (await api.orders.get(order.id)).json()) as Order).status).toBe('pending');
      expect(await availableStock(api, pureToothbrush.id)).toBe(stockBefore);

      await lab.set({ pauseInventory: false });
      expect((await waitForTerminalOrder(api, order.id)).status).toBe('confirmed');
      expect(await availableStock(api, pureToothbrush.id)).toBe(stockBefore - 1);
    });

    test('ORD-046 Paused payments hold the reservation', { tag: '@regression' }, async ({ api, lab }) => {
      const stockBefore = await availableStock(api, pureToothbrush.id);
      await lab.set({ pausePayments: true });

      const { order } = await placeOrder(api, [{ productId: pureToothbrush.id, quantity: 1 }], pay.wallet());
      await waitForStatus(api, order.id, 'payment_pending');
      await new Promise((r) => setTimeout(r, 2000));

      expect(((await (await api.orders.get(order.id)).json()) as Order).status).toBe('payment_pending');
      expect(await availableStock(api, pureToothbrush.id)).toBe(stockBefore - 1);

      await lab.set({ pausePayments: false });
      expect((await waitForTerminalOrder(api, order.id)).status).toBe('confirmed');
    });

    test('ORD-047 Duplicate events charge once', { tag: '@regression' }, async ({ api, lab }) => {
      const stockBefore = await availableStock(api, pureToothbrush.id);
      await lab.set({ duplicateEvents: true });

      const { order, expected } = await placeAndSettle(api, [{ productId: pureToothbrush.id, quantity: 1 }], pay.newCard(CARDS.visa));

      expect(order.status).toBe('confirmed');
      expect(order.history.map((h) => h.status)).toEqual(['pending', 'payment_pending', 'confirmed']);
      const payment = (await (await api.payments.get(order.id)).json()) as Payment;
      expect(payment).toMatchObject({ status: 'approved', amount: expected.total });
      expect(await availableStock(api, pureToothbrush.id)).toBe(stockBefore - 1);
    });
  });
});
