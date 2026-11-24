import { test, expect } from '@core/fixtures';
import { ProductListPage } from '@pages/index';
import { CATALOG, PRODUCTS } from '@core/test-data';
import { availableStock, drainStockTo } from '@core/flows/order-flow';
import { formatUsd } from '@core/pricing';
import { createApiClients } from '@api/index';

const { arcHeadphones, orbitLamp, loopKeyboard, pulseController, novaChair, fieldBackpack, glowNightLight } = PRODUCTS;
const LAST_PAGE = Math.ceil(CATALOG.totalProducts / CATALOG.pageSize); // 12
// Products the stock checks own, so no other test changes their stock: Core Adjustable Dumbbells and Ridge Two-Person Tent.
const DUMBBELLS = { id: 'p24', name: 'Core Adjustable Dumbbells' };
const TENT = { id: 'p28', name: 'Ridge Two-Person Tent' };

const ascending = (values: number[]) => values.every((v, i) => i === 0 || values[i - 1]! <= v);
const descending = (values: number[]) => values.every((v, i) => i === 0 || values[i - 1]! >= v);

test.describe('Product list and product card', { tag: '@product-list' }, () => {
  test.describe('sorting', () => {
    test('LIST-001 Default sort is Featured (catalog order)', { tag: '@regression' }, async ({ page }) => {
      const list = new ProductListPage(page);
      await list.goto();

      await expect(list.sortSelect.locator('option:checked')).toHaveText('Featured');
      expect((await list.grid.productNames()).slice(0, 3)).toEqual([arcHeadphones.name, orbitLamp.name, loopKeyboard.name]);
    });

    test('LIST-002 Price low to high', { tag: '@smoke' }, async ({ page }) => {
      const list = new ProductListPage(page);
      await list.goto();

      await list.sortBy('Price: low to high');

      const prices = await list.grid.prices();
      expect(prices[0]).toBe(900);
      expect(ascending(prices)).toBe(true);
      await list.nextPage.click();
      await list.waitForProducts();
      const pageTwo = await list.grid.prices();
      expect(pageTwo[0]).toBeGreaterThanOrEqual(prices.at(-1) ?? 0);
      expect(ascending(pageTwo)).toBe(true);
    });

    test('LIST-003 Price high to low', { tag: '@regression' }, async ({ page }) => {
      const list = new ProductListPage(page);
      await list.goto();

      await list.sortBy('Price: high to low');

      expect(descending(await list.grid.prices())).toBe(true);
      expect((await list.grid.productNames())[0]).toBe(novaChair.name);
      await expect(list.grid.price(novaChair.name)).toHaveText(formatUsd(novaChair.price));
    });

    test('LIST-004 Most popular', { tag: '@regression' }, async ({ page }) => {
      const list = new ProductListPage(page);
      await list.goto();

      await list.sortBy('Most popular');

      expect((await list.grid.productNames()).slice(0, 3)).toEqual([arcHeadphones.name, pulseController.name, 'Sense Smart Plug (2-pack)']);
    });

    test('LIST-005 Changing the sort returns to page 1 and keeps filters', { tag: '@regression' }, async ({ page }) => {
      const list = new ProductListPage(page);
      await list.goto({ category: 'Electronics', page: 2 });
      await expect(list.pageIndicator).toHaveText('Page 2 of 3');

      await list.sortBy('Price: low to high');

      await expect(list.pageIndicator).toHaveText('Page 1 of 3');
      await expect(list.filterChip('Electronics')).toBeVisible();
      expect(page.url()).toContain('sort=price');
      expect(page.url()).not.toContain('page=');
    });
  });

  test.describe('pages', () => {
    test('LIST-010 List shows 8 products per page', { tag: '@smoke' }, async ({ page }) => {
      const list = new ProductListPage(page);
      await list.goto();

      await expect(list.grid.cards).toHaveCount(CATALOG.pageSize);
      await expect(list.pageIndicator).toHaveText(`Page 1 of ${LAST_PAGE}`);
      await expect(list.resultCount).toHaveText(`${CATALOG.totalProducts} products`);
    });

    test('LIST-011 Next and Previous move between pages', { tag: '@regression' }, async ({ page }) => {
      const list = new ProductListPage(page);
      await list.goto();
      const firstPage = await list.grid.productNames();

      await list.nextPage.click();
      await expect(list.pageIndicator).toHaveText(`Page 2 of ${LAST_PAGE}`);
      await list.waitForProducts();
      const secondPage = await list.grid.productNames();
      expect(secondPage).toHaveLength(8);
      for (const name of secondPage) expect(firstPage).not.toContain(name);

      await list.previousPage.click();
      await expect(list.pageIndicator).toHaveText(`Page 1 of ${LAST_PAGE}`);
      await list.waitForProducts();
      expect(await list.grid.productNames()).toEqual(firstPage);
    });

    test('LIST-012 Previous disabled on page 1, Next on the last page', { tag: '@regression' }, async ({ page }) => {
      const list = new ProductListPage(page);
      await list.goto();
      await expect(list.previousPage).toHaveAttribute('aria-disabled', 'true');
      await expect(list.previousPage).not.toHaveAttribute('href');

      await list.goto({ page: LAST_PAGE });
      await expect(list.nextPage).toHaveAttribute('aria-disabled', 'true');
      await expect(list.nextPage).not.toHaveAttribute('href');
    });

    test('LIST-013 Last page shows the remaining products', { tag: '@regression' }, async ({ page }) => {
      const list = new ProductListPage(page);
      await list.goto({ page: LAST_PAGE });

      expect(await list.grid.productNames()).toEqual([glowNightLight.name]);
    });

    test('LIST-014 Pagination is hidden when everything fits on one page', { tag: '@regression' }, async ({ page }) => {
      const list = new ProductListPage(page);
      await list.goto({ category: 'Electronics', subcategory: 'Gaming' });

      await expect(list.grid.cards).toHaveCount(4);
      await expect(list.previousPage).toHaveCount(0);
      await expect(list.nextPage).toHaveCount(0);
      await expect(list.pageIndicator).toHaveCount(0);
    });

    test('LIST-015 Page in the link opens that page', { tag: '@regression' }, async ({ page }) => {
      const list = new ProductListPage(page);
      await list.goto({ page: 3 });

      await expect(list.pageIndicator).toHaveText(`Page 3 of ${LAST_PAGE}`);
    });
  });

  test.describe('product card', () => {
    test('LIST-020 Card shows name, subcategory, price and stock', { tag: '@regression' }, async ({ page, anonApi }) => {
      const list = new ProductListPage(page);
      const stock = await availableStock(anonApi, arcHeadphones.id);
      await list.goto();
      const card = list.grid.card(arcHeadphones.name);

      await expect(card.getByRole('heading', { level: 3 })).toHaveText(arcHeadphones.name);
      await expect(list.grid.subcategoryLink(arcHeadphones.name)).toHaveText('Audio');
      await expect(list.grid.price(arcHeadphones.name)).toHaveText('$129.00');
      await expect(list.grid.stock(arcHeadphones.name)).toHaveText(`${stock} available`);
      await expect(list.grid.addToBagButton(arcHeadphones.name)).toBeVisible();
      await expect(list.grid.heart(arcHeadphones.name)).toBeVisible();
    });

    test('LIST-021 Subcategory on the card opens that subcategory', { tag: '@regression' }, async ({ page }) => {
      const list = new ProductListPage(page);
      await list.goto();

      await list.grid.subcategoryLink(arcHeadphones.name).click();

      await expect(list.heading).toHaveText('Audio');
      await list.waitForProducts();
      await expect(list.resultCount).toHaveText('4 products');
    });

    test('LIST-022 Product with 1 unit shows "Last one"', { tag: '@regression' }, async ({ page, api, request, createUser }) => {
      const list = new ProductListPage(page);
      await drainStockTo(api, createApiClients(request, (await createUser()).token), DUMBBELLS.id, 1);

      await list.goto({ q: DUMBBELLS.name });

      await expect(list.grid.card(DUMBBELLS.name).locator('.product-tag')).toHaveText('Last one');
      await expect(list.grid.stock(DUMBBELLS.name)).toHaveText('1 available');
    });

    test('LIST-023 Low stock is highlighted', { tag: '@regression' }, async ({ page, api, request, createUser }) => {
      const list = new ProductListPage(page);
      await drainStockTo(api, createApiClients(request, (await createUser()).token), TENT.id, 3);
      expect(await availableStock(api, arcHeadphones.id), 'Arc has more than 3 units').toBeGreaterThan(3);

      await list.goto({ q: TENT.name });
      await expect(list.grid.stock(TENT.name)).toHaveText('3 available');
      await expect(list.grid.stock(TENT.name)).toHaveClass(/stock-low/);

      await list.goto({ q: 'headphones' });
      await expect(list.grid.stock(arcHeadphones.name)).not.toHaveClass(/stock-low/);
    });

    test('LIST-024 Sold out product cannot be added', { tag: '@regression' }, async ({ signedInPage: page, api, request, createUser }) => {
      const list = new ProductListPage(page);
      await drainStockTo(api, createApiClients(request, (await createUser()).token), fieldBackpack.id, 0);

      await list.goto({ q: fieldBackpack.name });

      await expect(list.grid.stock(fieldBackpack.name)).toHaveText('Sold out');
      await expect(list.grid.addToBagButton(fieldBackpack.name)).toBeDisabled();
    });
  });
});
