import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { PRODUCTS } from '@core/test-data';
import type { WishlistItem } from '@api/types';

test.describe('Wishlist', { tag: ['@wishlist', '@api'] }, () => {
  test('WISH-020 PUT /wishlist/{id} adds the product', { tag: '@smoke' }, async ({ api }) => {
    const response = await api.wishlist.add(PRODUCTS.arcHeadphones.id);

    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'put', '/wishlist/{productId}');
    const list = (await response.json()) as WishlistItem[];
    expect(list).toHaveLength(1);
    expect(list[0]?.productId).toBe(PRODUCTS.arcHeadphones.id);
    expect(Date.parse(list[0]?.addedAt ?? '')).not.toBeNaN();
  });
});
