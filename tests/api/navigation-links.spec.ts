import { test, expect } from '@core/fixtures';
import { CATALOG } from '@core/test-data';
import type { ProductPage } from '@api/types';

test.describe('Black Friday, Free shipping and popular links', { tag: ['@navigation', '@api'] }, () => {
  test('NAV-040 deal=black-friday returns only deal products', { tag: '@smoke' }, async ({ anonApi }) => {
    const response = await anonApi.catalog.list({ deal: 'black-friday', limit: 50 });

    expect(response.status()).toBe(200);
    const body = (await response.json()) as ProductPage;
    expect(body.total).toBe(CATALOG.blackFridayDeals);
    for (const product of body.items) {
      expect.soft(product.deal, product.name).toBe('black-friday');
      expect.soft(product.compareAtPrice ?? 0, product.name).toBeGreaterThan(product.price);
    }
  });
});
