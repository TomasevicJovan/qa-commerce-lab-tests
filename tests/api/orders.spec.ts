import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { CARDS, PRODUCTS } from '@core/test-data';
import { availableStock, drainStockTo, ensureStock, placeAndSettle, placeOrder, setCart, waitForTerminalOrder, expectedTotals } from '@core/flows/order-flow';
import { buildCheckout, newIdempotencyKey, pay } from '@core/factories/checkout-factory';
import { createApiClients } from '@api/index';
import type { ApiError, Order, Payment } from '@api/types';

test.describe('Orders, order page and payment messages', { tag: ['@orders', '@api'] }, () => {
  test('ORD-040 New order returns 202 with status pending', { tag: '@smoke' }, async ({ api }) => {
    const items = [{ productId: PRODUCTS.pureToothbrush.id, quantity: 1 }];
    await ensureStock(api, items[0]!.productId, 1);
    await setCart(api, items);
    const expected = await expectedTotals(api, items);

    const response = await api.orders.place(buildCheckout(expected.total), newIdempotencyKey());

    expect(response.status()).toBe(202);
    await expectMatchesContract(response, 'post', '/orders');
    const order = (await response.json()) as Order;
    expect(order.status).toBe('pending');
    expect(order.history.map((h) => h.status)).toEqual(['pending']);
  });

  test('ORD-041 Approved order goes to confirmed', { tag: '@smoke' }, async ({ api }) => {
    const { order: accepted, expected } = await placeOrder(api, [{ productId: PRODUCTS.pureToothbrush.id, quantity: 1 }], pay.newCard(CARDS.visa));

    const order = await waitForTerminalOrder(api, accepted.id);

    expect(order.history.map((h) => h.status)).toEqual(['pending', 'payment_pending', 'confirmed']);
    const payment = (await (await api.payments.get(order.id)).json()) as Payment;
    expect(payment).toMatchObject({ status: 'approved', amount: expected.total });
  });

  test('ORD-042 Declined card is compensated', { tag: '@regression' }, async ({ api }) => {
    const product = PRODUCTS.stillMug;
    const stockBefore = await availableStock(api, product.id);

    const { order } = await placeAndSettle(api, [{ productId: product.id, quantity: 1 }], pay.newCard(CARDS.declined));

    expect(order.history.map((h) => h.status)).toEqual(['pending', 'payment_pending', 'compensating', 'cancelled']);
    expect(order.reason).toBe('card_declined');
    const payment = (await (await api.payments.get(order.id)).json()) as Payment;
    expect(payment.status).toBe('failed');
    expect(await availableStock(api, product.id)).toBe(stockBefore);
  });

  test('ORD-044 Two customers race for the last unit', { tag: '@regression' }, async ({ api, request, createUser }) => {
    const product = PRODUCTS.pocketSpeaker;
    const [a, b, buyer] = await Promise.all([createUser(), createUser(), createUser()]);
    const customers = [createApiClients(request, a.token), createApiClients(request, b.token)];
    await drainStockTo(api, createApiClients(request, buyer.token), product.id, 1);
    const items = [{ productId: product.id, quantity: 1 }];
    for (const customer of customers) await setCart(customer, items);
    const total = (await expectedTotals(api, items)).total;

    const responses = await Promise.all(customers.map((c) => c.orders.place(buildCheckout(total, pay.wallet()), newIdempotencyKey())));
    expect(responses.map((r) => r.status())).toEqual([202, 202]);
    const placed = (await Promise.all(responses.map((r) => r.json()))) as Order[];
    const settled = await Promise.all(placed.map((o, i) => waitForTerminalOrder(customers[i]!, o.id)));

    expect(settled.map((o) => o.status).sort()).toEqual(['confirmed', 'rejected']);
    const loserIndex = settled.findIndex((o) => o.status === 'rejected');
    expect(settled[loserIndex]!.reason).toBe('Insufficient stock');
    expect(await availableStock(api, product.id)).toBe(0);
    const loserPayment = (await (await customers[loserIndex]!.payments.get(settled[loserIndex]!.id)).json()) as Payment;
    expect(loserPayment.status, 'the loser is never charged').toBe('pending');
  });

  test("ORD-048 Another customer's order and payment return 404", { tag: '@regression' }, async ({ api, request, createUser }) => {
    const other = createApiClients(request, (await createUser()).token);
    const { order } = await placeOrder(api, [{ productId: PRODUCTS.pureToothbrush.id, quantity: 1 }], pay.wallet());

    for (const response of [await other.orders.get(order.id), await other.payments.get(order.id)]) {
      expect(response.status(), response.url()).toBe(404);
      expect(((await response.json()) as ApiError).error).toBe('Order not found');
    }
  });

  test('ORD-049 Order list contains only own orders', { tag: '@regression' }, async ({ api, request, createUser }) => {
    const b = createApiClients(request, (await createUser()).token);
    const item = [{ productId: PRODUCTS.pureToothbrush.id, quantity: 1 }];
    await placeOrder(api, item, pay.wallet());
    const { order: first } = await placeOrder(b, item, pay.wallet());
    const { order: second } = await placeOrder(b, item, pay.wallet());

    const response = await b.orders.list();

    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'get', '/orders');
    expect(((await response.json()) as Order[]).map((o) => o.id)).toEqual([second.id, first.id]);
  });

  test('ORD-050 Event stream shows the order events', { tag: '@regression' }, async ({ api, lab }) => {
    const item = [{ productId: PRODUCTS.markHighlighter.id, quantity: 1 }];
    const { order: approved } = await placeAndSettle(api, item, pay.newCard(CARDS.visa));
    const { order: declined } = await placeAndSettle(api, item, pay.newCard(CARDS.declined));

    await expect.poll(async () => (await lab.eventsFor(approved.id)).map((e) => e.type))
      .toEqual(['OrderPlaced', 'InventoryReserved', 'PaymentApproved', 'OrderConfirmed']);
    await expect.poll(async () => (await lab.eventsFor(declined.id)).map((e) => e.type))
      .toEqual(['OrderPlaced', 'InventoryReserved', 'PaymentFailed', 'InventoryReleased']);
  });
});
