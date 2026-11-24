import { test, expect } from '@core/fixtures';
import { HomePage, ProductListPage } from '@pages/index';
import { PRODUCTS } from '@core/test-data';

test.describe('Search', { tag: '@search' }, () => {
  test('SRCH-001 Search by product name shows the matching product', { tag: '@smoke' }, async ({ page }) => {
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    await home.goto();

    await home.header.search('headphones');

    await expect(page).toHaveURL(/#shop\?q=headphones$/);
    await list.waitForProducts();
    await expect(list.heading).toHaveText('Results for “headphones”');
    await expect(list.resultCount).toHaveText('1 product');
    expect(await list.grid.productNames()).toEqual([PRODUCTS.arcHeadphones.name]);
  });
});
