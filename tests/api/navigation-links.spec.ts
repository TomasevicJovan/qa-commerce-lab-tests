import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { CATALOG } from '@core/test-data';
import type { ApiError, ProductPage } from '@api/types';

test.describe('Black Friday, Free shipping and popular links', { tag: ['@navigation', '@api'] }, () => {
  test('NAV-040 deal=black-friday returns only deal products', { tag: '@smoke' }, async ({ anonApi }) => {
    const response = await anonApi.catalog.list({ deal: 'black-friday', limit: 50 });

    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'get', '/products');
    const body = (await response.json()) as ProductPage;
    expect(body.total).toBe(CATALOG.blackFridayDeals);
    for (const product of body.items) {
      expect.soft(product.deal, product.name).toBe('black-friday');
      expect.soft(product.compareAtPrice ?? 0, product.name).toBeGreaterThan(product.price);
    }
  });

  test('NAV-041 Products not on a deal have no original price', { tag: '@regression' }, async ({ anonApi }) => {
    for (const page of [1, 2]) {
      const body = (await (await anonApi.catalog.list({ limit: 50, page })).json()) as ProductPage;
      for (const product of body.items.filter((p) => p.deal === null)) {
        expect.soft(product.compareAtPrice, product.name).toBeNull();
      }
    }
  });

  test('NAV-042 freeShipping filter returns the correct products', { tag: '@regression' }, async ({ anonApi }) => {
    for (const { value, total } of [
      { value: 'true', total: CATALOG.freeShippingProducts },
      { value: 'false', total: CATALOG.totalProducts - CATALOG.freeShippingProducts },
    ]) {
      const body = (await (await anonApi.catalog.list({ freeShipping: value, limit: 50 })).json()) as ProductPage;
      expect(body.total, `freeShipping=${value}`).toBe(total);
      const all = [...body.items];
      if (body.total > 50) all.push(...((await (await anonApi.catalog.list({ freeShipping: value, limit: 50, page: 2 })).json()) as ProductPage).items);
      for (const product of all) expect.soft(product.freeShipping, product.name).toBe(value === 'true');
    }
  });

  test('NAV-043 Invalid filter values return 422', { tag: '@regression' }, async ({ anonApi }) => {
    for (const { query, error } of [
      { query: { deal: 'xmas' }, error: 'Unknown deal. Use black-friday' },
      { query: { freeShipping: 'yes' }, error: 'freeShipping must be true or false' },
    ]) {
      const response = await anonApi.catalog.list(query);
      expect(response.status(), JSON.stringify(query)).toBe(422);
      expect(((await response.json()) as ApiError).error).toBe(error);
    }
  });
});
