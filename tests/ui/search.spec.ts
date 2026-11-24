import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { HomePage, ProductListPage } from '@pages/index';
import { CATALOG, PRODUCTS } from '@core/test-data';

const { arcHeadphones, orbitLamp } = PRODUCTS;
const GAMING = ['Pulse Wireless Controller', 'Arena Gaming Mouse', 'Deck Headset Stand', 'Nova Gaming Chair'];

async function searchFromHome(page: Page, text: string, submit = true): Promise<ProductListPage> {
  const home = new HomePage(page);
  const list = new ProductListPage(page);
  await home.goto();
  await home.header.search(text, submit);
  await list.waitForProducts();
  return list;
}

async function expectHeadphonesResult(list: ProductListPage): Promise<void> {
  await expect(list.heading).toHaveText('Results for “headphones”');
  await expect(list.resultCount).toHaveText('1 product');
  expect(await list.grid.productNames()).toEqual([arcHeadphones.name]);
}

test.describe('Search', { tag: '@search' }, () => {
  test('SRCH-001 Search by product name shows the matching product', { tag: '@smoke' }, async ({ page }) => {
    const list = await searchFromHome(page, 'headphones');

    await expect(page).toHaveURL(/#shop\?q=headphones$/);
    await expectHeadphonesResult(list);
  });

  test('SRCH-002 Search with no match shows the empty state', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, 'teleporter');

    await expect(list.resultCount).toHaveText('0 products');
    await expect(list.emptyState).toBeVisible();
  });

  test('SRCH-003 Search by subcategory name shows all its products', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, 'gaming');

    await expect(list.resultCount).toHaveText('4 products');
    expect((await list.grid.productNames()).sort()).toEqual([...GAMING].sort());
  });

  test('SRCH-004 Search ignores case and surrounding spaces', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, '  HEADPHONES  ');

    await expect(list.resultCount).toHaveText('1 product');
    expect(await list.grid.productNames()).toEqual([arcHeadphones.name]);
  });

  test('SRCH-005 Search runs automatically after typing stops', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    await home.goto();

    await home.header.searchInput.pressSequentially('lamp');

    await expect(list.heading).toHaveText('Results for “lamp”', { timeout: 1_000 + 2_000 });
  });

  test('SRCH-006 Enter and the Search button run the search immediately', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    await home.goto();

    await home.header.searchInput.fill('mug');
    await home.header.searchButton.click();
    await expect(page).toHaveURL(/#shop\?q=mug$/, { timeout: 300 });
    await list.waitForProducts();
    await expect(list.grid.card(PRODUCTS.stillMug.name)).toBeVisible();

    await home.goto();
    await home.header.searchInput.fill('vase');
    await home.header.searchInput.press('Enter');
    await expect(page).toHaveURL(/#shop\?q=vase$/, { timeout: 300 });
    await list.waitForProducts();
    expect((await list.grid.productNames()).every((n) => n.toLowerCase().includes('vase'))).toBe(true);
  });

  test('SRCH-007 Removing the search chip shows all products', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, 'headphones');

    await list.filterChip('“headphones”').click();

    await expect(list.heading).toHaveText('All products');
    await expect(list.resultCount).toHaveText(`${CATALOG.totalProducts} products`);
    await expect(list.header.searchInput).toHaveValue('');
  });

  test('SRCH-008 Clearing the search field shows all products', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, 'headphones');

    await list.header.searchInput.fill('');

    await expect(list.resultCount).toHaveText(`${CATALOG.totalProducts} products`, { timeout: 3_000 });
  });

  test('SRCH-009 Search inside a category keeps the category filter', { tag: '@regression' }, async ({ page }) => {
    const list = new ProductListPage(page);
    await list.goto({ category: 'Electronics' });

    await list.header.search('stand');
    await expect(list.heading).toHaveText('Results for “stand”');
    await list.waitForProducts();

    await expect(list.filterChip('Electronics')).toBeVisible();
    await expect(list.filterChip('“stand”')).toBeVisible();
    expect((await list.grid.productNames()).sort()).toEqual(['Charge 3-in-1 Stand', 'Deck Headset Stand']);
    await expect(list.grid.card('Rise Laptop Stand')).toHaveCount(0);
  });

  test('SRCH-010 Sorting works on search results', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, 'lamp');

    await list.sortBy('Price: low to high');

    expect(await list.grid.productNames()).toEqual([orbitLamp.name, 'Dome Pendant Lamp']);
    expect(await list.grid.prices()).toEqual([7_900, 11_900]);
    await expect(list.filterChip('“lamp”')).toBeVisible();
  });

  test('SRCH-011 New search returns to page 1', { tag: '@regression' }, async ({ page }) => {
    const list = new ProductListPage(page);
    await list.goto({ page: 2 });
    await expect(list.pageIndicator).toHaveText(/^Page 2 of/);

    await list.header.search('a');
    await expect(list.heading).toHaveText('Results for “a”');
    await list.waitForProducts();

    await expect(list.pageIndicator).toHaveText(/^Page 1 of \d+$/);
    await expect(page).not.toHaveURL(/page=2/);
  });

  test('SRCH-012 Search term stays in the field on results and clears when leaving the shop', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, 'mug');
    await expect(list.header.searchInput).toHaveValue('mug');

    await list.header.brand.click();

    await expect(page).toHaveURL(/#home$/);
    await expect(list.header.searchInput).toHaveValue('');
  });

  test('SRCH-013 Search link opened directly shows results', { tag: '@regression' }, async ({ page }) => {
    const list = new ProductListPage(page);

    await list.goto({ q: 'lamp' });

    await expect(list.heading).toHaveText('Results for “lamp”');
    await expect(list.header.searchInput).toHaveValue('lamp');
    const names = await list.grid.productNames();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name.toLowerCase()).toContain('lamp');
  });

  test('SRCH-014 Search term with HTML is shown as plain text', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, '<b>test</b>');

    await expect(list.heading).toHaveText('Results for “<b>test</b>”');
    await expect(list.heading.locator('b')).toHaveCount(0);
    await expect(list.emptyState).toBeVisible();
  });
});
