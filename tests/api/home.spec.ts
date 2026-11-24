import { test, expect } from '@core/fixtures';
import { PRODUCTS } from '@core/test-data';
import type { ProductPage } from '@api/types';

const nonIncreasing = (values: number[]) => values.every((v, i) => i === 0 || values[i - 1]! >= v);

test.describe('Home page product rows', { tag: ['@home', '@api'] }, () => {
  test('HOME-020 sort=popular orders by popularity', { tag: '@regression' }, async ({ anonApi }) => {
    const body = (await (await anonApi.catalog.list({ sort: 'popular', limit: 50 })).json()) as ProductPage;

    expect(nonIncreasing(body.items.map((p) => p.popularity))).toBe(true);
    expect(body.items[0]).toMatchObject({ name: PRODUCTS.arcHeadphones.name, popularity: 95 });
  });

  test('HOME-021 Deals sorted by popularity', { tag: '@regression' }, async ({ anonApi }) => {
    const body = (await (await anonApi.catalog.list({ deal: 'black-friday', sort: 'popular', limit: 12 })).json()) as ProductPage;

    expect(body.items).toHaveLength(12);
    for (const product of body.items) expect.soft(product.deal, product.name).toBe('black-friday');
    expect(nonIncreasing(body.items.map((p) => p.popularity))).toBe(true);
    expect(body.items[0]).toMatchObject({ name: PRODUCTS.pulseController.name, popularity: 92 });
  });
});
