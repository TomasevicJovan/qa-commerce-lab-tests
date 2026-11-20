import { test, expect } from '@core/fixtures';
import { formatUsd } from '@core/pricing';
import { ShopPage } from '@pages/index';

// Seed catalog from qa-commerce-lab: 9 products, 6 per page.
const FIRST_PAGE = [
  'Arc Wireless Headphones',
  'Orbit Desk Lamp',
  'Loop Mechanical Keyboard',
  'Field Everyday Backpack',
  'Still Ceramic Mug',
  'Pocket Mini Speaker',
];

test.describe('Catalog browsing', () => {
  let shop: ShopPage;

  test.beforeEach(async ({ page }) => {
    shop = new ShopPage(page);
    await shop.goto();
  });

  test('collection shows the first page of six products out of nine', { tag: ['@smoke'] }, async () => {
    await expect(shop.resultCount).toHaveText('9 objects');
    await expect(shop.cardTitles).toHaveText(FIRST_PAGE);
    await expect(shop.priceOf('Arc Wireless Headphones')).toHaveText(formatUsd(12_900));
  });

  test('pagination shows the remaining three products on page two', { tag: ['@regression'] }, async () => {
    await expect(shop.previousPageButton).toBeDisabled();

    await test.step('go to page two', () => shop.nextPageButton.click());

    await expect(shop.pageIndicator).toHaveText('Page 2');
    await expect(shop.cardTitles).toHaveText(['Pebble Desk Clock', 'Fold Travel Organizer', 'Halo Glass Vase']);
    await expect(shop.nextPageButton).toBeDisabled();
  });

  test('debounced search narrows results and clearing restores the collection', { tag: ['@regression'] }, async () => {
    await test.step('search for "speaker"', () => shop.search('speaker'));
    await expect(shop.cardTitles).toHaveText(['Pocket Mini Speaker']);
    await expect(shop.resultCount).toHaveText('1 objects');

    await test.step('search for a product that does not exist', () => shop.search('teleporter'));
    await expect(shop.emptyState).toBeVisible();

    await test.step('clear the search', () => shop.search(''));
    await expect(shop.resultCount).toHaveText('9 objects');
  });

  test('category filter shows only matching products and resets to page one', { tag: ['@regression'] }, async () => {
    await test.step('move to page two first', () => shop.nextPageButton.click());
    await expect(shop.pageIndicator).toHaveText('Page 2');

    await test.step('filter by Audio', () => shop.filterBy('Audio'));

    await expect(shop.cardTitles).toHaveText(['Arc Wireless Headphones', 'Pocket Mini Speaker']);
    await expect(shop.resultCount).toHaveText('2 objects');
    // Two results fit on one page, so pagination disappears: we are back on page one.
    await expect(shop.pageIndicator).toBeHidden();
  });

  test('sorting by price lists the cheapest products first', { tag: ['@regression'] }, async () => {
    await test.step('sort by price, low to high', () => shop.sortByPrice());

    await expect(shop.cardTitles).toHaveText([
      'Still Ceramic Mug',
      'Fold Travel Organizer',
      'Pebble Desk Clock',
      'Pocket Mini Speaker',
      'Halo Glass Vase',
      'Orbit Desk Lamp',
    ]);
  });
});
