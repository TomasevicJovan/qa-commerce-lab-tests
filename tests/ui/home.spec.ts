import { test, expect } from '@core/fixtures';
import { HomePage, type ShelfId } from '@pages/index';
import { HOME_ROWS, HOME_TEXT, LIST_TEXT, VISIBLE_IN_ROW } from '@data/index';
import type { CardFacts } from '@pages/components/product-grid';

const SHELF_IDS = Object.keys(HOME_TEXT.shelves) as ShelfId[];
const SHELVES = SHELF_IDS.map((id) => ({ id, ...HOME_TEXT.shelves[id] }));
const ANY_POSITION = /of \d+$/;
const { position } = HOME_TEXT;
/** Position text of the n-th set of 4 products in a row (0 = first set). */
const set = (n: number, size: number) => position(n * VISIBLE_IN_ROW + 1, Math.min((n + 1) * VISIBLE_IN_ROW, size), size);
const popularSize = HOME_ROWS.popular.size;
const workspaceSize = HOME_ROWS.workspace.size;

/** Waits until every row has loaded its products. */
async function openHome(home: HomePage): Promise<void> {
  await home.goto();
  for (const id of SHELF_IDS) await home.expectPosition(id, ANY_POSITION);
}

/** Reads every product of a row by clicking › until it stops. */
async function wholeRow(home: HomePage, id: ShelfId): Promise<CardFacts[]> {
  const seen = new Map<string, CardFacts>();
  for (const card of await home.products(id).facts()) seen.set(card.name, card);
  while (await home.next(id).isEnabled()) {
    await home.moveNext(id);
    for (const card of await home.products(id).facts()) seen.set(card.name, card);
  }
  return [...seen.values()];
}

test.describe('Home page product rows', { tag: '@home' }, () => {
  test('HOME-001 Home page shows the 4 rows in order with exact titles and subtitles', { tag: '@smoke' }, async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.shelfTitles).toHaveText(SHELVES.map((s) => s.title));
    await expect(home.shelfSubtitles).toHaveText(SHELVES.map((s) => s.subtitle));
  });

  test('HOME-002 Each row shows 4 products', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    for (const id of SHELF_IDS) await expect(home.products(id).cards, id).toHaveCount(VISIBLE_IN_ROW);
  });

  test('HOME-003 Black Friday row shows only deals, most popular first', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    const cards = await wholeRow(home, 'black-friday');

    expect(cards[0]?.name).toBe(HOME_ROWS['black-friday'].first.name);
    for (const card of cards) expect.soft(card.badge, card.name).toMatch(LIST_TEXT.dealBadgePattern);
  });

  test('HOME-004 Most popular row shows products by popularity', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    expect(await home.products('popular').productNames()).toEqual(HOME_ROWS.popular.firstFour.map((p) => p.name));
  });

  test('HOME-005 Free shipping row shows only free shipping products', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    const cards = await wholeRow(home, 'free-shipping');

    expect(cards).toHaveLength(HOME_ROWS['free-shipping'].size);
    for (const card of cards) expect.soft(card.freeShipping, card.name).not.toBeNull();
  });

  test('HOME-006 Better desk days row shows only Workspace products', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    const cards = await wholeRow(home, 'workspace');

    expect(cards).toHaveLength(workspaceSize);
    for (const card of cards) expect.soft(card.subcategory, card.name).toBe(HOME_ROWS.workspace.subcategory);
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

    await home.expectPosition('popular', set(1, popularSize));
    const second = await home.products('popular').productNames();
    expect(second).toHaveLength(VISIBLE_IN_ROW);
    for (const name of second) expect(first).not.toContain(name);
    await expect(home.previous('popular')).toBeEnabled();
  });

  test('HOME-009 Previous arrow returns to the earlier products', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);
    const first = await home.products('popular').productNames();
    await home.next('popular').click();
    await home.expectPosition('popular', set(1, popularSize));

    await home.previous('popular').click();

    await home.expectPosition('popular', set(0, popularSize));
    expect(await home.products('popular').productNames()).toEqual(first);
  });

  test('HOME-010 Next arrow is disabled at the end of a row', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    await home.next('popular').click();
    await home.next('popular').click();

    await home.expectPosition('popular', set(2, popularSize));
    await expect(home.next('popular')).toBeDisabled();
  });

  test('HOME-011 A row with 5 products ends on the last 4', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    await home.next('workspace').click();

    await home.expectPosition('workspace', position(workspaceSize - VISIBLE_IN_ROW + 1, workspaceSize, workspaceSize));
    await expect(home.products('workspace').cards).toHaveCount(VISIBLE_IN_ROW);
    await expect(home.next('workspace')).toBeDisabled();
  });

  test('HOME-012 Each row moves independently', { tag: '@regression' }, async ({ page }) => {
    const home = new HomePage(page);
    await openHome(home);

    await home.next('popular').click();

    await home.expectPosition('popular', set(1, popularSize));
    for (const id of SHELF_IDS.filter((shelf) => shelf !== 'popular')) {
      await home.expectPosition(id, set(0, HOME_ROWS[id].size));
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
