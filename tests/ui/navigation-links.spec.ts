import { test, expect } from '@core/fixtures';
import type { Locator, Page } from '@playwright/test';
import { HomePage, ProductListPage } from '@pages/index';
import { CATALOG, POPULAR_SUBCATEGORIES, PRODUCTS, SUBCATEGORIES } from '@core/test-data';

interface CardFacts {
  name: string;
  price: string;
  priceIsSale: boolean;
  compare: string | null;
  badge: string | null;
  freeShipping: boolean;
}

/** The facts the deal and free shipping checks need, for every card on the current page. */
const readCards = (cards: Locator) =>
  cards.evaluateAll((articles) =>
    articles.map((a) => ({
      name: a.querySelector('h3')?.textContent?.trim() ?? '',
      price: a.querySelector('.price')?.textContent?.trim() ?? '',
      priceIsSale: a.querySelector('.price')?.classList.contains('sale') ?? false,
      compare: a.querySelector('.compare-price')?.textContent?.trim() ?? null,
      badge: a.querySelector('.product-tag.deal')?.textContent?.trim() ?? null,
      freeShipping: a.querySelector('.free-shipping')?.textContent?.trim() === '✓ Free shipping',
    })),
  );
const cents = (money: string) => Math.round(Number(money.replace(/[^0-9.]/g, '')) * 100);
const activeNavLinks = (page: Page) => page.locator('[data-nav-link].active');

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

      await expect(page).toHaveURL(/#shop\?deal=black-friday$/);
      await expect(list.heading).toHaveText('Black Friday deals');
      await expect(list.resultCount).toHaveText(`${CATALOG.blackFridayDeals} products`);
      await expect(list.filterChip('Black Friday')).toBeVisible();
      await expect(list.header.blackFridayLink).toHaveClass(/active/);
    });

    test('NAV-002 Every deal shows its badge, sale price and original price', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'blackFridayLink');

      const cards = await list.collectAcrossPages(() => readCards(list.grid.cards));

      expect(cards).toHaveLength(CATALOG.blackFridayDeals);
      for (const card of cards) {
        expect.soft(card.badge, card.name).toMatch(/^Black Friday −\d+%$/);
        expect.soft(card.priceIsSale, `${card.name}: price shown as a sale price`).toBe(true);
        expect.soft(card.compare, `${card.name}: original price`).toMatch(/^\$\d+\.\d{2}$/);
      }
    });

    test('NAV-003 Badge percentage is correct for each deal', { tag: '@regression' }, async ({ page }) => {
      // One run checks all 21 deals: a soft assertion per product names the failing deal.
      const list = await openFromHome(page, 'blackFridayLink');

      const cards = await list.collectAcrossPages(() => readCards(list.grid.cards));

      expect(cards).toHaveLength(CATALOG.blackFridayDeals);
      for (const card of cards) {
        const percent = Math.round((1 - cents(card.price) / cents(card.compare ?? '0')) * 100);
        expect.soft(card.badge, `${card.name} ${card.price} was ${card.compare}`).toBe(`Black Friday −${percent}%`);
      }
      const camera = cards.find((c) => c.name === PRODUCTS.eyeCamera.name);
      expect(camera).toMatchObject({ price: '$69.00', compare: '$115.00', badge: 'Black Friday −40%' });
    });

    test('NAV-004 Deals have 3 pages with only deal products', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'blackFridayLink');

      const perPage = await list.collectAcrossPages(async () => [await readCards(list.grid.cards)]);

      expect(perPage.map((cards) => cards.length)).toEqual([8, 8, 5]);
      for (const card of perPage.flat()) expect.soft(card.badge, card.name).not.toBeNull();
    });
  });

  test.describe('Free shipping', () => {
    test('NAV-010 Free shipping link opens the free shipping page', { tag: '@smoke' }, async ({ page }) => {
      const list = await openFromHome(page, 'freeShippingLink');

      await expect(page).toHaveURL(/#shop\?freeShipping=true$/);
      await expect(list.heading).toHaveText('Free shipping');
      await expect(list.resultCount).toHaveText(`${CATALOG.freeShippingProducts} products`);
      await expect(list.filterChip('Free shipping')).toBeVisible();
      await expect(list.header.freeShippingLink).toHaveClass(/active/);
    });

    test('NAV-011 Every listed product shows "Free shipping"', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'freeShippingLink');

      const perPage = await list.collectAcrossPages(async () => [await readCards(list.grid.cards)]);

      expect(perPage.map((cards) => cards.length)).toEqual([8, 8, 8, 5]);
      for (const card of perPage.flat()) expect.soft(card.freeShipping, card.name).toBe(true);
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

        expect(await list.breadcrumbText()).toBe(`Home › All categories › ${sub.category} › ${name}`);
        await expect(list.resultCount).toHaveText(`${sub.count} products`);
        await expect(home.header.popularLink(name)).toHaveClass(/active/);
        await expect(activeNavLinks(page)).toHaveCount(1);
      });
    }
  });

  test.describe('highlighting, chips and sorting', () => {
    test('NAV-030 Only the link of the current page is highlighted', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'blackFridayLink');

      await list.header.freeShippingLink.click();
      await list.waitForProducts();
      await expect(activeNavLinks(page)).toHaveCount(1);
      await expect(list.header.freeShippingLink).toHaveClass(/active/);

      await list.header.brand.click();
      await expect(page).toHaveURL(/#home$/);
      await expect(activeNavLinks(page)).toHaveCount(0);
    });

    test('NAV-031 Removing the deal or free shipping chip shows all products', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'blackFridayLink');

      for (const { chip, link } of [
        { chip: 'Black Friday', link: null },
        { chip: 'Free shipping', link: 'freeShippingLink' as const },
      ]) {
        if (link) {
          await list.header[link].click();
          await list.waitForProducts();
        }
        await list.filterChip(chip).click();
        await expect(list.heading).toHaveText('All products');
        await list.waitForProducts();
        await expect(list.resultCount).toHaveText(`${CATALOG.totalProducts} products`);
      }
    });

    test('NAV-032 Sorting works on the deals and free shipping pages', { tag: '@regression' }, async ({ page }) => {
      const list = await openFromHome(page, 'blackFridayLink');

      for (const { chip, link } of [
        { chip: 'Black Friday', link: null },
        { chip: 'Free shipping', link: 'freeShippingLink' as const },
      ]) {
        if (link) {
          await list.header[link].click();
          await list.waitForProducts();
        }
        await list.sortBy('Price: low to high');
        const prices = await list.grid.prices();
        expect(prices, chip).toEqual([...prices].sort((a, b) => a - b));
        await expect(list.filterChip(chip)).toBeVisible();
      }
    });
  });
});
