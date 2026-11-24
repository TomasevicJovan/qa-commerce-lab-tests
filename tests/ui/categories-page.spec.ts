import { test, expect } from '@core/fixtures';
import { CategoriesPage, HomePage, ProductListPage } from '@pages/index';
import { CATEGORY_TREE } from '@core/test-data';
import { KNOWN_ISSUES, issue } from '@core/known-issues';

async function openCategories(categories: CategoriesPage): Promise<void> {
  await categories.goto();
  await expect(categories.cards).toHaveCount(CATEGORY_TREE.length);
}

test.describe('All categories page', { tag: '@categories-page' }, () => {
  test('CATP-001 Page shows heading and breadcrumb', { tag: '@smoke' }, async ({ page }) => {
    const categories = new CategoriesPage(page);
    await categories.goto();

    await expect(categories.heading).toHaveText('All categories');
    await expect(categories.breadcrumb).toHaveText(/Home\s*›\s*All categories/);
  });

  for (const category of CATEGORY_TREE) {
    test(`CATP-002 Every category card shows name, count and subcategories: ${category.name}`, { tag: '@regression' }, async ({ page }) => {
      const categories = new CategoriesPage(page);
      await openCategories(categories);
      const card = categories.card(category.name);

      await expect(card.getByRole('heading', { level: 2 })).toHaveText(category.name);
      await expect(card.locator('.count')).toHaveText(`${category.count} products`);
      expect(await categories.subcategoryEntries(category.name)).toEqual(category.subcategories.map((s) => `${s.name} ${s.count}`));
    });
  }

  for (const category of CATEGORY_TREE) {
    const knownIssue = category.name === 'Garden' ? KNOWN_ISSUES.categoryIconMissingForGarden : null;
    test(`CATP-003 Each card shows an icon: ${category.name}`, { tag: '@regression', annotation: knownIssue ? issue(knownIssue) : [] }, async ({ page }) => {
      // The icon is the most popular product of the category, taken from the 50 most popular products.
      // Garden has none of them, so its card stays without an icon (known defect).
      if (knownIssue) test.fail();
      const categories = new CategoriesPage(page);
      await openCategories(categories);
      const icon = categories.card(category.name).locator('.category-icon');

      await expect(icon).not.toBeEmpty();
      // The coloured background comes with the colour class added next to "category-icon".
      await expect(icon).toHaveClass(/category-icon \S+/);
    });
  }

  test('CATP-004 Clicking a category name opens the category page', { tag: '@regression' }, async ({ page }) => {
    const categories = new CategoriesPage(page);
    const list = new ProductListPage(page);
    await openCategories(categories);

    await categories.card('Garden').getByRole('link', { name: 'Garden', exact: true }).click();

    await expect(list.heading).toHaveText('Garden');
    await list.waitForProducts();
    await expect(list.resultCount).toHaveText('6 products');
  });

  test('CATP-005 Clicking a subcategory opens the subcategory page', { tag: '@regression' }, async ({ page }) => {
    const categories = new CategoriesPage(page);
    const list = new ProductListPage(page);
    await openCategories(categories);

    await categories.card('Pets').getByRole('link', { name: 'Cats', exact: true }).click();

    await expect(list.heading).toHaveText('Cats');
    await list.waitForProducts();
    expect(await list.breadcrumbText()).toBe('Home › All categories › Pets › Cats');
    await expect(list.resultCount).toHaveText('3 products');
  });

  test('CATP-006 "Shop all <category> →" opens the whole category', { tag: '@regression' }, async ({ page }) => {
    const categories = new CategoriesPage(page);
    const list = new ProductListPage(page);
    await openCategories(categories);

    await categories.card('Kids & Toys').getByRole('link', { name: 'Shop all Kids & Toys →' }).click();

    await expect(list.heading).toHaveText('Kids & Toys');
    await list.waitForProducts();
    await expect(list.resultCount).toHaveText('6 products');
  });

  test('CATP-007 Page opens from the dropdown, the footer and a breadcrumb', { tag: '@regression' }, async ({ page }) => {
    const list = new ProductListPage(page);
    const home = new HomePage(page);
    const ways = [
      { name: 'breadcrumb', open: () => list.breadcrumb.getByRole('link', { name: 'All categories' }).click() },
      { name: 'footer', open: () => list.footerLink('All categories').click() },
      { name: 'dropdown', open: async () => { await home.header.categories.open(); await home.header.categories.allCategoriesLink.click(); } },
    ];

    for (const { name, open } of ways) {
      await list.goto({ category: 'Pets' });
      await open();
      await expect(page, name).toHaveURL(/#categories$/);
      await expect(home.heading).toHaveText('All categories');
    }
  });
});
