import { test, expect } from '@core/fixtures';
import { ShopPage } from '@pages/index';

// UI-02/UI-03: in dynamic mode ids change on every rerender and test ids disappear.
test('semantic locators keep working when ids are regenerated and test ids are removed', { tag: ['@regression'] }, async ({ signedInPage: page, api, lab }) => {
  await lab.set({ locatorMode: 'dynamic', renderDelay: 1_500 });
  await api.cart.clear();
  const shop = new ShopPage(page);
  await shop.goto();

  const firstId = await test.step('test ids are gone and ids are random', async () => {
    await expect(page.getByTestId('product-p2')).toHaveCount(0);
    const id = await shop.addToBagButton('Orbit Desk Lamp').getAttribute('id');
    expect(id).not.toBe('add-p2');
    return id;
  });

  await test.step('rerendering the collection generates a new id', async () => {
    await shop.sortByPrice();
    await expect(shop.cardTitles.first()).toHaveText('Still Ceramic Mug');
    await expect(shop.addToBagButton('Orbit Desk Lamp')).not.toHaveAttribute('id', firstId ?? '');
  });

  await test.step('adding by product name still targets the right card', async () => {
    await shop.addToBag('Orbit Desk Lamp');
    await expect(shop.header.bagCount).toHaveText('1');
    expect(await (await api.cart.get()).json()).toEqual([{ productId: 'p2', quantity: 1 }]);
  });
});
