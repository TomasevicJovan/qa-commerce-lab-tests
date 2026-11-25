import { test, expect } from '@core/fixtures';
import { HomePage, ProductListPage, CheckoutPage } from '@pages/index';
import { PRODUCTS } from '@core/test-data';
import { drainStockTo, setCart } from '@core/flows/order-flow';
import { formatUsd } from '@core/pricing';
import { createApiClients } from '@api/index';

const { arcHeadphones, orbitLamp, stillMug, pebbleClock, novaChair, noteJournal, fieldBackpack } = PRODUCTS;

test.describe('Cart', { tag: '@cart' }, () => {
  test.describe('adding products', () => {
    test('CART-001 Add to bag adds the product', { tag: '@smoke' }, async ({ signedInPage: page }) => {
      const list = new ProductListPage(page);
      await list.goto({ q: 'headphones' });

      await list.grid.addToBag(arcHeadphones.name);

      await expect(list.header.bagCount).toHaveText('1');
      await list.notifications.expectShown('success', { title: 'Added to your bag', message: `${arcHeadphones.name} was added to your bag.` });
    });

    test('CART-002 Adding the same product again increases its quantity', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const list = new ProductListPage(page);
      await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }]);
      await page.reload();
      await list.goto({ q: 'headphones' });

      await list.grid.addToBag(arcHeadphones.name);
      await expect(list.header.bagCount).toHaveText('2');
      await list.header.openBag();

      await expect(list.bag.lines).toHaveCount(1);
      await expect(list.bag.quantityOf(arcHeadphones.name)).toHaveText('2');
    });

    test('CART-003 Sold out product has a disabled button', { tag: '@regression' }, async ({ signedInPage: page, api, request, createUser }) => {
      const list = new ProductListPage(page);
      await drainStockTo(api, createApiClients(request, (await createUser()).token), fieldBackpack.id, 0);

      await list.goto({ q: fieldBackpack.name });

      await expect(list.grid.stock(fieldBackpack.name)).toHaveText('Sold out');
      await expect(list.grid.addToBagButton(fieldBackpack.name)).toBeDisabled();
    });

    test('CART-004 Quantity cannot exceed 10', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const list = new ProductListPage(page);
      await setCart(api, [{ productId: stillMug.id, quantity: 10 }]);
      await page.reload();
      await list.goto({ q: stillMug.name });

      await list.grid.addToBag(stillMug.name);

      await list.notifications.expectShown('error', { title: 'Could not add to bag', message: 'Unique products with quantities 1–10 required' });
      await expect(list.header.bagCount).toHaveText('10');
      expect(await (await api.cart.get()).json()).toEqual([{ productId: stillMug.id, quantity: 10 }]);
    });
  });

  test.describe('bag dialog', () => {
    test('CART-010 Bag shows each product with name, price and quantity', { tag: '@smoke' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }, { productId: orbitLamp.id, quantity: 2 }]);
      await home.goto();

      await home.header.openBag();

      await expect(home.bag.title).toHaveText('Your shopping bag');
      await expect(home.bag.lines).toHaveCount(2);
      await expect(home.bag.line(arcHeadphones.name)).toContainText(formatUsd(arcHeadphones.price));
      await expect(home.bag.quantityOf(arcHeadphones.name)).toHaveText('1');
      await expect(home.bag.line(orbitLamp.name)).toContainText(formatUsd(orbitLamp.price));
      await expect(home.bag.quantityOf(orbitLamp.name)).toHaveText('2');
    });

    test('CART-011 Deal and free shipping products are marked', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: novaChair.id, quantity: 1 }, { productId: noteJournal.id, quantity: 1 }]);
      await home.goto();

      await home.header.openBag();

      const chairPrice = home.bag.line(novaChair.name).locator('.cart-detail p');
      await expect(chairPrice).toHaveText(`${formatUsd(novaChair.price)} ${formatUsd(novaChair.compareAtPrice!)}`);
      await expect(chairPrice.locator('s')).toHaveText(formatUsd(novaChair.compareAtPrice!));
      await expect(home.bag.line(noteJournal.name).locator('.cart-detail p')).toHaveText(`${formatUsd(noteJournal.price)} · Free shipping`);
    });

    test('CART-012 Plus increases the quantity and updates the totals', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: pebbleClock.id, quantity: 1 }]);
      await home.goto();
      await home.header.openBag();

      await home.bag.increase(pebbleClock.name);

      await expect(home.bag.quantityOf(pebbleClock.name)).toHaveText('2');
      await expect(home.bag.totals.value('Subtotal')).toHaveText('$90.00');
      await expect(home.bag.totals.value('Total')).toHaveText('$97.00');
      await expect(home.header.bagCount).toHaveText('2');
    });

    test('CART-013 Minus decreases the quantity and updates the totals', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: pebbleClock.id, quantity: 2 }]);
      await home.goto();
      await home.header.openBag();

      await home.bag.decrease(pebbleClock.name);

      await expect(home.bag.quantityOf(pebbleClock.name)).toHaveText('1');
      await expect(home.bag.totals.value('Subtotal')).toHaveText('$45.00');
      await expect(home.bag.totals.value('Total')).toHaveText('$52.00');
      await expect(home.header.bagCount).toHaveText('1');
    });

    test('CART-014 Minus on quantity 1 removes the product', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: pebbleClock.id, quantity: 1 }, { productId: stillMug.id, quantity: 1 }]);
      await home.goto();
      await home.header.openBag();

      await home.bag.decrease(pebbleClock.name);

      await expect(home.bag.line(pebbleClock.name)).toHaveCount(0);
      await expect(home.bag.lines).toHaveCount(1);
      await home.notifications.expectShown('info', { message: `${pebbleClock.name} was removed from your bag.` });
      await expect(home.header.bagCount).toHaveText('1');
    });

    test('CART-015 Removing the last product shows the empty bag', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: stillMug.id, quantity: 1 }]);
      await home.goto();
      await home.header.openBag();

      await home.bag.decrease(stillMug.name);

      await expect(home.bag.emptyState).toBeVisible();
      await expect(home.header.bagCount).toHaveText('0');
    });

    test('CART-016 Bag totals are correct for a simple bag', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }]);
      await home.goto();

      await home.header.openBag();

      await expect(home.bag.totals.value('Subtotal')).toHaveText('$129.00');
      await expect(home.bag.totals.value('Discount')).toHaveText('−$0.00');
      await expect(home.bag.totals.value('Shipping')).toHaveText('$7.00');
      await expect(home.bag.totals.value('Total')).toHaveText('$136.00');
    });

    test('CART-017 Continue to checkout opens the checkout page', { tag: '@smoke' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      const checkout = new CheckoutPage(page);
      await setCart(api, [{ productId: stillMug.id, quantity: 1 }]);
      await home.goto();

      await home.header.openBag();
      await home.bag.continueToCheckout();

      await expect(home.bag.root).not.toBeVisible();
      await expect(page).toHaveURL(/#checkout$/);
      await expect(checkout.heading).toHaveText('Checkout');
    });

    test('CART-018 Bag closes with × and with a click outside', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: stillMug.id, quantity: 1 }]);
      await home.goto();

      await home.header.openBag();
      await home.bag.closeButton.click();
      await expect(home.bag.root).not.toBeVisible();

      await home.header.openBag();
      await expect(home.bag.root).toBeVisible();
      await page.mouse.click(5, 5);
      await expect(home.bag.root).not.toBeVisible();
    });
  });

  test.describe('keeping the bag', () => {
    test('CART-020 Bag is kept after page reload', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: orbitLamp.id, quantity: 2 }]);
      await home.goto();

      await page.reload();
      await home.waitUntilReady();

      await expect(home.header.bagCount).toHaveText('2');
      await home.header.openBag();
      await expect(home.bag.quantityOf(orbitLamp.name)).toHaveText('2');
    });

    test('CART-021 Bag is kept after sign out and sign in', { tag: '@regression' }, async ({ signedInPage: page, api, customer }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: orbitLamp.id, quantity: 2 }]);
      await page.reload();
      await home.goto();

      await home.header.signOut();
      await expect(home.header.bagCount).toHaveText('0');
      await home.header.openSignIn();
      await home.authDialog.signIn(customer.email, customer.password);

      await expect(home.header.bagCount).toHaveText('2');
      await home.header.openBag();
      await expect(home.bag.lines).toHaveCount(1);
      await expect(home.bag.quantityOf(orbitLamp.name)).toHaveText('2');
    });

    test('CART-022 Two customers have separate bags', { tag: '@regression' }, async ({ page, api, createUser }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }]); // customer A
      const customerB = await createUser();
      await home.goto();

      await home.header.openSignIn();
      await home.authDialog.signIn(customerB.email, customerB.password);

      await expect(home.header.accountButton).toHaveText(`${customerB.name} ▾`);
      await expect(home.header.bagCount).toHaveText('0');
      await home.header.openBag();
      await expect(home.bag.emptyState).toBeVisible();
    });
  });
});

