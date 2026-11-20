import { test, expect } from '@core/fixtures';
import { authoritativeLines, quoteServerTotal } from '@core/flows/order-flow';
import { calculateTotals, formatUsd } from '@core/pricing';
import type { CartItem } from '@api/types';

interface PricingCase {
  name: string;
  items: CartItem[];
  coupon?: string;
  expectedTotal: number;
}

// Examples from docs/BUSINESS.md plus both sides of the inclusive $150 free-shipping boundary.
const CASES: PricingCase[] = [
  { name: '1 x Arc Headphones pays $7 shipping', items: [{ productId: 'p1', quantity: 1 }], expectedTotal: 13_600 },
  { name: '1 x Arc Headphones with SAVE10', items: [{ productId: 'p1', quantity: 1 }], coupon: 'SAVE10', expectedTotal: 12_310 },
  {
    name: '2 x Orbit Lamp with SAVE10 drops below the threshold after discount',
    items: [{ productId: 'p2', quantity: 2 }],
    coupon: 'SAVE10',
    expectedTotal: 14_920,
  },
  {
    name: 'exactly $150.00 ships free (boundary is inclusive)',
    items: [
      { productId: 'p7', quantity: 1 },
      { productId: 'p8', quantity: 3 },
    ],
    expectedTotal: 15_000,
  },
  { name: '$149.00 is just below the boundary and pays shipping', items: [{ productId: 'p3', quantity: 1 }], expectedTotal: 15_600 },
];

test.describe('Pricing rules', () => {
  for (const pricing of CASES) {
    test(`server total matches the documented rules: ${pricing.name}`, { tag: ['@regression', '@api'] }, async ({ api }) => {
      const oracle = await test.step('calculate with the documented formula', async () => {
        const lines = await authoritativeLines(api, pricing.items);
        return calculateTotals(lines, pricing.coupon);
      });
      expect(oracle.total, 'test data agrees with the formula').toBe(pricing.expectedTotal);

      const serverTotal = await test.step('ask the backend for its total', () =>
        quoteServerTotal(api, pricing.items, pricing.coupon),
      );

      expect(serverTotal, `server says ${formatUsd(serverTotal)}, rules say ${formatUsd(oracle.total)}`).toBe(oracle.total);
    });
  }
});
