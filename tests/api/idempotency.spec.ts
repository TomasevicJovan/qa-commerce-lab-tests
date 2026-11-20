import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { availableStock, placeOrder, waitForTerminalOrder } from '@core/flows/order-flow';
import type { Order } from '@api/types';
import { STOCK_OWNERS } from '@core/test-products';

test.describe('Checkout idempotency', () => {
  test('replaying the exact request returns the original order without a second charge', { tag: ['@regression', '@api'] }, async ({ api }) => {
    const productId = STOCK_OWNERS.idempotencyReplay.id;
    const stockBefore = await availableStock(api, productId);
    const ordersBefore = ((await (await api.orders.list()).json()) as Order[]).length;

    const placed = await test.step('place an order', () => placeOrder(api, [{ productId, quantity: 1 }]));
    const confirmed = await test.step('wait until it is processed', () => waitForTerminalOrder(api, placed.order.id));
    expect(confirmed.status).toBe('confirmed');

    const replay = await test.step('send the same body with the same key', () =>
      api.orders.place(placed.body, placed.idempotencyKey),
    );

    await test.step('original order is returned with 200, nothing new is created', async () => {
      expect(replay.status()).toBe(200);
      await expectMatchesContract(replay, 'post', '/orders');
      expect(((await replay.json()) as Order).id).toBe(placed.order.id);
      expect(((await (await api.orders.list()).json()) as Order[]).length).toBe(ordersBefore + 1);
      expect(await availableStock(api, productId)).toBe(stockBefore - 1);
    });
  });

  test('reusing a key with a different request is rejected', { tag: ['@regression', '@api'] }, async ({ api }) => {
    const placed = await placeOrder(api, [{ productId: STOCK_OWNERS.idempotencyConflict.id, quantity: 1 }]);
    const ordersAfterFirst = ((await (await api.orders.list()).json()) as Order[]).length;

    const changed = { ...placed.body, address: { ...placed.body.address, name: 'Someone Else' } };
    const response = await api.orders.place(changed, placed.idempotencyKey);

    expect(response.status()).toBe(409);
    expect((await response.json()).error).toMatch(/Idempotency key already used/);
    expect(((await (await api.orders.list()).json()) as Order[]).length).toBe(ordersAfterFirst);
  });
});
