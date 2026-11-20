import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { KNOWN_ISSUES, issue } from '@core/known-issues';

test.describe('Cart API', () => {
  test('invalid carts are rejected with 422 and never replace the saved cart', { tag: ['@regression', '@api'] }, async ({ api }) => {
    const saved = [{ productId: 'p1', quantity: 2 }];

    await test.step('save a valid cart', async () => {
      const response = await api.cart.replace(saved);
      expect(response.status()).toBe(200);
      await expectMatchesContract(response, 'put', '/cart');
    });

    const invalid: [string, unknown][] = [
      ['quantity 0', [{ productId: 'p1', quantity: 0 }]],
      ['negative quantity', [{ productId: 'p1', quantity: -1 }]],
      ['fractional quantity', [{ productId: 'p1', quantity: 1.5 }]],
      ['quantity above 10', [{ productId: 'p1', quantity: 11 }]],
      ['duplicate product', [{ productId: 'p1', quantity: 1 }, { productId: 'p1', quantity: 1 }]],
      ['more than 20 lines', Array.from({ length: 21 }, (_, i) => ({ productId: `p${i}`, quantity: 1 }))],
      ['items is not an array', 'p1'],
    ];

    for (const [name, items] of invalid) {
      await test.step(`${name} -> 422`, async () => {
        const response = await api.cart.replace(items);
        expect.soft(response.status(), name).toBe(422);
      });
    }

    await test.step('the saved cart is unchanged', async () => {
      expect(await (await api.cart.get()).json()).toEqual(saved);
    });
  });

  test(
    'unknown product in the cart is a validation error (422)',
    { tag: ['@regression', '@api'], annotation: issue(KNOWN_ISSUES.cartUnknownProductReturns404) },
    async ({ api }) => {
      // Known defect: API.md documents 422 for an invalid cart, the lab returns 404 from the catalog lookup.
      test.fail();
      const response = await api.cart.replace([{ productId: 'does-not-exist', quantity: 1 }]);
      expect(response.status()).toBe(422);
    },
  );
});
