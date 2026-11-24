import { test, expect } from '@core/fixtures';
import { CategoriesPage } from '@pages/index';

test.describe('All categories page', { tag: '@categories-page' }, () => {
  test('CATP-001 Page shows heading and breadcrumb', { tag: '@smoke' }, async ({ page }) => {
    const categories = new CategoriesPage(page);
    await categories.goto();

    await expect(categories.heading).toHaveText('All categories');
    await expect(categories.breadcrumb).toHaveText(/Home\s*›\s*All categories/);
  });
});
