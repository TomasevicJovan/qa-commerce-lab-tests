import { test, expect } from '@core/fixtures';
import { HOME_ROWS, LIMITS, QUERY } from '@data/index';
import type { ProductPage } from '@api/types';

const nonIncreasing = (values: number[]) => values.every((v, i) => i === 0 || values[i - 1]! >= v);

test.describe('Home page product rows', { tag: ['@home', '@api'] }, () => {
  test('HOME-020 sort=popular orders by popularity', { tag: '@regression' }, async ({ anonApi }) => {
    const body = (await (await anonApi.catalog.list({ sort: QUERY.sort.popular, limit: LIMITS.pageSize.max })).json()) as ProductPage;

    expect(nonIncreasing(body.items.map((p) => p.popularity))).toBe(true);
    const [mostPopular] = HOME_ROWS.popular.firstFour;
    expect(body.items[0]).toMatchObject({ name: mostPopular.name, popularity: mostPopular.popularity });
  });

  test('HOME-021 Deals sorted by popularity', { tag: '@regression' }, async ({ anonApi }) => {
    const body = (await (await anonApi.catalog.list({ deal: QUERY.deal.blackFriday, sort: QUERY.sort.popular, limit: HOME_ROWS['black-friday'].size })).json()) as ProductPage;

    expect(body.items).toHaveLength(HOME_ROWS['black-friday'].size);
    for (const product of body.items) expect.soft(product.deal, product.name).toBe(QUERY.deal.blackFriday);
    expect(nonIncreasing(body.items.map((p) => p.popularity))).toBe(true);
    const { first } = HOME_ROWS['black-friday'];
    expect(body.items[0]).toMatchObject({ name: first.name, popularity: first.popularity });
  });
});
