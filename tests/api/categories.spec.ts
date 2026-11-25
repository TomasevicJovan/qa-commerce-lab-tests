import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { CATEGORY_TREE, POPULAR_SUBCATEGORIES } from '@core/test-data';
import type { CategorySummary, ProductPage } from '@api/types';
import type { ApiClients } from '@api/index';

const tree = async (api: ApiClients) => (await (await api.catalog.categories()).json()) as CategorySummary[];

test.describe('All categories dropdown', { tag: ['@categories-menu', '@api'] }, () => {
  test('CATM-020 /products/categories returns 9 categories with their subcategories', { tag: '@smoke' }, async ({ anonApi }) => {
    const response = await anonApi.catalog.categories();

    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'get', '/products/categories');
    const categories = (await response.json()) as CategorySummary[];
    expect(categories.map((c) => ({ name: c.name, count: c.productCount, subcategories: c.subcategories.map((s) => ({ name: s.name, count: s.productCount })) }))).toEqual(CATEGORY_TREE);
  });

  test('CATM-021 Subcategory counts add up to the category count', { tag: '@regression' }, async ({ anonApi }) => {
    for (const category of await tree(anonApi)) {
      expect(category.subcategories.reduce((n, s) => n + s.productCount, 0), category.name).toBe(category.productCount);
    }
  });

  test('CATM-022 Counts match the products returned by /products', { tag: '@regression' }, async ({ anonApi }) => {
    for (const category of await tree(anonApi)) {
      const whole = (await (await anonApi.catalog.list({ category: category.name, limit: 50 })).json()) as ProductPage;
      expect(whole.total, category.name).toBe(category.productCount);
      for (const product of whole.items) expect(product.category).toBe(category.name);

      for (const sub of category.subcategories) {
        const body = (await (await anonApi.catalog.list({ category: category.name, subcategory: sub.name, limit: 50 })).json()) as ProductPage;
        expect(body.total, `${category.name} › ${sub.name}`).toBe(sub.productCount);
        for (const product of body.items) expect(product).toMatchObject({ category: category.name, subcategory: sub.name });
      }
    }
  });

  test('CATM-023 Exactly 5 subcategories are marked popular', { tag: '@regression' }, async ({ anonApi }) => {
    const popular = (await tree(anonApi)).flatMap((c) => c.subcategories.filter((s) => s.popular).map((s) => s.name));

    expect(popular).toEqual([...POPULAR_SUBCATEGORIES]);
  });
});
