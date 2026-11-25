import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { HomePage, ProductListPage } from '@pages/index';
import { AUTH_TEXT, CATALOG, CATEGORIES_TEXT, CATEGORY, CATEGORY_TREE, DEMO_ACCOUNT, LIST_TEXT, SUBCATEGORIES, SUBCATEGORY } from '@data/index';
import { KNOWN_ISSUES, issue } from '@core/known-issues';

async function openMenu(page: Page): Promise<HomePage> {
  const home = new HomePage(page);
  await home.goto();
  await home.header.categories.open();
  await expect(home.header.categories.root).toBeVisible();
  return home;
}

/** Opens a category page the way a customer does: from the menu. */
async function openCategoryFromMenu(page: Page, category: string): Promise<ProductListPage> {
  const home = await openMenu(page);
  const list = new ProductListPage(page);
  await home.header.categories.category(category).click();
  await expect(list.heading).toHaveText(category);
  await list.waitForProducts();
  return list;
}

const subcategoryEntries = (category: { subcategories: { name: string; count: number }[] }) =>
  category.subcategories.map((s) => CATEGORIES_TEXT.entry(s.name, s.count));
const { homeLiving, sportsOutdoors, pets } = CATEGORY;
const firstCategory = CATEGORY_TREE[0]!;

