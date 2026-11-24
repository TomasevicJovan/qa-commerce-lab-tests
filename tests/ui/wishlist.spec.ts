import { test, expect } from '@core/fixtures';
import { ProductListPage } from '@pages/index';
import { PRODUCTS } from '@core/test-data';

test.describe('Wishlist', { tag: '@wishlist' }, () => {
  test('WISH-001 Clicking an empty heart saves the product', { tag: '@smoke' }, async ({ signedInPage: page, api }) => {
    const list = new ProductListPage(page);
    const product = PRODUCTS.arcHeadphones;
    await list.goto({ q: 'headphones' });
    const heart = list.grid.heart(product.name);
    await expect(heart).toHaveAttribute('aria-pressed', 'false');

    await heart.click();

    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await expect(heart).toHaveText('♥');
    await expect(list.header.wishlistCount).toHaveText('1');
    await list.notifications.expectShown('success', { message: `${product.name} was saved to your wishlist.` });
    expect(await (await api.wishlist.get()).json()).toEqual([expect.objectContaining({ productId: product.id })]);
  });
});
