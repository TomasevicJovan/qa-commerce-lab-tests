import { test, expect } from '@core/fixtures';
import { HomePage } from '@pages/index';
import { CATEGORY_TREE } from '@core/test-data';

test.describe('All categories dropdown', { tag: '@categories-menu' }, () => {
  test('CATM-001 Button opens the menu with all 9 categories and their product counts', { tag: '@smoke' }, async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.header.categories.open();

    await expect(home.header.categories.root).toBeVisible();
    await expect(home.header.categories.toggle).toHaveAttribute('aria-expanded', 'true');
    expect(await home.header.categories.categoryEntries()).toEqual(CATEGORY_TREE.map((c) => `${c.name} ${c.count}`));
    await expect(home.header.categories.allCategoriesLink).toBeVisible();
  });
});
