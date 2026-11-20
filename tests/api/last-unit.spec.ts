import { test, expect } from '@core/fixtures';
import { createApiClients } from '@api/index';
import { availableStock, placeOrder, waitForTerminalOrder } from '@core/flows/order-flow';
import type { Payment } from '@api/types';
import { STOCK_OWNERS } from '@core/test-products';

// Pocket Mini Speaker is seeded with exactly one unit (docs/CHALLENGES.md, EVT-01).
const LAST_UNIT_PRODUCT = STOCK_OWNERS.lastUnitRace.id;

test.describe('Stock competition', () => {
  test('two customers race for the last unit: exactly one wins and stock never goes negative', { tag: ['@regression', '@api'] }, async ({ anonApi, createUser, request }) => {
    const stock = await availableStock(anonApi, LAST_UNIT_PRODUCT);
    test.skip(stock !== 1, `Needs fresh lab data (${LAST_UNIT_PRODUCT} has ${stock} units, expected 1). Runs on every CI build.`);

    const [alice, bob] = await Promise.all([createUser(), createUser()]);
    const aliceApi = createApiClients(request, alice.token);
    const bobApi = createApiClients(request, bob.token);

    const [aliceOrder, bobOrder] = await test.step('both check out at the same time, both are accepted', () =>
      Promise.all([
        placeOrder(aliceApi, [{ productId: LAST_UNIT_PRODUCT, quantity: 1 }]),
        placeOrder(bobApi, [{ productId: LAST_UNIT_PRODUCT, quantity: 1 }]),
      ]),
    );

    const [aliceFinal, bobFinal] = await test.step('wait for both outcomes', () =>
      Promise.all([waitForTerminalOrder(aliceApi, aliceOrder.order.id), waitForTerminalOrder(bobApi, bobOrder.order.id)]),
    );

    await test.step('one confirmed, one rejected, stock is zero', async () => {
      expect([aliceFinal.status, bobFinal.status].sort()).toEqual(['confirmed', 'rejected']);
      expect(await availableStock(anonApi, LAST_UNIT_PRODUCT)).toBe(0);
    });

    await test.step('the losing customer was never charged', async () => {
      const [loser, loserApi] = aliceFinal.status === 'rejected' ? [aliceFinal, aliceApi] : [bobFinal, bobApi];
      expect(loser.reason).toBe('Insufficient stock');
      const payment = (await (await loserApi.payments.get(loser.id)).json()) as Payment;
      expect(payment).toEqual({ orderId: loser.id, status: 'pending' });
    });
  });
});
