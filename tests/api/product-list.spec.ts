import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { API_ERRORS, CATALOG, LIMITS, QUERY } from '@data/index';
import type { ApiError, Product, ProductPage } from '@api/types';
import type { ApiClients } from '@api/index';

/** All 89 products in one order, read with the largest allowed page size. */
async function allProducts(api: ApiClients, sort?: string): Promise<Product[]> {
  const items: Product[] = [];
  for (let page = 1; items.length < CATALOG.totalProducts; page++) {
    const body = (await (await api.catalog.list({ sort, limit: LIMITS.pageSize.max, page })).json()) as ProductPage;
    if (!body.items.length) break;
    items.push(...body.items);
  }
  return items;
}

test.describe('Product list and product card', { tag: ['@product-list', '@api'] }, () => {
  const SORTS = [
    { sort: QUERY.sort.priceLowHigh, key: 'price', direction: 'ascending' },
    { sort: QUERY.sort.priceHighLow, key: 'price', direction: 'descending' },
    { sort: QUERY.sort.popular, key: 'popularity', direction: 'descending' },
  ] as const;
  for (const { sort, key, direction } of SORTS) {
    test(`LIST-030 Sort orders are correct: ${sort}`, { tag: '@regression' }, async ({ anonApi }) => {
      const values = (await allProducts(anonApi, sort)).map((p) => p[key] as number);

      expect(values).toHaveLength(CATALOG.totalProducts);
      const expected = [...values].sort((a, b) => (direction === 'ascending' ? a - b : b - a));
      expect(values).toEqual(expected);
    });
  }

  test('LIST-031 Pages return the correct slice', { tag: '@regression' }, async ({ anonApi }) => {
    const seen = new Set<string>();
    const pages = Math.ceil(CATALOG.totalProducts / CATALOG.pageSize);

    for (let page = 1; page <= pages; page++) {
      const response = await anonApi.catalog.list({ limit: CATALOG.pageSize, page });
      if (page === 1) await expectMatchesContract(response, 'get', '/products');
      const body = (await response.json()) as ProductPage;
      expect(body.total, `page ${page}`).toBe(CATALOG.totalProducts);
      expect(body.items, `page ${page}`).toHaveLength(page < pages ? 8 : 1);
      for (const product of body.items) {
        expect(seen.has(product.id), `${product.id} appears twice`).toBe(false);
        seen.add(product.id);
      }
    }
    expect(seen.size).toBe(CATALOG.totalProducts);
  });

  for (const query of [{ page: 0 }, { limit: 0 }, { limit: LIMITS.pageSize.max + 1 }, { page: 1.5 }]) {
    test(`LIST-032 Invalid pagination returns 422: ${JSON.stringify(query)}`, { tag: '@regression' }, async ({ anonApi }) => {
      const response = await anonApi.catalog.list(query);

      expect(response.status()).toBe(422);
      expect(((await response.json()) as ApiError).error).toBe(API_ERRORS.catalog.invalidPagination);
    });
  }

  test('LIST-033 Unknown sort falls back to catalog order', { tag: '@regression' }, async ({ anonApi }) => {
    const unsorted = (await allProducts(anonApi)).map((p) => p.id);
    const byName = (await allProducts(anonApi, 'unknown-sort')).map((p) => p.id);

    expect(byName).toEqual(unsorted);
  });
});
