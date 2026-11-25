import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { API_ERRORS, LIMITS, PRODUCTS, UNKNOWN_PRODUCT_ID, productId } from '@data/index';
import type { ApiError, WishlistItem } from '@api/types';

const { arcHeadphones, orbitLamp, loopKeyboard } = PRODUCTS;
const ids = async (response: { json(): Promise<unknown> }) => ((await response.json()) as WishlistItem[]).map((i) => i.productId);

test.describe('Wishlist', { tag: ['@wishlist', '@api'] }, () => {
  test('WISH-020 PUT /wishlist/{id} adds the product', { tag: '@smoke' }, async ({ api }) => {
    const response = await api.wishlist.add(arcHeadphones.id);

    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'put', '/wishlist/{productId}');
    const list = (await response.json()) as WishlistItem[];
    expect(list).toHaveLength(1);
    expect(list[0]?.productId).toBe(arcHeadphones.id);
    expect(Date.parse(list[0]?.addedAt ?? '')).not.toBeNaN();
  });

  test('WISH-021 Adding the same product again changes nothing', { tag: '@regression' }, async ({ api }) => {
    const [first] = (await (await api.wishlist.add(arcHeadphones.id)).json()) as WishlistItem[];

    const again = await api.wishlist.add(arcHeadphones.id);

    expect(again.status()).toBe(200);
    expect((await again.json()) as WishlistItem[]).toEqual([first]);
  });

  test('WISH-022 DELETE /wishlist/{id} removes the product; unknown removal changes nothing', { tag: '@regression' }, async ({ api }) => {
    await api.wishlist.add(arcHeadphones.id);

    for (let i = 0; i < 2; i++) {
      const response = await api.wishlist.remove(arcHeadphones.id);
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual([]);
    }
  });

  test('WISH-023 List is ordered newest first', { tag: '@regression' }, async ({ api }) => {
    for (const product of [arcHeadphones, orbitLamp, loopKeyboard]) await api.wishlist.add(product.id);

    const response = await api.wishlist.get();

    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'get', '/wishlist');
    expect(await ids(response)).toEqual([loopKeyboard.id, orbitLamp.id, arcHeadphones.id]);
  });

  test('WISH-024 Unknown product returns 404', { tag: '@regression' }, async ({ api }) => {
    const response = await api.wishlist.add(UNKNOWN_PRODUCT_ID);

    expect(response.status()).toBe(404);
    expect(((await response.json()) as ApiError).error).toBe(API_ERRORS.catalog.productNotFound);
  });

  test(`WISH-025 Product number ${LIMITS.wishlistProducts + 1} returns 422`, { tag: '@regression' }, async ({ api }) => {
    for (let i = 1; i <= LIMITS.wishlistProducts; i++) expect((await api.wishlist.add(productId(i))).status()).toBe(200);

    const response = await api.wishlist.add(productId(LIMITS.wishlistProducts + 1));

    expect(response.status()).toBe(422);
    expect(((await response.json()) as ApiError).error).toBe(API_ERRORS.wishlist.full);
    expect(await ids(await api.wishlist.get())).toHaveLength(LIMITS.wishlistProducts);
  });

  test('WISH-026 Wishlist without a token returns 401', { tag: '@regression' }, async ({ anonApi }) => {
    for (const response of [await anonApi.wishlist.get(), await anonApi.wishlist.add(arcHeadphones.id)]) {
      expect(response.status(), response.url()).toBe(401);
    }
  });
});
