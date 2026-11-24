import { test, expect } from '@core/fixtures';
import { HomePage, ProductListPage, WishlistPage } from '@pages/index';
import { PRODUCTS } from '@core/test-data';
import { drainStockTo } from '@core/flows/order-flow';
import { createApiClients } from '@api/index';

const { arcHeadphones, orbitLamp, pulseController, fieldBackpack } = PRODUCTS;

test.describe('Wishlist', { tag: '@wishlist' }, () => {
  test.describe('hearts', () => {
    test('WISH-001 Clicking an empty heart saves the product', { tag: '@smoke' }, async ({ signedInPage: page, api }) => {
      const list = new ProductListPage(page);
      await list.goto({ q: 'headphones' });
      const heart = list.grid.heart(arcHeadphones.name);
      await expect(heart).toHaveAttribute('aria-pressed', 'false');

      await heart.click();

      await expect(heart).toHaveAttribute('aria-pressed', 'true');
      await expect(heart).toHaveText('♥');
      await expect(list.header.wishlistCount).toHaveText('1');
      await list.notifications.expectShown('success', { message: `${arcHeadphones.name} was saved to your wishlist.` });
      expect(await (await api.wishlist.get()).json()).toEqual([expect.objectContaining({ productId: arcHeadphones.id })]);
    });

    test('WISH-002 Clicking a filled heart removes the product', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const list = new ProductListPage(page);
      await api.wishlist.add(arcHeadphones.id);
      await page.reload();
      await list.goto({ q: 'headphones' });
      const heart = list.grid.heart(arcHeadphones.name);
      await expect(heart).toHaveText('♥');

      await heart.click();

      await expect(heart).toHaveText('♡');
      await expect(heart).toHaveAttribute('aria-pressed', 'false');
      await expect(list.header.wishlistCount).toHaveText('0');
      await list.notifications.expectShown('info', { message: `${arcHeadphones.name} was removed from your wishlist.` });
    });

    test('WISH-003 Same product shown twice updates both hearts', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const home = new HomePage(page);
      await home.goto();
      const inDeals = home.products('black-friday').heart(pulseController.name);
      const inPopular = home.products('popular').heart(pulseController.name);
      await expect(inPopular).toHaveAttribute('aria-pressed', 'false');

      await inDeals.click();

      await expect(inDeals).toHaveAttribute('aria-pressed', 'true');
      await expect(inPopular).toHaveAttribute('aria-pressed', 'true');
    });

    test('WISH-004 Saved products show a filled heart everywhere', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      const list = new ProductListPage(page);
      await api.wishlist.add(arcHeadphones.id);
      await page.reload();

      await home.goto();
      await expect(home.products('popular').heart(arcHeadphones.name)).toHaveText('♥');
      await list.goto({ category: arcHeadphones.category, subcategory: arcHeadphones.subcategory });
      await expect(list.grid.heart(arcHeadphones.name)).toHaveText('♥');
      await list.goto({ q: 'headphones' });
      await expect(list.grid.heart(arcHeadphones.name)).toHaveText('♥');

      await page.reload();
      await list.waitForProducts();
      await expect(list.grid.heart(arcHeadphones.name)).toHaveText('♥');
    });

    test('WISH-010 Sold out product can be saved', { tag: '@regression' }, async ({ signedInPage: page, api, request, createUser }) => {
      const list = new ProductListPage(page);
      await drainStockTo(api, createApiClients(request, (await createUser()).token), fieldBackpack.id, 0);
      await list.goto({ q: fieldBackpack.name });
      await expect(list.grid.stock(fieldBackpack.name)).toHaveText('Sold out');

      await list.grid.heart(fieldBackpack.name).click();

      await expect(list.grid.heart(fieldBackpack.name)).toHaveText('♥');
      await expect(list.header.wishlistCount).toHaveText('1');
    });
  });

  test.describe('wishlist page', () => {
    test('WISH-005 Wishlist link opens the wishlist page', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const home = new HomePage(page);
      const wishlist = new WishlistPage(page);
      await home.goto();

      await home.header.wishlistLink.click();

      await expect(page).toHaveURL(/#wishlist$/);
      await expect(wishlist.heading).toHaveText('Your wishlist.');
    });

    test('WISH-006 Wishlist page shows saved products newest first', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const wishlist = new WishlistPage(page);
      await api.wishlist.add(arcHeadphones.id);
      await api.wishlist.add(orbitLamp.id);

      await wishlist.goto();

      await expect(wishlist.summary).toContainText('2 saved products');
      await expect(wishlist.grid.names).toHaveText([orbitLamp.name, arcHeadphones.name]);
    });

    test('WISH-007 Removing a product on the wishlist page', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const wishlist = new WishlistPage(page);
      await api.wishlist.add(arcHeadphones.id);
      await api.wishlist.add(orbitLamp.id);
      await wishlist.goto();
      await expect(wishlist.grid.cards).toHaveCount(2);

      await wishlist.grid.heart(orbitLamp.name).click();

      await expect(wishlist.grid.card(orbitLamp.name)).toHaveCount(0);
      await expect(wishlist.summary).toContainText('1 saved product.');
      await expect(wishlist.header.wishlistCount).toHaveText('1');
    });

    test('WISH-008 Add to bag works from the wishlist page', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const wishlist = new WishlistPage(page);
      await api.wishlist.add(arcHeadphones.id);
      await wishlist.goto();

      await wishlist.grid.addToBag(arcHeadphones.name);

      await expect(wishlist.header.bagCount).toHaveText('1');
      await expect(wishlist.grid.card(arcHeadphones.name)).toBeVisible();
    });

    test('WISH-009 Empty wishlist shows the empty message', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const wishlist = new WishlistPage(page);
      await wishlist.goto();

      await expect(wishlist.emptyState).toBeVisible();
      await wishlist.discoverLink.click();
      await expect(page).toHaveURL(/#home$/);
    });
  });

  test.describe('keeping the wishlist', () => {
    test('WISH-011 Wishlist is kept after reload and after sign out and sign in', { tag: '@regression' }, async ({ signedInPage: page, api, customer }) => {
      const home = new HomePage(page);
      await api.wishlist.add(arcHeadphones.id);
      await api.wishlist.add(orbitLamp.id);
      await home.goto();

      await page.reload();
      await home.waitUntilReady();
      await expect(home.header.wishlistCount).toHaveText('2');

      await home.header.signOut();
      await expect(home.header.wishlistCount).toHaveText('0');
      await home.header.openSignIn();
      await home.authDialog.signIn(customer.email, customer.password);
      await expect(home.header.wishlistCount).toHaveText('2');
    });

    test('WISH-012 Two customers have separate wishlists', { tag: '@regression' }, async ({ page, api, createUser }) => {
      const home = new HomePage(page);
      const wishlist = new WishlistPage(page);
      await api.wishlist.add(arcHeadphones.id); // customer A
      await api.wishlist.add(orbitLamp.id);
      const customerB = await createUser();
      await home.goto();

      await home.header.openSignIn();
      await home.authDialog.signIn(customerB.email, customerB.password);

      await expect(home.header.accountButton).toHaveText(`${customerB.name} ▾`);
      await expect(home.header.wishlistCount).toHaveText('0');
      await wishlist.goto();
      await expect(wishlist.emptyState).toBeVisible();
    });
  });
});
