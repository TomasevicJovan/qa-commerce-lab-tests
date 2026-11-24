import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { PRODUCTS } from '@core/test-data';

test.describe('Cart', { tag: ['@cart', '@api'] }, () => {
  test('CART-030 PUT /cart saves the cart and GET /cart returns it', { tag: '@smoke' }, async ({ api }) => {
    const items = [{ productId: PRODUCTS.arcHeadphones.id, quantity: 2 }];

    const saved = await api.cart.replace(items);
    expect(saved.status()).toBe(200);
    await expectMatchesContract(saved, 'put', '/cart');
    expect(await saved.json()).toEqual(items);

    const read = await api.cart.get();
    expect(read.status()).toBe(200);
    await expectMatchesContract(read, 'get', '/cart');
    expect(await read.json()).toEqual(items);
  });
});
