import { test, expect } from '@core/fixtures';
import { CARDS, PRODUCTS } from '@data/index';
import { placeAndSettle, quoteServerTotal } from '@core/flows/order-flow';
import { pay } from '@core/factories/checkout-factory';
import { calculateTotals } from '@core/pricing';
import { ARC_ALL_DISCOUNTS, PRICE_TABLE } from '@data/cases/pricing';

const { arcHeadphones } = PRODUCTS;

test.describe('Pricing', { tag: ['@pricing', '@api'] }, () => {
  test('PRICE-004 Arc Wireless Headphones + SAVE10 + Mastercard → $111.49', { tag: '@smoke' }, async ({ api, saveCards }) => {
    const [mastercard] = await saveCards(CARDS.mastercard);

    const total = await quoteServerTotal(api, [...ARC_ALL_DISCOUNTS.items], { coupon: ARC_ALL_DISCOUNTS.coupon, ...pay.savedCard(mastercard?.id ?? '') });

    expect(total).toBe(ARC_ALL_DISCOUNTS.total);
  });

  for (const row of PRICE_TABLE) {
    test(`${row.id} ${row.title}`, { tag: '@regression' }, async ({ api }) => {
      const options = { coupon: row.coupon ?? '', ...pay.newCard(row.mastercard ? CARDS.mastercard : CARDS.visa) };

      const total = await quoteServerTotal(api, row.items, options);

      expect(total, 'server total').toBe(row.total);
      // The oracle must agree with the fixed table; if it does not, the oracle is wrong, not the shop.
      const prices = Object.values(PRODUCTS);
      const lines = row.items.map((i) => {
        const p = prices.find((x) => x.id === i.productId)!;
        return { unitPrice: p.price, quantity: i.quantity, freeShipping: p.freeShipping === true };
      });
      const oracle = calculateTotals(lines, { coupon: row.coupon, cardBrand: row.mastercard ? 'mastercard' : 'visa' });
      expect(oracle, 'oracle').toMatchObject({ total: row.total, shipping: row.shipping });
    });
  }

  test('PRICE-030 Order stores the breakdown', { tag: '@regression' }, async ({ api }) => {
    const { items, coupon, subtotal, couponDiscount, paymentDiscount, discount, shipping, total } = ARC_ALL_DISCOUNTS;
    const { order } = await placeAndSettle(api, [...items], { coupon, ...pay.newCard(CARDS.mastercard) });

    expect(order).toMatchObject({
      subtotal,
      couponDiscount,
      paymentDiscount,
      discount,
      shipping,
      total,
      payment: { method: 'card', brand: 'mastercard', last4: CARDS.mastercard.last4 },
    });
    expect(order.items).toEqual([expect.objectContaining({ productId: arcHeadphones.id, unitPrice: arcHeadphones.price, freeShipping: false })]);
  });
});
