import { test, expect } from '@core/fixtures';
import { availableStock, placeOrder, waitForTerminalOrder } from '@core/flows/order-flow';
import type { LabStatus, Payment } from '@api/types';
import { STOCK_OWNERS } from '@core/test-products';

// EVT-03: at-least-once delivery must still produce exactly-once business effects.
test('duplicate event deliveries charge once and deduct stock once', { tag: ['@regression', '@api'] }, async ({ api, anonApi, lab }) => {
  const productId = STOCK_OWNERS.duplicateEvents.id;
  await lab.set({ duplicateEvents: true });
  const stockBefore = await availableStock(api, productId);

  const placed = await test.step('place an order with duplicates enabled', () => placeOrder(api, [{ productId, quantity: 1 }]));
  const order = await test.step('wait for the final state', () => waitForTerminalOrder(api, placed.order.id));

  await test.step('effects happened exactly once', async () => {
    expect(order.history.map((h) => h.status)).toEqual(['pending', 'payment_pending', 'confirmed']);
    const payment = (await (await api.payments.get(order.id)).json()) as Payment;
    expect(payment).toMatchObject({ status: 'approved', amount: placed.order.total });
    expect(await availableStock(api, productId)).toBe(stockBefore - 1);
  });

  const { transport } = (await (await anonApi.lab.status()).json()) as LabStatus;
  if (transport === 'local') {
    await test.step('local broker audit shows the redelivered copies', async () => {
      await expect.poll(async () => (await lab.eventsFor(order.id)).some((e) => e.originalId)).toBe(true);
    });
  }
  // In Kafka mode the audit mirror deduplicates same-id messages, so duplicates are only visible
  // with Kafka tooling; the effect assertions above are what matters in both transports.
});
