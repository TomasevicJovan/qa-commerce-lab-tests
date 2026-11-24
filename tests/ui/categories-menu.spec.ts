import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { HomePage, ProductListPage } from '@pages/index';
import { CATALOG, CATEGORY_TREE, DEMO_NAME, SUBCATEGORIES } from '@core/test-data';

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

const subcategoryEntries = (category: string) =>
  CATEGORY_TREE.find((c) => c.name === category)!.subcategories.map((s) => `${s.name} ${s.count}`);

test.describe('All categories dropdown', { tag: '@categories-menu' }, () => {
  test.describe('menu', () => {
    test('CATM-001 Button opens the menu with all 9 categories and their product counts', { tag: '@smoke' }, async ({ page }) => {
      const home = await openMenu(page);

      await expect(home.header.categories.toggle).toHaveAttribute('aria-expanded', 'true');
      expect(await home.header.categories.categoryEntries()).toEqual(CATEGORY_TREE.map((c) => `${c.name} ${c.count}`));
      await expect(home.header.categories.root.locator('.mega-top li').last()).toHaveText('All categories →');
    });

    test('CATM-002 First category is selected by default', { tag: '@regression' }, async ({ page }) => {
      const menu = (await openMenu(page)).header.categories;

      await expect(menu.category('Electronics')).toHaveClass(/active/);
      await expect(menu.shopAll('Electronics')).toBeVisible();
      expect(await menu.panelEntries()).toEqual(subcategoryEntries('Electronics'));
    });

    test('CATM-003 Hovering a category shows its subcategories with counts', { tag: '@regression' }, async ({ page }) => {
      const menu = (await openMenu(page)).header.categories;

      await menu.category('Sports & Outdoors').hover();

      await expect(menu.category('Sports & Outdoors')).toHaveClass(/active/);
      await expect(menu.category('Electronics')).not.toHaveClass(/active/);
      await expect(menu.shopAll('Sports & Outdoors')).toBeVisible();
      expect(await menu.panelEntries()).toEqual(subcategoryEntries('Sports & Outdoors'));
    });

    test('CATM-009 "Shop all <category>" opens the whole category', { tag: '@regression' }, async ({ page }) => {
      const menu = (await openMenu(page)).header.categories;
      const list = new ProductListPage(page);

      await menu.category('Home & Living').hover();
      await menu.shopAll('Home & Living').click();

      await list.waitForProducts();
      await expect(list.heading).toHaveText('Home & Living');
      await expect(list.resultCount).toHaveText('17 products');
    });

    test('CATM-010 "All categories →" opens the categories page', { tag: '@regression' }, async ({ page }) => {
      const home = await openMenu(page);

      await home.header.categories.allCategoriesLink.click();

      await expect(page).toHaveURL(/#categories$/);
      await expect(home.heading).toHaveText('All categories');
    });

    test('CATM-011 Menu closes after choosing a link', { tag: '@regression' }, async ({ page }) => {
      const home = await openMenu(page);
      const list = new ProductListPage(page);

      await home.header.categories.subcategory('Gaming').click();

      await list.waitForProducts();
      await expect(list.heading).toHaveText('Gaming');
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
      await menu.category('Electronics').focus();

      await page.keyboard.press('ArrowDown');
      await expect(menu.category('Home & Living')).toBeFocused();
      expect(await menu.panelEntries()).toEqual(subcategoryEntries('Home & Living'));

      await page.keyboard.press('ArrowRight');
      await expect(menu.shopAll('Home & Living')).toBeFocused();

      await page.keyboard.press('ArrowLeft');
      await expect(menu.category('Home & Living')).toBeFocused();
    });

    test('CATM-014 Opening the account menu closes the categories menu', { tag: '@regression' }, async ({ demoPage: page }) => {
      const home = await openMenu(page);

      await expect(home.header.accountButton).toHaveText(`${DEMO_NAME} ▾`);
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

        expect(await list.breadcrumbText()).toBe(`Home › All categories › ${category.name}`);
        await expect(list.heading).toHaveText(category.name);
        await expect(list.resultCount).toHaveText(`${category.count} products`);
        await expect(list.sortSelect).toHaveValue('');
        await expect(list.sortSelect.locator('option:checked')).toHaveText('Featured');
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
        expect(chips).toEqual([`All ${category.name}`, ...category.subcategories.map((s) => `${s.name} ${s.count}`)]);
        await expect(list.subcategoryChips.first()).toHaveClass(/active/);
      });
    }

    test('CATM-006 Clicking a subcategory chip narrows the list', { tag: '@regression' }, async ({ page }) => {
      const list = await openCategoryFromMenu(page, 'Sports & Outdoors');

      await list.subcategoryChip('Cycling').click();
      await expect(list.heading).toHaveText('Cycling');
      await list.waitForProducts();

      await expect(list.subcategoryChip('Cycling')).toHaveClass(/active/);
      expect(await list.breadcrumbText()).toBe('Home › All categories › Sports & Outdoors › Cycling');
      await expect(list.resultCount).toHaveText('4 products');
      expect(await list.allSubcategoryLabels()).toEqual(Array(4).fill('Cycling'));
    });

    test('CATM-007 Removing the category chip or Clear all shows all products', { tag: '@regression' }, async ({ page }) => {
      const list = new ProductListPage(page);
      const expectAllProducts = async () => {
        await expect(list.heading).toHaveText('All products');
        await list.waitForProducts();
        await expect(list.resultCount).toHaveText(`${CATALOG.totalProducts} products`);
        await expect(list.activeFilters).toHaveCount(0);
        await expect(list.subcategoryChips).toHaveCount(0);
      };

      await list.goto({ category: 'Sports & Outdoors', subcategory: 'Cycling' });
      await list.filterChip('Sports & Outdoors').click();
      await expectAllProducts();

      await list.goto({ category: 'Sports & Outdoors' });
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

        expect(await list.breadcrumbText()).toBe(`Home › All categories › ${sub.category} › ${sub.name}`);
        await expect(list.resultCount).toHaveText(`${sub.count} products`);
        await expect(list.subcategoryChip(sub.name)).toHaveClass(/active/);
        expect(await list.allSubcategoryLabels()).toEqual(Array(sub.count).fill(sub.name));
      });
    }
  });
});
