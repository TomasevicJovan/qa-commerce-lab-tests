import { test, expect } from '@core/fixtures';
import { HomePage, ProductListPage } from '@pages/index';
import { CATALOG } from '@core/test-data';

test.describe('Black Friday, Free shipping and popular links', { tag: '@navigation' }, () => {
  test('NAV-001 Black Friday link opens the deals page', { tag: '@smoke' }, async ({ page }) => {
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    await home.goto();

    await home.header.blackFridayLink.click();

    await expect(page).toHaveURL(/#shop\?deal=black-friday$/);
    await list.waitForProducts();
    await expect(list.heading).toHaveText('Black Friday deals');
    await expect(list.resultCount).toHaveText(`${CATALOG.blackFridayDeals} products`);
    await expect(list.filterChip('Black Friday')).toBeVisible();
    await expect(home.header.blackFridayLink).toHaveClass(/active/);
  });

  test('NAV-010 Free shipping link opens the free shipping page', { tag: '@smoke' }, async ({ page }) => {
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    await home.goto();

    await home.header.freeShippingLink.click();

    await expect(page).toHaveURL(/#shop\?freeShipping=true$/);
    await list.waitForProducts();
    await expect(list.heading).toHaveText('Free shipping');
    await expect(list.resultCount).toHaveText(`${CATALOG.freeShippingProducts} products`);
    await expect(list.filterChip('Free shipping')).toBeVisible();
    await expect(home.header.freeShippingLink).toHaveClass(/active/);
  });
});
