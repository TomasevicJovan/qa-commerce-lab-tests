import { test, expect } from '@core/fixtures';
import { CARDS, PRODUCTS } from '@core/test-data';
import { quoteServerTotal } from '@core/flows/order-flow';
import { pay } from '@core/factories/checkout-factory';

test.describe('Pricing', { tag: ['@pricing', '@api'] }, () => {
  test('PRICE-004 Arc Wireless Headphones + SAVE10 + Mastercard → $111.49', { tag: '@smoke' }, async ({ api, saveCards }) => {
    const [mastercard] = await saveCards(CARDS.mastercard);

    const total = await quoteServerTotal(api, [{ productId: PRODUCTS.arcHeadphones.id, quantity: 1 }], {
      coupon: 'SAVE10',
      ...pay.savedCard(mastercard?.id ?? ''),
    });

    expect(total).toBe(11_149);
  });
});
