import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { CARDS, PRODUCTS } from '@core/test-data';
import { ensureStock, placeOrder, setCart, waitForTerminalOrder, expectedTotals } from '@core/flows/order-flow';
import { buildCheckout, newIdempotencyKey, pay } from '@core/factories/checkout-factory';
import type { Order, Payment } from '@api/types';

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
});
