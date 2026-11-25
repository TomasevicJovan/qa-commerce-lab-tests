import { test, expect } from '@core/fixtures';
import { CategoriesPage, HomePage, ProductListPage } from '@pages/index';
import { CATEGORIES_TEXT, CATEGORY, CATEGORY_TREE, HELP_TEXT, LIST_TEXT, SUBCATEGORY } from '@data/index';
import { KNOWN_ISSUES, issue } from '@core/known-issues';

async function openCategories(categories: CategoriesPage): Promise<void> {
  await categories.goto();
  await expect(categories.cards).toHaveCount(CATEGORY_TREE.length);
}

test.describe('All categories page', { tag: '@categories-page' }, () => {
  test('CATP-001 Page shows heading and breadcrumb', { tag: '@smoke' }, async ({ page }) => {
    const categories = new CategoriesPage(page);
    await categories.goto();

    await expect(categories.heading).toHaveText(CATEGORIES_TEXT.heading);
    await expect(categories.breadcrumb).toHaveText(/Home\s*›\s*All categories/);
  });

  for (const category of CATEGORY_TREE) {
    test(`CATP-002 Every category card shows name, count and subcategories: ${category.name}`, { tag: '@regression' }, async ({ page }) => {
      const categories = new CategoriesPage(page);
      await openCategories(categories);
      await expect(categories.cardTitle(category.name)).toHaveText(category.name);
      await expect(categories.cardCount(category.name)).toHaveText(CATEGORIES_TEXT.productCount(category.count));
      expect(await categories.subcategoryEntries(category.name)).toEqual(category.subcategories.map((s) => CATEGORIES_TEXT.entry(s.name, s.count)));
    });
  }

  for (const category of CATEGORY_TREE) {
    const knownIssue = category.name === CATEGORY.garden.name ? KNOWN_ISSUES.categoryIconMissingForGarden : null;
    test(`CATP-003 Each card shows an icon: ${category.name}`, { tag: '@regression', annotation: knownIssue ? issue(knownIssue) : [] }, async ({ page }) => {
      // The icon is the most popular product of the category, taken from the 50 most popular products.
      // Garden has none of them, so its card stays without an icon (known defect).
      if (knownIssue) test.fail();
      const categories = new CategoriesPage(page);
      await openCategories(categories);
      const icon = categories.cardIcon(category.name);

      await expect(icon).not.toBeEmpty();
      // The coloured background comes with the colour class added next to "category-icon".
      await expect(icon).toHaveClass(/category-icon \S+/);
    });
  }

  test('CATP-004 Clicking a category name opens the category page', { tag: '@regression' }, async ({ page }) => {
    const categories = new CategoriesPage(page);
    const list = new ProductListPage(page);
    await openCategories(categories);

    const { garden } = CATEGORY;
    await categories.cardLink(garden.name, garden.name).click();

    await expect(list.heading).toHaveText(garden.name);
    await list.waitForProducts();
    await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(garden.count));
  });

  test('CATP-005 Clicking a subcategory opens the subcategory page', { tag: '@regression' }, async ({ page }) => {
    const categories = new CategoriesPage(page);
    const list = new ProductListPage(page);
    await openCategories(categories);

    const { cats } = SUBCATEGORY;
    await categories.cardLink(cats.category, cats.name).click();

    await expect(list.heading).toHaveText(cats.name);
    await list.waitForProducts();
    expect(await list.breadcrumbText()).toBe(LIST_TEXT.breadcrumb(cats.category, cats.name));
    await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(cats.count));
  });

  test('CATP-006 "Shop all <category> →" opens the whole category', { tag: '@regression' }, async ({ page }) => {
    const categories = new CategoriesPage(page);
    const list = new ProductListPage(page);
    await openCategories(categories);

    const { kidsToys } = CATEGORY;
    await categories.cardLink(kidsToys.name, CATEGORIES_TEXT.shopAll(kidsToys.name)).click();

    await expect(list.heading).toHaveText(kidsToys.name);
    await list.waitForProducts();
    await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(kidsToys.count));
  });

  test('CATP-007 Page opens from the dropdown, the footer and a breadcrumb', { tag: '@regression' }, async ({ page }) => {
    const list = new ProductListPage(page);
    const home = new HomePage(page);
    const ways = [
      { name: 'breadcrumb', open: () => list.breadcrumbLink(CATEGORIES_TEXT.heading).click() },
      { name: 'footer', open: () => list.footerLink(HELP_TEXT.footerLinks.allCategories).click() },
      { name: 'dropdown', open: async () => { await home.header.categories.open(); await home.header.categories.allCategoriesLink.click(); } },
    ];

    for (const { name, open } of ways) {
      await list.goto({ category: CATEGORY.pets.name });
      await open();
      await expect(page, name).toHaveURL(/#categories$/);
      await expect(home.heading).toHaveText(CATEGORIES_TEXT.heading);
    }
  });
});
