import { test, expect } from '@core/fixtures';
import { availableStock, placeOrder, waitForTerminalOrder } from '@core/flows/order-flow';
import type { Order } from '@api/types';

// CF-08: a paused consumer delays processing but loses nothing; resuming drains the backlog.
test('orders wait while inventory is paused and complete after it resumes', { tag: ['@regression', '@api'] }, async ({ api, lab }) => {
  const productId = 'p2';
  await lab.set({ pauseInventory: true });
  const stockBefore = await availableStock(api, productId);

  const placed = await test.step('place an order while inventory is paused', () => placeOrder(api, [{ productId, quantity: 1 }]));

  await test.step('nothing is reserved while paused', async () => {
    // Proving that something does NOT happen needs a time window. Consumers poll every ~200 ms,
    // so 1.5 s is several processing cycles.
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    const order = (await (await api.orders.get(placed.order.id)).json()) as Order;
    expect(order.status).toBe('pending');
    expect(await availableStock(api, productId)).toBe(stockBefore);
  });

  await test.step('resume inventory', () => lab.set({ pauseInventory: false }));

  const order = await test.step('the backlog drains without a new order', () => waitForTerminalOrder(api, placed.order.id));
  expect(order.status).toBe('confirmed');
  expect(await availableStock(api, productId)).toBe(stockBefore - 1);
});
