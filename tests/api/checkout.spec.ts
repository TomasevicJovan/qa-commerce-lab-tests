import { test, expect } from '@core/fixtures';
import { CARDS, PRODUCTS } from '@core/test-data';
import { availableStock, placeOrder, waitForTerminalOrder } from '@core/flows/order-flow';
import { pay } from '@core/factories/checkout-factory';
import type { Payment } from '@api/types';

test.describe('Checkout and card payments', { tag: ['@checkout', '@api'] }, () => {
  test('CHK-083 Any other valid card is declined after acceptance', { tag: '@smoke' }, async ({ api }) => {
    const product = PRODUCTS.markHighlighter;
    const stockBefore = await availableStock(api, product.id);

    const { order: accepted, expected } = await placeOrder(api, [{ productId: product.id, quantity: 1 }], pay.newCard(CARDS.declined));
    expect(accepted.status).toBe('pending');

    const order = await waitForTerminalOrder(api, accepted.id);
    expect(order).toMatchObject({ status: 'cancelled', reason: 'card_declined' });
    const payment = (await (await api.payments.get(order.id)).json()) as Payment;
    expect(payment).toMatchObject({ status: 'failed', reason: 'card_declined', amount: expected.total, brand: 'visa', last4: CARDS.declined.last4 });
    await expect.poll(() => availableStock(api, product.id)).toBe(stockBefore);
  });
});
