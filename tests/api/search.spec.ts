import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { CATALOG } from '@core/test-data';
import type { ProductPage } from '@api/types';
import type { ApiClients } from '@api/index';

async function search(api: ApiClients, query: Record<string, string | number>): Promise<ProductPage> {
  const response = await api.catalog.list(query);
  expect(response.status(), JSON.stringify(query)).toBe(200);
  return (await response.json()) as ProductPage;
}
const names = (page: ProductPage) => page.items.map((p) => p.name).sort();

test.describe('Search', { tag: ['@search', '@api'] }, () => {
  test('SRCH-020 q matches the product name', { tag: '@smoke' }, async ({ anonApi }) => {
    const response = await anonApi.catalog.list({ q: 'speaker', limit: 50 });

    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'get', '/products');
    const body = (await response.json()) as ProductPage;
    expect(body.total).toBe(2);
    expect(names(body)).toEqual(['Pocket Mini Speaker', 'Studio Bookshelf Speakers']);
    for (const product of body.items) expect(product.name.toLowerCase()).toContain('speaker');
  });

  test('SRCH-021 q matches category and subcategory names', { tag: '@regression' }, async ({ anonApi }) => {
    const gaming = await search(anonApi, { q: 'gaming', limit: 50 });
    expect(gaming.items).toHaveLength(4);
    for (const product of gaming.items) expect(product.subcategory).toBe('Gaming');

    const pets = await search(anonApi, { q: 'pets', limit: 50 });
    expect(pets.items).toHaveLength(6);
    for (const product of pets.items) expect(product.category).toBe('Pets');
  });

  test('SRCH-022 q is case-insensitive and trimmed', { tag: '@regression' }, async ({ anonApi }) => {
    const plain = await search(anonApi, { q: 'speaker', limit: 50 });
    const messy = await search(anonApi, { q: ' SPEAKER ', limit: 50 });

    expect(names(messy)).toEqual(names(plain));
  });

  test('SRCH-023 q with no match returns an empty list', { tag: '@regression' }, async ({ anonApi }) => {
    const body = await search(anonApi, { q: 'teleporter' });

    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  test('SRCH-024 Empty q returns all products', { tag: '@regression' }, async ({ anonApi }) => {
    expect((await search(anonApi, { q: '' })).total).toBe(CATALOG.totalProducts);
  });

  test('SRCH-025 q combined with category returns only the intersection', { tag: '@regression' }, async ({ anonApi }) => {
    const body = await search(anonApi, { q: 'stand', category: 'Electronics', limit: 50 });

    expect(names(body)).toEqual(['Charge 3-in-1 Stand', 'Deck Headset Stand']);
  });

  test('SRCH-026 total counts all matches, not only the page', { tag: '@regression' }, async ({ anonApi }) => {
    const first = await search(anonApi, { q: 'a', limit: 2, page: 1 });
    const second = await search(anonApi, { q: 'a', limit: 2, page: 2 });

    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(2);
    expect(second.total).toBe(first.total);
    expect(first.total).toBeGreaterThan(4);
    expect(second.items.map((p) => p.id)).not.toEqual(first.items.map((p) => p.id));
  });
});
