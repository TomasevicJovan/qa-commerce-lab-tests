import { test, expect } from '@core/fixtures';
import { availableStock, placeOrder, waitForTerminalOrder } from '@core/flows/order-flow';
import type { Payment } from '@api/types';

// CF-05: a failed payment must release the reserved stock exactly once (saga compensation).
for (const paymentMode of ['decline', 'timeout'] as const) {
  test(`payment ${paymentMode} cancels the order and returns the reserved stock`, { tag: ['@regression', '@api'] }, async ({ api, lab }) => {
    const productId = 'p1';
    await lab.set({ paymentMode });
    const stockBefore = await availableStock(api, productId);

    const placed = await test.step('place an order', () => placeOrder(api, [{ productId, quantity: 1 }]));
    const order = await test.step('wait for the final state', () => waitForTerminalOrder(api, placed.order.id));

    await test.step('order went through compensation to cancelled', () => {
      expect(order.history.map((h) => h.status)).toEqual(['pending', 'payment_pending', 'compensating', 'cancelled']);
      expect(order.reason).toBe(paymentMode);
    });

    await test.step('one failed payment, stock restored', async () => {
      const payment = (await (await api.payments.get(order.id)).json()) as Payment;
      expect(payment).toMatchObject({ status: 'failed', reason: paymentMode, amount: placed.order.total });
      expect(await availableStock(api, productId)).toBe(stockBefore);
    });

    await test.step('audit stream shows the compensation events', async () => {
      await expect
        .poll(async () => (await lab.eventsFor(order.id)).map((e) => e.type))
        .toEqual(expect.arrayContaining(['InventoryReserved', 'PaymentFailed', 'InventoryReleased']));
    });
  });
}
