import { test, expect } from '@core/fixtures';
import { ProductListPage } from '@pages/index';
import { LIST_TEXT, PRODUCTS } from '@data/index';
import { SEARCHES } from '@data/cases/search';

// Locator mode is a global lab switch, so this test runs alone in the serial "lab-scenarios" project.
test.describe('Product list and product card', { tag: '@product-list' }, () => {
  test('LIST-025 Cards work when IDs change (lab dynamic locators)', { tag: '@regression' }, async ({ signedInPage: page, lab }) => {
    const list = new ProductListPage(page);
    const { orbitLamp } = PRODUCTS;
    await lab.set({ locatorMode: 'dynamic' });
    await page.reload();
    await list.goto({ q: SEARCHES.lamps.term }); // keeps Orbit Desk Lamp on page 1 whatever the sort
    const card = list.grid.card(orbitLamp.name);
    await expect(card).not.toHaveAttribute('data-testid');
    const classBefore = await card.getAttribute('class');

    await list.sortBy(LIST_TEXT.sort.priceLowHigh);
    await expect(card).toBeVisible();
    expect(await card.getAttribute('class'), 'the card gets a new generated class').not.toBe(classBefore);
    await expect(list.grid.cards.and(page.locator('[data-testid]'))).toHaveCount(0);

    await list.grid.addToBag(orbitLamp.name);

    await expect(list.header.bagCount).toHaveText('1');
  });
});
