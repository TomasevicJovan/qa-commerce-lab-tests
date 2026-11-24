import { test, expect } from '@core/fixtures';
import { ProductListPage } from '@pages/index';
import { CATALOG } from '@core/test-data';

test.describe('Product list and product card', { tag: '@product-list' }, () => {
  test('LIST-002 Price low to high', { tag: '@smoke' }, async ({ page }) => {
    const list = new ProductListPage(page);
    await list.goto();

    await list.sortBy('Price: low to high');

    const prices = await list.grid.prices();
    expect(prices[0]).toBe(900);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    await list.nextPage.click();
    await list.waitForProducts();
    const pageTwo = await list.grid.prices();
    expect(pageTwo[0]).toBeGreaterThanOrEqual(prices.at(-1) ?? 0);
    expect(pageTwo).toEqual([...pageTwo].sort((a, b) => a - b));
  });

  test('LIST-010 List shows 8 products per page', { tag: '@smoke' }, async ({ page }) => {
    const list = new ProductListPage(page);
    await list.goto();

    await expect(list.grid.cards).toHaveCount(CATALOG.pageSize);
    await expect(list.pageIndicator).toHaveText(`Page 1 of ${Math.ceil(CATALOG.totalProducts / CATALOG.pageSize)}`);
    await expect(list.resultCount).toHaveText(`${CATALOG.totalProducts} products`);
  });
});
