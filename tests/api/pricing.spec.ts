import { test, expect } from '@core/fixtures';
import { CARDS, PRODUCTS } from '@core/test-data';
import { placeAndSettle, quoteServerTotal } from '@core/flows/order-flow';
import { pay } from '@core/factories/checkout-factory';
import { calculateTotals } from '@core/pricing';
import type { CartItem } from '@api/types';

const { arcHeadphones, pebbleClock, foldOrganizer, loopKeyboard, orbitLamp, noteJournal, stillMug, novaChair, pulseController, pocketNotebook, twistGrip } = PRODUCTS;

interface PriceRow {
  id: string;
  title: string;
  items: CartItem[];
  coupon?: string;
  mastercard?: boolean;
  total: number;
  shipping: number;
}

const line = (product: { id: string }, quantity = 1): CartItem => ({ productId: product.id, quantity });

/** Decision table from docs/BUSINESS.md. Expected totals are fixed numbers, not computed. */
const TABLE: PriceRow[] = [
  { id: 'PRICE-001', title: '1 × Arc Wireless Headphones → $136.00', items: [line(arcHeadphones)], total: 13_600, shipping: 700 },
  { id: 'PRICE-002', title: '1 × Arc Wireless Headphones + SAVE10 → $123.10', items: [line(arcHeadphones)], coupon: 'SAVE10', total: 12_310, shipping: 700 },
  { id: 'PRICE-003', title: '1 × Arc Wireless Headphones + Mastercard → $123.10', items: [line(arcHeadphones)], mastercard: true, total: 12_310, shipping: 700 },
  { id: 'PRICE-005', title: 'Exactly $150.00 ships free (boundary is inclusive)', items: [line(pebbleClock), line(foldOrganizer, 3)], total: 15_000, shipping: 0 },
  { id: 'PRICE-006', title: '$149.00 pays shipping → $156.00', items: [line(loopKeyboard)], total: 15_600, shipping: 700 },
  { id: 'PRICE-007', title: '2 × Orbit Desk Lamp → $158.00 (free shipping)', items: [line(orbitLamp, 2)], total: 15_800, shipping: 0 },
  { id: 'PRICE-008', title: '2 × Orbit Desk Lamp + SAVE10 → $149.20 (coupon brings shipping back)', items: [line(orbitLamp, 2)], coupon: 'SAVE10', total: 14_920, shipping: 700 },
  { id: 'PRICE-009', title: '2 × Orbit Desk Lamp + Mastercard → $149.20 (Mastercard brings shipping back)', items: [line(orbitLamp, 2)], mastercard: true, total: 14_920, shipping: 700 },
  { id: 'PRICE-010', title: '2 × Orbit Desk Lamp + SAVE10 + Mastercard → $134.98', items: [line(orbitLamp, 2)], coupon: 'SAVE10', mastercard: true, total: 13_498, shipping: 700 },
  { id: 'PRICE-011', title: '1 × Note Dotted Journal (all items ship free) → $18.00', items: [line(noteJournal)], total: 1_800, shipping: 0 },
  { id: 'PRICE-012', title: 'Note Dotted Journal + Still Ceramic Mug (mixed) → $49.00', items: [line(noteJournal), line(stillMug)], total: 4_900, shipping: 700 },
  { id: 'PRICE-013', title: 'Nova Gaming Chair is charged at the Black Friday price → $249.00', items: [line(novaChair)], total: 24_900, shipping: 0 },
  { id: 'PRICE-014', title: 'Pulse Wireless Controller (deal) + SAVE10 + Mastercard → $54.79', items: [line(pulseController)], coupon: 'SAVE10', mastercard: true, total: 5_479, shipping: 700 },
  { id: 'PRICE-020', title: 'Pocket Notebook 3-pack + SAVE10 → $24.95 (1.995 rounds up)', items: [line(pocketNotebook)], coupon: 'SAVE10', total: 2_495, shipping: 700 },
  { id: 'PRICE-021', title: 'Pocket Notebook 3-pack + SAVE10 + Mastercard → $23.15 (1.795 rounds up)', items: [line(pocketNotebook)], coupon: 'SAVE10', mastercard: true, total: 2_315, shipping: 700 },
  { id: 'PRICE-022', title: 'Twist Phone Grip + SAVE10 + Mastercard → $17.48 (1.165 rounds up)', items: [line(twistGrip)], coupon: 'SAVE10', mastercard: true, total: 1_748, shipping: 700 },
];

test.describe('Pricing', { tag: ['@pricing', '@api'] }, () => {
  test('PRICE-004 Arc Wireless Headphones + SAVE10 + Mastercard → $111.49', { tag: '@smoke' }, async ({ api, saveCards }) => {
    const [mastercard] = await saveCards(CARDS.mastercard);

    const total = await quoteServerTotal(api, [line(arcHeadphones)], { coupon: 'SAVE10', ...pay.savedCard(mastercard?.id ?? '') });

    expect(total).toBe(11_149);
  });

  for (const row of TABLE) {
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
    const { order } = await placeAndSettle(api, [line(arcHeadphones)], { coupon: 'SAVE10', ...pay.newCard(CARDS.mastercard) });

    expect(order).toMatchObject({
      subtotal: 12_900,
      couponDiscount: 1_290,
      paymentDiscount: 1_161,
      discount: 2_451,
      shipping: 700,
      total: 11_149,
      payment: { method: 'card', brand: 'mastercard', last4: CARDS.mastercard.last4 },
    });
    expect(order.items).toEqual([expect.objectContaining({ productId: arcHeadphones.id, unitPrice: 12_900, freeShipping: false })]);
  });
});
