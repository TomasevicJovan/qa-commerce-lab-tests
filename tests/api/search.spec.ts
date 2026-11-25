import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { CATALOG, LIMITS } from '@data/index';
import { SEARCHES, messy } from '@data/cases/search';
import type { ProductPage } from '@api/types';
import type { ApiClients } from '@api/index';

async function search(api: ApiClients, query: Record<string, string | number>): Promise<ProductPage> {
  const response = await api.catalog.list(query);
  expect(response.status(), JSON.stringify(query)).toBe(200);
  return (await response.json()) as ProductPage;
}
const names = (page: ProductPage) => page.items.map((p) => p.name).sort();
const sortedNames = (products: readonly { name: string }[]) => products.map((p) => p.name).sort();
const all = { limit: LIMITS.pageSize.max };
const { twoNames, bySubcategory, byCategory, withinCategory } = SEARCHES;

test.describe('Search', { tag: ['@search', '@api'] }, () => {
  test('SRCH-020 q matches the product name', { tag: '@smoke' }, async ({ anonApi }) => {
    const response = await anonApi.catalog.list({ q: twoNames.term, ...all });

    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'get', '/products');
    const body = (await response.json()) as ProductPage;
    expect(body.total).toBe(twoNames.results.length);
    expect(names(body)).toEqual(sortedNames(twoNames.results));
    for (const product of body.items) expect(product.name.toLowerCase()).toContain(twoNames.term);
  });

  test('SRCH-021 q matches category and subcategory names', { tag: '@regression' }, async ({ anonApi }) => {
    const bySub = await search(anonApi, { q: bySubcategory.term, ...all });
    expect(bySub.items).toHaveLength(bySubcategory.results.length);
    for (const product of bySub.items) expect(product.subcategory).toBe(bySubcategory.subcategory);

    const byCat = await search(anonApi, { q: byCategory.term, ...all });
    expect(byCat.items).toHaveLength(byCategory.count);
    for (const product of byCat.items) expect(product.category).toBe(byCategory.category);
  });

  test('SRCH-022 q is case-insensitive and trimmed', { tag: '@regression' }, async ({ anonApi }) => {
    const plain = await search(anonApi, { q: twoNames.term, ...all });
    const typedDifferently = await search(anonApi, { q: messy(twoNames.term), ...all });

    expect(names(typedDifferently)).toEqual(names(plain));
  });

  test('SRCH-023 q with no match returns an empty list', { tag: '@regression' }, async ({ anonApi }) => {
    const body = await search(anonApi, { q: SEARCHES.noMatch });

    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  test('SRCH-024 Empty q returns all products', { tag: '@regression' }, async ({ anonApi }) => {
    expect((await search(anonApi, { q: '' })).total).toBe(CATALOG.totalProducts);
  });

  test('SRCH-025 q combined with category returns only the intersection', { tag: '@regression' }, async ({ anonApi }) => {
    const body = await search(anonApi, { q: withinCategory.term, category: withinCategory.category, ...all });

    expect(names(body)).toEqual(sortedNames(withinCategory.results));
  });

  test('SRCH-026 total counts all matches, not only the page', { tag: '@regression' }, async ({ anonApi }) => {
    const pageSize = 2;
    const first = await search(anonApi, { q: SEARCHES.manyResults, limit: pageSize, page: 1 });
    const second = await search(anonApi, { q: SEARCHES.manyResults, limit: pageSize, page: 2 });

    expect(first.items).toHaveLength(pageSize);
    expect(second.items).toHaveLength(pageSize);
    expect(second.total).toBe(first.total);
    expect(first.total).toBeGreaterThan(pageSize * 2);
    expect(second.items.map((p) => p.id)).not.toEqual(first.items.map((p) => p.id));
  });
});
