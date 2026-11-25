import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { PRODUCTS, UNKNOWN_PRODUCT_ID } from '@data/index';
import { INVALID_CARTS } from '@data/cases/cart';
import { availableStock } from '@core/flows/order-flow';
import { KNOWN_ISSUES, issue } from '@core/known-issues';
import type { ApiError } from '@api/types';

const { arcHeadphones, orbitLamp } = PRODUCTS;

test.describe('Cart', { tag: ['@cart', '@api'] }, () => {
  test('CART-030 PUT /cart saves the cart and GET /cart returns it', { tag: '@smoke' }, async ({ api }) => {
    const items = [{ productId: arcHeadphones.id, quantity: 2 }];

    const saved = await api.cart.replace(items);
    expect(saved.status()).toBe(200);
    await expectMatchesContract(saved, 'put', '/cart');
    expect(await saved.json()).toEqual(items);

    const read = await api.cart.get();
    expect(read.status()).toBe(200);
    await expectMatchesContract(read, 'get', '/cart');
    expect(await read.json()).toEqual(items);
  });

  for (const { name, items, error } of INVALID_CARTS) {
    test(`CART-031 Invalid cart returns 422: ${name}`, { tag: '@regression' }, async ({ api }) => {
      const response = await api.cart.replace(items);

      expect(response.status()).toBe(422);
      expect(((await response.json()) as ApiError).error).toBe(error);
    });
  }

  test('CART-032 Invalid cart does not replace the saved cart', { tag: '@regression' }, async ({ api }) => {
    const saved = [{ productId: arcHeadphones.id, quantity: 2 }];
    await api.cart.replace(saved);

    expect((await api.cart.replace([{ productId: orbitLamp.id, quantity: 0 }])).status()).toBe(422);

    expect(await (await api.cart.get()).json()).toEqual(saved);
  });

  test('CART-033 Unknown product returns 422', { tag: '@regression', annotation: issue(KNOWN_ISSUES.cartUnknownProductReturns404) }, async ({ api }) => {
    test.fail();
    const response = await api.cart.replace([{ productId: UNKNOWN_PRODUCT_ID, quantity: 1 }]);

    expect(response.status()).toBe(422);
  });

  test('CART-034 Cart without a token returns 401', { tag: '@regression' }, async ({ anonApi }) => {
    for (const response of [await anonApi.cart.get(), await anonApi.cart.replace([{ productId: arcHeadphones.id, quantity: 1 }])]) {
      expect(response.status(), response.url()).toBe(401);
    }
  });

  test('CART-035 Adding to the cart does not reserve stock', { tag: '@regression' }, async ({ api }) => {
    const before = await availableStock(api, arcHeadphones.id);

    await api.cart.replace([{ productId: arcHeadphones.id, quantity: 3 }]);

    expect(await availableStock(api, arcHeadphones.id)).toBe(before);
  });
});
