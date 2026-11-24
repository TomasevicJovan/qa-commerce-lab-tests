import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { CATEGORY_TREE } from '@core/test-data';
import type { CategorySummary } from '@api/types';

test.describe('All categories dropdown', { tag: ['@categories-menu', '@api'] }, () => {
  test('CATM-020 /products/categories returns 9 categories with their subcategories', { tag: '@smoke' }, async ({ anonApi }) => {
    const response = await anonApi.catalog.categories();

    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'get', '/products/categories');
    const tree = (await response.json()) as CategorySummary[];
    expect(tree.map((c) => ({ name: c.name, count: c.productCount, subcategories: c.subcategories.map((s) => ({ name: s.name, count: s.productCount })) }))).toEqual(CATEGORY_TREE);
  });
});
