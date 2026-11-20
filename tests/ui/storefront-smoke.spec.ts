import { test, expect } from '@core/fixtures';
import { ensureStock } from '@core/flows/order-flow';
import { LabPage, ShopPage } from '@pages/index';

test.describe('Storefront smoke', () => {
  test('signed-in customer adds the right product among identical buttons', { tag: ['@smoke'] }, async ({ signedInPage, api, workerUser }) => {
    const shop = new ShopPage(signedInPage);

    await test.step('start from an empty bag', async () => {
      // A sold-out product renders a disabled button, so check stock first for a clear failure message.
      await ensureStock(api, 'p2', 1);
      expect((await api.cart.clear()).status()).toBe(200);
      await shop.goto();
      await expect(shop.header.accountButton).toHaveText(`${workerUser.name} · Sign out`);
      await expect(shop.header.bagCount).toHaveText('0');
    });

    await test.step('add Orbit Desk Lamp', () => shop.addToBag('Orbit Desk Lamp'));

    await expect(shop.header.bagCount).toHaveText('1');
    await expect(shop.toast).toHaveText('Added to your bag');

    await test.step('the server cart holds exactly that product', async () => {
      expect(await (await api.cart.get()).json()).toEqual([{ productId: 'p2', quantity: 1 }]);
    });
  });

  test('QA laboratory shows the transport and all services healthy', { tag: ['@smoke'] }, async ({ page }) => {
    const lab = new LabPage(page);
    await lab.goto();

    await expect(lab.heading).toBeVisible();
    await expect(lab.transport).toHaveText(/^(LOCAL|KAFKA) TRANSPORT$/);
    await expect(lab.servicePills).toHaveCount(6);
    for (const service of ['broker', 'identity', 'catalog', 'orders', 'inventory', 'payments']) {
      await expect.soft(lab.service(service)).toHaveText(`● ${service} · ok`);
    }
  });
});
