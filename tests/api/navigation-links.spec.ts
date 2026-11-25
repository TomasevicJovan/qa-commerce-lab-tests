import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { API_ERRORS, CATALOG, LIMITS, QUERY } from '@data/index';
import type { ApiError, ProductPage } from '@api/types';

test.describe('Black Friday, Free shipping and popular links', { tag: ['@navigation', '@api'] }, () => {
  test('NAV-040 deal=black-friday returns only deal products', { tag: '@smoke' }, async ({ anonApi }) => {
    const response = await anonApi.catalog.list({ deal: QUERY.deal.blackFriday, limit: LIMITS.pageSize.max });

    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'get', '/products');
    const body = (await response.json()) as ProductPage;
    expect(body.total).toBe(CATALOG.blackFridayDeals);
    for (const product of body.items) {
      expect.soft(product.deal, product.name).toBe(QUERY.deal.blackFriday);
      expect.soft(product.compareAtPrice ?? 0, product.name).toBeGreaterThan(product.price);
    }
  });

  test('NAV-041 Products not on a deal have no original price', { tag: '@regression' }, async ({ anonApi }) => {
    for (const page of [1, 2]) {
      const body = (await (await anonApi.catalog.list({ limit: LIMITS.pageSize.max, page })).json()) as ProductPage;
      for (const product of body.items.filter((p) => p.deal === null)) {
        expect.soft(product.compareAtPrice, product.name).toBeNull();
      }
    }
  });

  test('NAV-042 freeShipping filter returns the correct products', { tag: '@regression' }, async ({ anonApi }) => {
    for (const { value, total } of [
      { value: QUERY.freeShipping.yes, total: CATALOG.freeShippingProducts },
      { value: QUERY.freeShipping.no, total: CATALOG.totalProducts - CATALOG.freeShippingProducts },
    ]) {
      const body = (await (await anonApi.catalog.list({ freeShipping: value, limit: LIMITS.pageSize.max })).json()) as ProductPage;
      expect(body.total, `freeShipping=${value}`).toBe(total);
      const all = [...body.items];
      if (body.total > LIMITS.pageSize.max) all.push(...((await (await anonApi.catalog.list({ freeShipping: value, limit: LIMITS.pageSize.max, page: 2 })).json()) as ProductPage).items);
      for (const product of all) expect.soft(product.freeShipping, product.name).toBe(value === QUERY.freeShipping.yes);
    }
  });

  test('NAV-043 Invalid filter values return 422', { tag: '@regression' }, async ({ anonApi }) => {
    for (const { query, error } of [
      { query: { deal: 'xmas' }, error: API_ERRORS.catalog.unknownDeal },
      { query: { freeShipping: 'yes' }, error: API_ERRORS.catalog.invalidFreeShipping },
    ]) {
      const response = await anonApi.catalog.list(query);
      expect(response.status(), JSON.stringify(query)).toBe(422);
      expect(((await response.json()) as ApiError).error).toBe(error);
    }
  });
});
