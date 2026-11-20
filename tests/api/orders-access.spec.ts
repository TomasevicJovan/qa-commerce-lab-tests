import { test, expect } from '@core/fixtures';
import { createApiClients } from '@api/index';
import { placeOrder } from '@core/flows/order-flow';
import { expectMatchesContract } from '@core/schema-validator';
import { STOCK_OWNERS } from '@core/test-products';

// CF-09 / API-04: another customer's order must look exactly like one that does not exist.
test("a customer cannot read another customer's order or payment", { tag: ['@regression', '@api'] }, async ({ api, createUser, request }) => {
  const placed = await test.step('the worker customer places an order', () => placeOrder(api, [{ productId: STOCK_OWNERS.ordersAccess.id, quantity: 1 }]));
  const stranger = createApiClients(request, (await createUser()).token);

  await test.step('owner can read it', async () => {
    const response = await api.orders.get(placed.order.id);
    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'get', '/orders/{orderId}');
  });

  await test.step('stranger gets 404 for the order and its payment', async () => {
    for (const response of [await stranger.orders.get(placed.order.id), await stranger.payments.get(placed.order.id)]) {
      expect(response.status()).toBe(404);
      expect((await response.json()).error).toBe('Order not found');
    }
  });

  await test.step("stranger's order list does not contain it", async () => {
    expect(await (await stranger.orders.list()).json()).toEqual([]);
  });
});
