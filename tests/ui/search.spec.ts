import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { HomePage, ProductListPage } from '@pages/index';
import { CATALOG, LIST_TEXT, STOREFRONT_TIMING } from '@data/index';
import { SEARCHES, messy } from '@data/cases/search';

const names = (products: readonly { name: string }[]) => products.map((p) => p.name);
/** A search must start within this time after typing stops. */
const SEARCH_START_MS = STOREFRONT_TIMING.searchDebounceMs + 2_000;
/** Enter and the Search button skip the typing delay. */
const IMMEDIATE_MS = 300;

async function searchFromHome(page: Page, text: string, submit = true): Promise<ProductListPage> {
  const home = new HomePage(page);
  const list = new ProductListPage(page);
  await home.goto();
  await home.header.search(text, submit);
  await list.waitForProducts();
  return list;
}

const { byName, bySubcategory, lamps, mug, vase, withinCategory } = SEARCHES;

test.describe('Search', { tag: '@search' }, () => {
  test('SRCH-001 Search by product name shows the matching product', { tag: '@smoke' }, async ({ page }) => {
    const list = await searchFromHome(page, byName.term);

    await expect(page).toHaveURL(new RegExp(`#shop\\?q=${byName.term}$`));
    await expect(list.heading).toHaveText(LIST_TEXT.searchHeading(byName.term));
    await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(byName.results.length));
    expect(await list.grid.productNames()).toEqual(names(byName.results));
  });

  test('SRCH-002 Search with no match shows the empty state', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, SEARCHES.noMatch);

    await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(0));
    await expect(list.emptyState).toBeVisible();
  });

  test('SRCH-003 Search by subcategory name shows all its products', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, bySubcategory.term);

    await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(bySubcategory.results.length));
    expect((await list.grid.productNames()).sort()).toEqual(names(bySubcategory.results).sort());
  });

  test('SRCH-004 Search ignores case and surrounding spaces', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, messy(byName.term));

    await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(byName.results.length));
    expect(await list.grid.productNames()).toEqual(names(byName.results));
  });

  test('SRCH-005 Search runs automatically after typing stops', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    await home.goto();

    await home.header.searchInput.pressSequentially(lamps.term);

    await expect(list.heading).toHaveText(LIST_TEXT.searchHeading(lamps.term), { timeout: SEARCH_START_MS });
  });

  test('SRCH-006 Enter and the Search button run the search immediately', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    await home.goto();

    await home.header.searchInput.fill(mug.term);
    await home.header.searchButton.click();
    await expect(page).toHaveURL(new RegExp(`#shop\\?q=${mug.term}$`), { timeout: IMMEDIATE_MS });
    await list.waitForProducts();
    await expect(list.grid.card(mug.result.name)).toBeVisible();

    await home.goto();
    await home.header.searchInput.fill(vase.term);
    await home.header.searchInput.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#shop\\?q=${vase.term}$`), { timeout: IMMEDIATE_MS });
    await list.waitForProducts();
    expect((await list.grid.productNames()).every((n) => n.toLowerCase().includes(vase.term))).toBe(true);
  });

  test('SRCH-007 Removing the search chip shows all products', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, byName.term);

    await list.filterChip(LIST_TEXT.searchChip(byName.term)).click();

    await expect(list.heading).toHaveText(LIST_TEXT.allProducts);
    await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(CATALOG.totalProducts));
    await expect(list.header.searchInput).toHaveValue('');
  });

  test('SRCH-008 Clearing the search field shows all products', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, byName.term);

    await list.header.searchInput.fill('');

    await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(CATALOG.totalProducts), { timeout: SEARCH_START_MS });
  });

  test('SRCH-009 Search inside a category keeps the category filter', { tag: '@regression' }, async ({ page }) => {
    const list = new ProductListPage(page);
    await list.goto({ category: withinCategory.category });

    await list.header.search(withinCategory.term);
    await expect(list.heading).toHaveText(LIST_TEXT.searchHeading(withinCategory.term));
    await list.waitForProducts();

    await expect(list.filterChip(withinCategory.category)).toBeVisible();
    await expect(list.filterChip(LIST_TEXT.searchChip(withinCategory.term))).toBeVisible();
    expect((await list.grid.productNames()).sort()).toEqual(names(withinCategory.results).sort());
    await expect(list.grid.card(withinCategory.outside.name)).toHaveCount(0);
  });

  test('SRCH-010 Sorting works on search results', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, lamps.term);

    await list.sortBy(LIST_TEXT.sort.priceLowHigh);

    expect(await list.grid.productNames()).toEqual(names(lamps.resultsByPrice));
    expect(await list.grid.prices()).toEqual(lamps.resultsByPrice.map((p) => p.price));
    await expect(list.filterChip(LIST_TEXT.searchChip(lamps.term))).toBeVisible();
  });

  test('SRCH-011 New search returns to page 1', { tag: '@regression' }, async ({ page }) => {
    const list = new ProductListPage(page);
    await list.goto({ page: 2 });
    await expect(list.pageIndicator).toHaveText(/^Page 2 of/);

    await list.header.search(SEARCHES.manyResults);
    await expect(list.heading).toHaveText(LIST_TEXT.searchHeading(SEARCHES.manyResults));
    await list.waitForProducts();

    await expect(list.pageIndicator).toHaveText(/^Page 1 of \d+$/);
    await expect(page).not.toHaveURL(/page=2/);
  });

  test('SRCH-012 Search term stays in the field on results and clears when leaving the shop', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, mug.term);
    await expect(list.header.searchInput).toHaveValue(mug.term);

    await list.header.brand.click();

    await expect(page).toHaveURL(/#home$/);
    await expect(list.header.searchInput).toHaveValue('');
  });

  test('SRCH-013 Search link opened directly shows results', { tag: '@regression' }, async ({ page }) => {
    const list = new ProductListPage(page);

    await list.goto({ q: lamps.term });

    await expect(list.heading).toHaveText(LIST_TEXT.searchHeading(lamps.term));
    await expect(list.header.searchInput).toHaveValue(lamps.term);
    const found = await list.grid.productNames();
    expect(found.length).toBeGreaterThan(0);
    for (const name of found) expect(name.toLowerCase()).toContain(lamps.term);
  });

  test('SRCH-014 Search term with HTML is shown as plain text', { tag: '@regression' }, async ({ page }) => {
    const list = await searchFromHome(page, SEARCHES.html);

    await expect(list.heading).toHaveText(LIST_TEXT.searchHeading(SEARCHES.html));
    await expect(list.headingElements('b')).toHaveCount(0);
    await expect(list.emptyState).toBeVisible();
  });
});