test.describe('All categories dropdown', { tag: '@categories-menu' }, () => {
  test.describe('menu', () => {
    test('CATM-001 Button opens the menu with all 9 categories and their product counts', { tag: '@smoke' }, async ({ page }) => {
      const home = await openMenu(page);

      await expect(home.header.categories.toggle).toHaveAttribute('aria-expanded', 'true');
      expect(await home.header.categories.categoryEntries()).toEqual(CATEGORY_TREE.map((c) => CATEGORIES_TEXT.entry(c.name, c.count)));
      await expect(home.header.categories.allCategoriesLink).toHaveText(CATEGORIES_TEXT.allCategoriesLink);
    });

    test('CATM-002 First category is selected by default', { tag: '@regression' }, async ({ page }) => {
      const menu = (await openMenu(page)).header.categories;

      await expect(menu.category(firstCategory.name)).toHaveClass(/active/);
      await expect(menu.shopAll(firstCategory.name)).toBeVisible();
      expect(await menu.panelEntries()).toEqual(subcategoryEntries(firstCategory));
    });

    test('CATM-003 Hovering a category shows its subcategories with counts', { tag: '@regression' }, async ({ page }) => {
      const menu = (await openMenu(page)).header.categories;

      await menu.category(sportsOutdoors.name).hover();

      await expect(menu.category(sportsOutdoors.name)).toHaveClass(/active/);
      await expect(menu.category(firstCategory.name)).not.toHaveClass(/active/);
      await expect(menu.shopAll(sportsOutdoors.name)).toBeVisible();
      expect(await menu.panelEntries()).toEqual(subcategoryEntries(sportsOutdoors));
    });

    test('CATM-009 "Shop all <category>" opens the whole category', { tag: '@regression' }, async ({ page }) => {
      const menu = (await openMenu(page)).header.categories;
      const list = new ProductListPage(page);

      await menu.category(homeLiving.name).hover();
      await menu.shopAll(homeLiving.name).click();

      await list.waitForProducts();
      await expect(list.heading).toHaveText(homeLiving.name);
      await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(homeLiving.count));
    });

    test('CATM-010 "All categories →" opens the categories page', { tag: '@regression' }, async ({ page }) => {
      const home = await openMenu(page);

      await home.header.categories.allCategoriesLink.click();

      await expect(page).toHaveURL(/#categories$/);
      await expect(home.heading).toHaveText(CATEGORIES_TEXT.heading);
    });

    test('CATM-011 Menu closes after choosing a link', { tag: '@regression' }, async ({ page }) => {
      const home = await openMenu(page);
      const list = new ProductListPage(page);

      await home.header.categories.subcategory(SUBCATEGORY.gaming.name).click();

      await list.waitForProducts();
      await expect(list.heading).toHaveText(SUBCATEGORY.gaming.name);
      await expect(home.header.categories.root).toBeHidden();
    });

    test('CATM-012 Menu closes on Escape, outside click and a second button click', { tag: '@regression' }, async ({ page }) => {
      const home = await openMenu(page);
      const menu = home.header.categories;

      await page.keyboard.press('Escape');
      await expect(menu.root).toBeHidden();
      await expect(menu.toggle).toBeFocused();

      await menu.open();
      await expect(menu.root).toBeVisible();
      const viewport = page.viewportSize()!;
      await page.mouse.click(viewport.width - 5, viewport.height - 5);
      await expect(menu.root).toBeHidden();

      await menu.open();
      await expect(menu.root).toBeVisible();
      await menu.toggle.click();
      await expect(menu.root).toBeHidden();
      await expect(menu.toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('CATM-013 Keyboard moves between categories and subcategories', { tag: '@regression' }, async ({ page }) => {
      const menu = (await openMenu(page)).header.categories;
      const secondCategory = CATEGORY_TREE[1]!;
      await menu.category(firstCategory.name).focus();

      await page.keyboard.press('ArrowDown');
      await expect(menu.category(secondCategory.name)).toBeFocused();
      expect(await menu.panelEntries()).toEqual(subcategoryEntries(secondCategory));

      await page.keyboard.press('ArrowRight');
      await expect(menu.shopAll(secondCategory.name)).toBeFocused();

      await page.keyboard.press('ArrowLeft');
      await expect(menu.category(secondCategory.name)).toBeFocused();
    });

    test('CATM-014 Opening the account menu closes the categories menu', { tag: '@regression' }, async ({ demoPage: page }) => {
      const home = await openMenu(page);

      await expect(home.header.accountButton).toHaveText(AUTH_TEXT.accountButton(DEMO_ACCOUNT.name));
      await home.header.accountButton.click();

      await expect(home.header.categories.root).toBeHidden();
      await expect(home.header.accountMenu).toBeVisible();
    });
  });

  test.describe('category pages', () => {
    for (const category of CATEGORY_TREE) {
      test(`CATM-004 Clicking each category opens the correct category page: ${category.name}`, { tag: '@regression' }, async ({ page }) => {
        const home = await openMenu(page);
        const list = new ProductListPage(page);

        await home.header.categories.category(category.name).click();
        await list.waitForProducts();

        expect(await list.breadcrumbText()).toBe(LIST_TEXT.breadcrumb(category.name));
        await expect(list.heading).toHaveText(category.name);
        await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(category.count));
        await expect(list.selectedSort).toHaveText(LIST_TEXT.sort.featured);
        await expect(list.filterChip(category.name)).toBeVisible();
        await expect(list.clearAll).toBeVisible();
        const allowed = category.subcategories.map((s) => s.name);
        const labels = await list.allSubcategoryLabels();
        expect(labels).toHaveLength(category.count);
        for (const label of labels) expect(allowed, `product subcategory "${label}"`).toContain(label);
      });

      test(`CATM-005 Category page shows a chip for every subcategory with its count: ${category.name}`, { tag: '@regression' }, async ({ page }) => {
        const list = await openCategoryFromMenu(page, category.name);

        const chips = (await list.subcategoryChips.allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
        expect(chips).toEqual([LIST_TEXT.allSubcategoriesChip(category.name), ...subcategoryEntries(category)]);
        await expect(list.subcategoryChips.first()).toHaveClass(/active/);
      });
    }

    test('CATM-006 Clicking a subcategory chip narrows the list', { tag: '@regression' }, async ({ page }) => {
      const cycling = SUBCATEGORY.cycling;
      const list = await openCategoryFromMenu(page, cycling.category);

      await list.subcategoryChip(cycling.name).click();
      await expect(list.heading).toHaveText(cycling.name);
      await list.waitForProducts();

      await expect(list.subcategoryChip(cycling.name)).toHaveClass(/active/);
      expect(await list.breadcrumbText()).toBe(LIST_TEXT.breadcrumb(cycling.category, cycling.name));
      await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(cycling.count));
      expect(await list.allSubcategoryLabels()).toEqual(Array(cycling.count).fill(cycling.name));
    });

    test('CATM-007 Removing the category chip or Clear all shows all products', { tag: '@regression' }, async ({ page }) => {
      const list = new ProductListPage(page);
      const expectAllProducts = async () => {
        await expect(list.heading).toHaveText(LIST_TEXT.allProducts);
        await list.waitForProducts();
        await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(CATALOG.totalProducts));
        await expect(list.activeFilters).toHaveCount(0);
        await expect(list.subcategoryChips).toHaveCount(0);
      };

      await list.goto({ category: SUBCATEGORY.cycling.category, subcategory: SUBCATEGORY.cycling.name });
      await list.filterChip(SUBCATEGORY.cycling.category).click();
      await expectAllProducts();

      await list.goto({ category: sportsOutdoors.name });
      await list.clearAll.click();
      await expectAllProducts();
    });

    for (const sub of SUBCATEGORIES) {
      test(`CATM-008 Clicking each subcategory opens the correct subcategory page: ${sub.category} › ${sub.name}`, { tag: '@regression' }, async ({ page }) => {
        const home = await openMenu(page);
        const list = new ProductListPage(page);

        await home.header.categories.category(sub.category).hover();
        await home.header.categories.subcategory(sub.name).click();
        await expect(list.heading).toHaveText(sub.name);
        await list.waitForProducts();

        expect(await list.breadcrumbText()).toBe(LIST_TEXT.breadcrumb(sub.category, sub.name));
        await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(sub.count));
        await expect(list.subcategoryChip(sub.name)).toHaveClass(/active/);
        expect(await list.allSubcategoryLabels()).toEqual(Array(sub.count).fill(sub.name));
      });
    }
  });

  test('CATM-015 Category page opened by a direct link shows the subcategory chips', { tag: '@regression', annotation: issue(KNOWN_ISSUES.categoryPageDirectLinkHasNoSubcategoryChips) }, async ({ page }) => {
    test.fail();
    const list = new ProductListPage(page);

    await list.goto({ category: pets.name });

    await expect(list.subcategoryChips).toHaveText([LIST_TEXT.allSubcategoriesChip(pets.name), ...subcategoryEntries(pets)], { timeout: 3_000 });
  });
});
