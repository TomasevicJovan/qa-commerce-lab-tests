import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import type { ProductPage } from '@api/types';

test.describe('Search', { tag: ['@search', '@api'] }, () => {
  test('SRCH-020 q matches the product name', { tag: '@smoke' }, async ({ anonApi }) => {
    const response = await anonApi.catalog.list({ q: 'speaker', limit: 50 });

    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'get', '/products');
    const body = (await response.json()) as ProductPage;
    expect(body.total).toBe(2);
    expect(body.items.map((p) => p.name).sort()).toEqual(['Pocket Mini Speaker', 'Studio Bookshelf Speakers']);
    for (const product of body.items) expect(product.name.toLowerCase()).toContain('speaker');
  });
});
