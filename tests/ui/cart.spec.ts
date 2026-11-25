import { test, expect } from '@core/fixtures';
import { HomePage, ProductListPage, CheckoutPage } from '@pages/index';
import { API_ERRORS, AUTH_TEXT, CART_TEXT, CHECKOUT_TEXT, LIMITS, PRODUCTS, TOTALS_TEXT } from '@data/index';
import { drainStockTo, setCart } from '@core/flows/order-flow';
import { calculateTotals, formatUsd } from '@core/pricing';
import { createApiClients } from '@api/index';

const { arcHeadphones, orbitLamp, stillMug, pebbleClock, novaChair, noteJournal, fieldBackpack } = PRODUCTS;

test.describe('Cart', { tag: '@cart' }, () => {
  test.describe('adding products', () => {
    test('CART-001 Add to bag adds the product', { tag: '@smoke' }, async ({ signedInPage: page }) => {
      const list = new ProductListPage(page);
      await list.goto({ q: arcHeadphones.name });

      await list.grid.addToBag(arcHeadphones.name);

      await expect(list.header.bagCount).toHaveText('1');
      await list.notifications.expectShown('success', { title: CART_TEXT.notifications.added.title, message: CART_TEXT.notifications.added.message(arcHeadphones.name) });
    });

    test('CART-002 Adding the same product again increases its quantity', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const list = new ProductListPage(page);
      await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }]);
      await page.reload();
      await list.goto({ q: arcHeadphones.name });

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

      await expect(list.grid.stock(fieldBackpack.name)).toHaveText(CART_TEXT.soldOut);
      await expect(list.grid.addToBagButton(fieldBackpack.name)).toBeDisabled();
    });

    test('CART-004 Quantity cannot exceed 10', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const list = new ProductListPage(page);
      await setCart(api, [{ productId: stillMug.id, quantity: LIMITS.cartQuantity.max }]);
      await page.reload();
      await list.goto({ q: stillMug.name });

      await list.grid.addToBag(stillMug.name);

      await list.notifications.expectShown('error', { title: CART_TEXT.notifications.notAdded.title, message: API_ERRORS.cart.invalidItems });
      await expect(list.header.bagCount).toHaveText(String(LIMITS.cartQuantity.max));
      expect(await (await api.cart.get()).json()).toEqual([{ productId: stillMug.id, quantity: LIMITS.cartQuantity.max }]);
    });
  });

  test.describe('bag dialog', () => {
    test('CART-010 Bag shows each product with name, price and quantity', { tag: '@smoke' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }, { productId: orbitLamp.id, quantity: 2 }]);
      await home.goto();

      await home.header.openBag();

      await expect(home.bag.title).toHaveText(CART_TEXT.title);
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

      await expect(home.bag.priceOf(novaChair.name)).toHaveText(`${formatUsd(novaChair.price)} ${formatUsd(novaChair.compareAtPrice!)}`);
      await expect(home.bag.originalPriceOf(novaChair.name)).toHaveText(formatUsd(novaChair.compareAtPrice!));
      await expect(home.bag.priceOf(noteJournal.name)).toHaveText(CART_TEXT.lineFreeShipping(noteJournal.price));
    });

    test('CART-012 Plus increases the quantity and updates the totals', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: pebbleClock.id, quantity: 1 }]);
      await home.goto();
      await home.header.openBag();

      await home.bag.increase(pebbleClock.name);

      await expect(home.bag.quantityOf(pebbleClock.name)).toHaveText('2');
      const expected = calculateTotals([{ unitPrice: pebbleClock.price, quantity: 2 }]);
      await expect(home.bag.totals.value(TOTALS_TEXT.subtotal)).toHaveText(formatUsd(expected.subtotal));
      await expect(home.bag.totals.value(TOTALS_TEXT.total)).toHaveText(formatUsd(expected.total));
      await expect(home.header.bagCount).toHaveText('2');
    });

    test('CART-013 Minus decreases the quantity and updates the totals', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: pebbleClock.id, quantity: 2 }]);
      await home.goto();
      await home.header.openBag();

      await home.bag.decrease(pebbleClock.name);

      await expect(home.bag.quantityOf(pebbleClock.name)).toHaveText('1');
      const expected = calculateTotals([{ unitPrice: pebbleClock.price, quantity: 1 }]);
      await expect(home.bag.totals.value(TOTALS_TEXT.subtotal)).toHaveText(formatUsd(expected.subtotal));
      await expect(home.bag.totals.value(TOTALS_TEXT.total)).toHaveText(formatUsd(expected.total));
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
      await home.notifications.expectShown('info', { message: CART_TEXT.notifications.removed.message(pebbleClock.name) });
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

      const expected = calculateTotals([{ unitPrice: arcHeadphones.price, quantity: 1 }]);
      await expect(home.bag.totals.value(TOTALS_TEXT.subtotal)).toHaveText(formatUsd(expected.subtotal));
      await expect(home.bag.totals.value(TOTALS_TEXT.discount)).toHaveText(TOTALS_TEXT.minus(expected.discount));
      await expect(home.bag.totals.value(TOTALS_TEXT.shipping)).toHaveText(formatUsd(expected.shipping));
      await expect(home.bag.totals.value(TOTALS_TEXT.total)).toHaveText(formatUsd(expected.total));
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
      await expect(checkout.heading).toHaveText(CHECKOUT_TEXT.heading);
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

      await expect(home.header.accountButton).toHaveText(AUTH_TEXT.accountButton(customerB.name));
      await expect(home.header.bagCount).toHaveText('0');
      await home.header.openBag();
      await expect(home.bag.emptyState).toBeVisible();
    });
  });
});

