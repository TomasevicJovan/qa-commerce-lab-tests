import { test, expect } from '@core/fixtures';
import { HomePage, type ShelfId } from '@pages/index';
import { PRODUCTS } from '@core/test-data';

const SHELVES: { id: ShelfId; title: string; subtitle: string; seeAll: string }[] = [
  { id: 'black-friday', title: 'Black Friday deals', subtitle: 'Up to 40% off, while stock lasts', seeAll: '#shop?deal=black-friday&sort=popular' },
  { id: 'popular', title: 'Most popular', subtitle: 'What everyone is adding to their bag', seeAll: '#shop?sort=popular' },
  { id: 'free-shipping', title: 'Free shipping picks', subtitle: 'Fill a bag with these and shipping is on us', seeAll: '#shop?freeShipping=true&sort=popular' },
  { id: 'workspace', title: 'Better desk days', subtitle: 'Workspace essentials', seeAll: '#shop?category=Office+%26+School&subcategory=Workspace' },
];

interface CardFacts {
  name: string;
  badge: string | null;
  freeShipping: boolean;
  subcategory: string;
}

/** Waits until every row has loaded its products. */
async function openHome(home: HomePage): Promise<void> {
  await home.goto();
  for (const { id } of SHELVES) await expect(home.position(id)).toHaveAttribute('data-position', /of \d+$/);
}

/** Reads every product of a row by clicking › until it stops. */
async function wholeRow(home: HomePage, id: ShelfId): Promise<CardFacts[]> {
  const read = () =>
    home.products(id).cards.evaluateAll((cards) =>
      cards.map((c) => ({
        name: c.querySelector('h3')?.textContent?.trim() ?? '',
        badge: c.querySelector('.product-tag.deal')?.textContent?.trim() ?? null,
        freeShipping: c.querySelector('.free-shipping') !== null,
        subcategory: c.querySelector('a.category')?.textContent?.trim() ?? '',
      })),
    );
  const seen = new Map<string, CardFacts>();
  for (const card of await read()) seen.set(card.name, card);
  while (await home.next(id).isEnabled()) {
    const position = await home.position(id).getAttribute('data-position');
    await home.next(id).click();
    await expect(home.position(id)).not.toHaveAttribute('data-position', position ?? '');
    for (const card of await read()) seen.set(card.name, card);
  }
  return [...seen.values()];
}

test.describe('Home page product rows', { tag: '@home' }, () => {
  test('HOME-001 Home page shows the 4 rows in order with exact titles and subtitles', { tag: '@smoke' }, async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.shelves.locator('h2')).toHaveText(SHELVES.map((s) => s.title));
    await expect(home.shelves.locator('.shelf-head p')).toHaveText(SHELVES.map((s) => s.subtitle));
  });

  test('HOME-002 Each row shows 4 products', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    for (const { id } of SHELVES) await expect(home.products(id).cards, id).toHaveCount(4);
  });

  test('HOME-003 Black Friday row shows only deals, most popular first', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    const cards = await wholeRow(home, 'black-friday');

    expect(cards[0]?.name).toBe(PRODUCTS.pulseController.name);
    for (const card of cards) expect.soft(card.badge, card.name).toMatch(/^Black Friday −\d+%$/);
  });

  test('HOME-004 Most popular row shows products by popularity', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    expect(await home.products('popular').productNames()).toEqual([
      PRODUCTS.arcHeadphones.name,
      PRODUCTS.pulseController.name,
      'Sense Smart Plug (2-pack)',
      'Bud True Wireless Earbuds',
    ]);
  });

  test('HOME-005 Free shipping row shows only free shipping products', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    const cards = await wholeRow(home, 'free-shipping');

    expect(cards).toHaveLength(12);
    for (const card of cards) expect.soft(card.freeShipping, card.name).toBe(true);
  });

  test('HOME-006 Better desk days row shows only Workspace products', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    const cards = await wholeRow(home, 'workspace');

    expect(cards).toHaveLength(5);
    for (const card of cards) expect.soft(card.subcategory, card.name).toBe('Workspace');
  });

  test('HOME-007 Previous arrow is disabled at the start of each row', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    for (const { id } of SHELVES) await expect(home.previous(id), id).toBeDisabled();
  });

  test('HOME-008 Next arrow shows the next 4 products', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);
    const first = await home.products('popular').productNames();

    await home.next('popular').click();

    await expect(home.position('popular')).toHaveAttribute('data-position', '5-8 of 12');
    const second = await home.products('popular').productNames();
    expect(second).toHaveLength(4);
    for (const name of second) expect(first).not.toContain(name);
    await expect(home.previous('popular')).toBeEnabled();
  });

  test('HOME-009 Previous arrow returns to the earlier products', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);
    const first = await home.products('popular').productNames();
    await home.next('popular').click();
    await expect(home.position('popular')).toHaveAttribute('data-position', '5-8 of 12');

    await home.previous('popular').click();

    await expect(home.position('popular')).toHaveAttribute('data-position', '1-4 of 12');
    expect(await home.products('popular').productNames()).toEqual(first);
  });

  test('HOME-010 Next arrow is disabled at the end of a row', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    await home.next('popular').click();
    await home.next('popular').click();

    await expect(home.position('popular')).toHaveAttribute('data-position', '9-12 of 12');
    await expect(home.next('popular')).toBeDisabled();
  });

  test('HOME-011 A row with 5 products ends on the last 4', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    await home.next('workspace').click();

    await expect(home.position('workspace')).toHaveAttribute('data-position', '2-5 of 5');
    await expect(home.products('workspace').cards).toHaveCount(4);
    await expect(home.next('workspace')).toBeDisabled();
  });

  test('HOME-012 Each row moves independently', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    await home.next('popular').click();

    await expect(home.position('popular')).toHaveAttribute('data-position', '5-8 of 12');
    for (const id of ['black-friday', 'free-shipping', 'workspace'] as const) {
      await expect(home.position(id), id).toHaveAttribute('data-position', /^1-4 of/);
    }
  });

  for (const { id, title, seeAll } of SHELVES) {
    test(`HOME-013 "See all →" opens the matching product list: ${title}`, { tag: '@regression' }, async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.seeAll(id).click();

      await expect(page).toHaveURL(new RegExp(`${seeAll.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    });
  }
});
