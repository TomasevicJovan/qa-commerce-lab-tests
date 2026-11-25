import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { HomePage, ProductListPage } from '@pages/index';
import { CART_TEXT, CATALOG, LIST_TEXT, POPULAR_SUBCATEGORIES, PRODUCTS, QUERY, SUBCATEGORIES, pageSizes } from '@data/index';
import { formatUsd } from '@core/pricing';

const cents = (money: string) => Math.round(Number(money.replace(/[^0-9.]/g, '')) * 100);
const chipPages = [
  { chip: LIST_TEXT.chips.blackFriday, link: null },
  { chip: LIST_TEXT.chips.freeShipping, link: 'freeShippingLink' as const },
];

async function openFromHome(page: Page, link: 'blackFridayLink' | 'freeShippingLink'): Promise<ProductListPage> {
  const home = new HomePage(page);
  const list = new ProductListPage(page);
  await home.goto();
  await home.header[link].click();
  await list.waitForProducts();
  return list;
}

test.describe('Black Friday, Free shipping and popular links', { tag: '@navigation' }, () => {
  test.describe('Black Friday', () => {
    test('NAV-001 Black Friday link opens the deals page', { tag: '@smoke' }, async ({ page }) => {
      const list = await openFromHome(page, 'blackFridayLink');

      await expect(page).toHaveURL(new RegExp(`#shop\\?deal=${QUERY.deal.blackFriday}$`));
      await expect(list.heading).toHaveText(LIST_TEXT.blackFridayHeading);
      await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(CATALOG.blackFridayDeals));
      await expect(list.filterChip(LIST_TEXT.chips.blackFriday)).toBeVisible();
      await expect(list.header.blackFridayLink).toHaveClass(/active/);
    });

    test('NAV-002 Every deal shows its badge, sale price and original price', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'blackFridayLink');

      const cards = await list.collectAcrossPages(() => list.grid.facts());

      expect(cards).toHaveLength(CATALOG.blackFridayDeals);
      for (const card of cards) {
        expect.soft(card.badge, card.name).toMatch(LIST_TEXT.dealBadgePattern);
        expect.soft(card.priceIsSale, `${card.name}: price shown as a sale price`).toBe(true);
        expect.soft(card.compare, `${card.name}: original price`).toMatch(/^\$\d+\.\d{2}$/);
      }
    });

    test('NAV-003 Badge percentage is correct for each deal', { tag: '@regression' }, async ({ page }) => {
      // One run checks all 21 deals: a soft assertion per product names the failing deal.
      const list = await openFromHome(page, 'blackFridayLink');

      const cards = await list.collectAcrossPages(() => list.grid.facts());

      expect(cards).toHaveLength(CATALOG.blackFridayDeals);
      for (const card of cards) {
        const percent = Math.round((1 - cents(card.price) / cents(card.compare ?? '0')) * 100);
        expect.soft(card.badge, `${card.name} ${card.price} was ${card.compare}`).toBe(LIST_TEXT.dealBadge(percent));
      }
      const { eyeCamera } = PRODUCTS;
      expect(cards.find((c) => c.name === eyeCamera.name)).toMatchObject({
        price: formatUsd(eyeCamera.price),
        compare: formatUsd(eyeCamera.compareAtPrice!),
        badge: LIST_TEXT.dealBadge(eyeCamera.dealPercent!),
      });
    });

    test('NAV-004 Deals have 3 pages with only deal products', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'blackFridayLink');

      const perPage = await list.collectAcrossPages(async () => [await list.grid.facts()]);

      expect(perPage.map((cards) => cards.length)).toEqual(pageSizes(CATALOG.blackFridayDeals));
      for (const card of perPage.flat()) expect.soft(card.badge, card.name).not.toBeNull();
    });
  });

  test.describe('Free shipping', () => {
    test('NAV-010 Free shipping link opens the free shipping page', { tag: '@smoke' }, async ({ page }) => {
      const list = await openFromHome(page, 'freeShippingLink');

      await expect(page).toHaveURL(new RegExp(`#shop\\?freeShipping=${QUERY.freeShipping.yes}$`));
      await expect(list.heading).toHaveText(LIST_TEXT.freeShippingHeading);
      await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(CATALOG.freeShippingProducts));
      await expect(list.filterChip(LIST_TEXT.chips.freeShipping)).toBeVisible();
      await expect(list.header.freeShippingLink).toHaveClass(/active/);
    });

    test('NAV-011 Every listed product shows "Free shipping"', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'freeShippingLink');

      const perPage = await list.collectAcrossPages(async () => [await list.grid.facts()]);

      expect(perPage.map((cards) => cards.length)).toEqual(pageSizes(CATALOG.freeShippingProducts));
      for (const card of perPage.flat()) expect.soft(card.freeShipping, card.name).toBe(CART_TEXT.freeShippingMark);
    });

    test('NAV-012 Products without free shipping are not listed', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'freeShippingLink');

      const names = await list.allProductNames();

      expect(names).toHaveLength(CATALOG.freeShippingProducts);
      expect(names).not.toContain(PRODUCTS.arcHeadphones.name);
    });
  });

  test.describe('popular links', () => {
    test('NAV-020 Navigation shows exactly 5 popular links', { tag: '@regression' }, async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await expect(home.header.popularLinks).toHaveText([...POPULAR_SUBCATEGORIES]);
    });

    for (const name of POPULAR_SUBCATEGORIES) {
      test(`NAV-021 Each popular link opens the correct subcategory page: ${name}`, { tag: '@regression' }, async ({ page }) => {
        const home = new HomePage(page);
        const list = new ProductListPage(page);
        const sub = SUBCATEGORIES.find((s) => s.name === name)!;
        await home.goto();

        await home.header.popularLink(name).click();
        await expect(list.heading).toHaveText(name);
        await list.waitForProducts();

        expect(await list.breadcrumbText()).toBe(LIST_TEXT.breadcrumb(sub.category, name));
        await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(sub.count));
        await expect(home.header.popularLink(name)).toHaveClass(/active/);
        await expect(home.header.activeNavLinks).toHaveCount(1);
      });
    }
  });

  test.describe('highlighting, chips and sorting', () => {
    test('NAV-030 Only the link of the current page is highlighted', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'blackFridayLink');

      await list.header.freeShippingLink.click();
      await list.waitForProducts();
      await expect(list.header.activeNavLinks).toHaveCount(1);
      await expect(list.header.freeShippingLink).toHaveClass(/active/);

      await list.header.brand.click();
      await expect(page).toHaveURL(/#home$/);
      await expect(list.header.activeNavLinks).toHaveCount(0);
    });

    test('NAV-031 Removing the deal or free shipping chip shows all products', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'blackFridayLink');

      for (const { chip, link } of chipPages) {
        if (link) {
          await list.header[link].click();
          await list.waitForProducts();
        }
        await list.filterChip(chip).click();
        await expect(list.heading).toHaveText(LIST_TEXT.allProducts);
        await list.waitForProducts();
        await expect(list.resultCount).toHaveText(LIST_TEXT.resultCount(CATALOG.totalProducts));
      }
    });

    test('NAV-032 Sorting works on the deals and free shipping pages', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'blackFridayLink');

      for (const { chip, link } of chipPages) {
        if (link) {
          await list.header[link].click();
          await list.waitForProducts();
        }
        await list.sortBy(LIST_TEXT.sort.priceLowHigh);
        const prices = await list.grid.prices();
        expect(prices, chip).toEqual([...prices].sort((a, b) => a - b));
        await expect(list.filterChip(chip)).toBeVisible();
      }
    });
  });
});
