import { test, expect } from '@core/fixtures';
import { CheckoutPage, HomePage, OrderPage, OrdersPage, ProductListPage, WishlistPage } from '@pages/index';
import { AUTH_TEXT, CART_TEXT, CHECKOUT_TEXT, COUPONS, LIST_TEXT, ORDER_TEXT, PAYMENT_TEXT, PRODUCTS, QUERY, SUBCATEGORY, TOTALS_TEXT, CARDS } from '@data/index';
import { SEARCHES } from '@data/cases/search';
import { signInWithToken } from '@core/fixtures';
import { availableStock, drainStockTo, ensureStock, setCart } from '@core/flows/order-flow';
import { buildCredentials } from '@core/factories/user-factory';
import { buildAddress, cardForm, formatAddress } from '@core/factories/checkout-factory';
import { SHIPPING_FEE, calculateTotals, formatUsd } from '@core/pricing';
import { config } from '@core/config';
import { createApiClients } from '@api/index';
import type { Order, Payment } from '@api/types';

const settle = { timeout: config.orderTimeoutMs };
const { arcHeadphones, pulseController, eyeCamera, stillMug, brewKettle, pressGrinder, noteJournal, trailBottle, pedalCage } = PRODUCTS;
// E2E-06 races for the last unit of its own product, so it never competes with ORD-004 and ORD-044 for stock.
const VASE = PRODUCTS.haloVase;
const { total: TOTAL, shipping: SHIPPING, minus } = TOTALS_TEXT;

/** Clicks Next on a product list until the product's card appears. */
async function findOnList(list: ProductListPage, name: string): Promise<void> {
  while (!(await list.grid.card(name).count())) {
    await expect(list.nextPage, `${name} should be on one of the pages`).not.toHaveAttribute('aria-disabled', 'true');
    const indicator = await list.pageIndicator.textContent();
    await list.nextPage.click();
    await expect(list.pageIndicator).not.toHaveText(indicator ?? '');
    await list.waitForProducts();
  }
}


test.describe('End-to-end flows', { tag: '@e2e' }, () => {
  // A flow walks through several features, so it gets more time than a single-feature test.
  test.describe.configure({ timeout: 90_000 });

  test('E2E-01 New customer buys with a new card and saves it', { tag: '@smoke' }, async ({ page, anonApi }) => {
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    const credentials = buildCredentials();
    const address = buildAddress();
    await ensureStock(anonApi, arcHeadphones.id, 2);
    const stockBefore = await availableStock(anonApi, arcHeadphones.id);
    const expected = calculateTotals([{ unitPrice: arcHeadphones.price, quantity: 1 }]);

    await test.step('SRCH-001 search "headphones"', async () => {
      await home.goto();
      await home.header.search(SEARCHES.byName.term);
      await list.waitForProducts();
      await expect(list.grid.price(arcHeadphones.name)).toHaveText(formatUsd(arcHeadphones.price));
    });

    await test.step('AUTH-004 register a new account', async () => {
      await home.header.openRegistration();
      await home.authDialog.register(credentials.name, credentials.email, credentials.password);
      await expect(home.header.accountButton).toHaveText(AUTH_TEXT.accountButton(credentials.name));
    });

    await test.step('CART-001 add Arc Wireless Headphones', async () => {
      await list.waitForProducts();
      await list.grid.addToBag(arcHeadphones.name);
      await expect(home.header.bagCount).toHaveText('1');
      await home.header.openBag();
      await expect(home.bag.line(arcHeadphones.name)).toContainText(formatUsd(arcHeadphones.price));
      await expect(home.bag.totals.value(TOTAL)).toHaveText(formatUsd(expected.total));
      await home.bag.continueToCheckout();
    });

    await test.step('CHK-061 pay with a new Visa 4242 and save it', async () => {
      await checkout.waitForForm();
      await expect(checkout.totals.value(TOTAL)).toHaveText(formatUsd(expected.total));
      await checkout.fillAddress(address);
      await checkout.fillCard(cardForm(CARDS.visa, { save: true }));
      await checkout.placeOrder();
    });

    await test.step('ORD-002 payment successful', async () => {
      await expect(order.bannerFor('confirmed')).toBeVisible(settle);
      await expect(order.totals.value(TOTAL)).toHaveText(formatUsd(expected.total));
      await expect(order.fact(ORDER_TEXT.facts.deliverTo)).toHaveText(formatAddress(address));
      expect(await availableStock(anonApi, arcHeadphones.id)).toBe(stockBefore - 1);
    });

    await test.step('next checkout lists Visa •••• 4242 for this customer', async () => {
      await list.goto({ q: arcHeadphones.name });
      await list.grid.addToBag(arcHeadphones.name);
      await expect(home.header.bagCount).toHaveText('1');
      await checkout.goto();
      await checkout.waitForForm();
      await expect(checkout.savedCard(CARDS.visa.last4)).toBeVisible();
      await expect(checkout.savedCardRadio(CARDS.visa.last4)).toBeChecked();
    });
  });

  test('E2E-02 Returning customer buys Black Friday products with SAVE10 and Mastercard', { tag: '@regression' }, async ({ page, customer, saveCards, api }) => {
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    await saveCards(CARDS.visa, CARDS.mastercard);
    for (const product of [pulseController, eyeCamera]) await ensureStock(api, product.id, 1);
    const expected = calculateTotals(
      [pulseController, eyeCamera].map((p) => ({ unitPrice: p.price, quantity: 1 })),
      { coupon: COUPONS.save10, cardBrand: 'mastercard' },
    );

    await test.step('AUTH-020 sign in', async () => {
      await home.goto();
      await home.header.openSignIn();
      await home.authDialog.signIn(customer.email, customer.password);
      await expect(home.header.accountButton).toHaveText(AUTH_TEXT.accountButton(customer.name));
    });

    await test.step('NAV-001 open Black Friday and CART-001 add two deals', async () => {
      await home.header.blackFridayLink.click();
      await list.waitForProducts();
      for (const product of [pulseController, eyeCamera]) {
        await list.goto({ deal: QUERY.deal.blackFriday });
        await findOnList(list, product.name);
        await list.grid.addToBag(product.name);
      }
      await expect(home.header.bagCount).toHaveText('2');
    });

    await test.step('CHK-050 apply SAVE10 and CHK-053 choose Mastercard •••• 4444', async () => {
      await checkout.goto();
      await checkout.waitForForm();
      await checkout.coupon.fill(COUPONS.save10);
      await checkout.chooseSavedCard(CARDS.mastercard.last4);
      await expect(checkout.totals.value(TOTALS_TEXT.coupon(COUPONS.save10))).toHaveText(minus(expected.couponDiscount));
      await expect(checkout.totals.value(TOTALS_TEXT.mastercard)).toHaveText(minus(expected.paymentDiscount));
      await expect(checkout.totals.value(TOTAL)).toHaveText(formatUsd(expected.total));
      await checkout.placeOrder();
    });

    await test.step('ORD-002 payment successful; order page equals the checkout preview', async () => {
      await expect(order.bannerFor('confirmed')).toBeVisible(settle);
      await expect(order.items).toContainText(ORDER_TEXT.itemLine(1, pulseController.name, pulseController.price));
      await expect(order.items).toContainText(ORDER_TEXT.itemLine(1, eyeCamera.name, eyeCamera.price));
      await expect(order.totals.value(TOTALS_TEXT.coupon(COUPONS.save10))).toHaveText(minus(expected.couponDiscount));
      await expect(order.totals.value(TOTALS_TEXT.mastercard)).toHaveText(minus(expected.paymentDiscount));
      await expect(order.totals.value(TOTAL)).toHaveText(formatUsd(expected.total));
    });

    await test.step('order is first in My orders', async () => {
      const orders = new OrdersPage(page);
      const orderId = order.idFromUrl();
      await orders.goto();
      expect((await orders.orderIds())[0]).toBe(orderId);
    });
  });

  test('E2E-03 Declined payment, then retry with another card', { tag: '@smoke' }, async ({ signedInPage: page, api, saveCards, anonApi }) => {
    const list = new ProductListPage(page);
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    await saveCards(CARDS.visa, CARDS.declined);
    await ensureStock(api, stillMug.id, 1);
    const stockBefore = await availableStock(anonApi, stillMug.id);

    await test.step('CART-001 add Still Ceramic Mug', async () => {
      await list.goto({ q: stillMug.name });
      await list.grid.addToBag(stillMug.name);
      await expect(list.header.bagCount).toHaveText('1');
    });

    await test.step('CHK-060 pay with Visa •••• 0002 and ORD-003 payment failed', async () => {
      await checkout.goto();
      await checkout.waitForForm();
      await checkout.chooseSavedCard(CARDS.declined.last4);
      await checkout.placeOrder();
      await expect(order.bannerFor('cancelled')).toBeVisible(settle);
      await expect.poll(() => availableStock(anonApi, stillMug.id)).toBe(stockBefore);
    });

    await test.step('ORD-008 put the products back in the bag', async () => {
      await order.restoreBagButton.click();
      await expect(page).toHaveURL(/#checkout$/);
      await checkout.waitForForm();
      await expect(checkout.summaryItems).toHaveCount(1);
      await expect(checkout.summaryItems).toContainText(CHECKOUT_TEXT.summaryLine(1, stillMug.price));
      expect(await (await api.cart.get()).json()).toEqual([{ productId: stillMug.id, quantity: 1 }]);
    });

    await test.step('CHK-060 pay with Visa •••• 4242 and ORD-002 payment successful', async () => {
      await checkout.chooseSavedCard(CARDS.visa.last4);
      await checkout.placeOrder();
      await expect(order.bannerFor('confirmed')).toBeVisible(settle);
    });

    await test.step('one cancelled and one confirmed order, one approved payment, stock −1', async () => {
      const orders = (await (await api.orders.list()).json()) as Order[];
      expect(orders.map((o) => o.status).sort()).toEqual(['cancelled', 'confirmed']);
      const payments = await Promise.all(orders.map(async (o) => ((await (await api.payments.get(o.id)).json()) as Payment).status));
      expect(payments.filter((s) => s === 'approved')).toHaveLength(1);
      expect(await availableStock(anonApi, stillMug.id)).toBe(stockBefore - 1);
    });
  });

  test('E2E-04 From wishlist to purchase', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    const wishlist = new WishlistPage(page);
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    for (const product of [brewKettle, pressGrinder]) await ensureStock(api, product.id, 1);

    await test.step('CATM-008 open Kitchen and WISH-001 save two products', async () => {
      await home.goto();
      await home.header.categories.openSubcategory(SUBCATEGORY.kitchen.category, SUBCATEGORY.kitchen.name);
      await expect(list.heading).toHaveText(SUBCATEGORY.kitchen.name);
      await list.waitForProducts();
      await list.grid.heart(brewKettle.name).click();
      await list.grid.heart(pressGrinder.name).click();
      await expect(home.header.wishlistCount).toHaveText('2');
    });

    await test.step('WISH-005 open the wishlist and WISH-008 add both to the bag', async () => {
      await home.header.wishlistLink.click();
      await expect(wishlist.grid.cards).toHaveCount(2);
      await wishlist.grid.addToBag(brewKettle.name);
      await expect(home.header.bagCount).toHaveText('1');
      await wishlist.grid.addToBag(pressGrinder.name);
      await expect(home.header.bagCount).toHaveText('2');
      expect(((await (await api.cart.get()).json()) as { productId: string }[]).map((i) => i.productId).sort()).toEqual([brewKettle.id, pressGrinder.id].sort());
    });

    await test.step('CHK-064 pay with Test wallet and ORD-002 payment successful', async () => {
      await checkout.goto();
      await checkout.waitForForm();
      await checkout.chooseWallet();
      await checkout.placeOrder();
      await expect(order.bannerFor('confirmed')).toBeVisible(settle);
    });

    await test.step('products stay on the wishlist after the purchase', async () => {
      await wishlist.goto();
      await expect(wishlist.grid.names).toHaveText([pressGrinder.name, brewKettle.name]);
      await expect(home.header.wishlistCount).toHaveText('2');
    });
  });

  test('E2E-05 Free shipping through the whole purchase', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    await saveCards(CARDS.visa);
    for (const product of [noteJournal, trailBottle]) await ensureStock(api, product.id, 1);
    const total = formatUsd(noteJournal.price + trailBottle.price); // $47.00, no shipping

    await test.step('NAV-010 open Free shipping and CART-001 add two free shipping products', async () => {
      await home.goto();
      await home.header.freeShippingLink.click();
      await list.waitForProducts();
      for (const product of [noteJournal, trailBottle]) {
        await list.goto({ freeShipping: QUERY.freeShipping.yes });
        await findOnList(list, product.name);
        await list.grid.addToBag(product.name);
      }
      await expect(home.header.bagCount).toHaveText('2');
    });

    await test.step('PRICE-040 bag shipping "On us"', async () => {
      await home.header.openBag();
      await expect(home.bag.totals.value(SHIPPING)).toHaveText(TOTALS_TEXT.freeShipping);
      await expect(home.bag.totals.value(TOTAL)).toHaveText(total);
      await home.bag.closeButton.click();
    });

    await test.step('CART-001 add Still Ceramic Mug, PRICE-041 shipping $7.00, then remove it', async () => {
      await list.goto({ q: stillMug.name });
      await list.grid.addToBag(stillMug.name);
      await expect(home.header.bagCount).toHaveText('3');
      await home.header.openBag();
      await expect(home.bag.totals.value(SHIPPING)).toHaveText(formatUsd(SHIPPING_FEE));
      await home.bag.decrease(stillMug.name);
      await expect(home.bag.totals.value(SHIPPING)).toHaveText(TOTALS_TEXT.freeShipping);
      await expect(home.bag.totals.value(TOTAL)).toHaveText(total);
      await home.bag.continueToCheckout();
    });

    await test.step('CHK-060 pay with Visa •••• 4242 and ORD-002 payment successful', async () => {
      await checkout.waitForForm();
      await expect(checkout.totals.value(SHIPPING)).toHaveText(TOTALS_TEXT.freeShipping);
      await expect(checkout.totals.value(TOTAL)).toHaveText(total);
      await checkout.placeOrder();
      await expect(order.bannerFor('confirmed')).toBeVisible(settle);
      await expect(order.totals.value(SHIPPING)).toHaveText(TOTALS_TEXT.freeShipping);
      await expect(order.totals.value(TOTAL)).toHaveText(total);
    });
  });

  test('E2E-06 Two customers, one last unit', { tag: '@regression' }, async ({ signedInPage: pageA, api, browser, request, createUser, anonApi }) => {
    const userB = await createUser();
    const apiB = createApiClients(request, userB.token);
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signInWithToken(pageB, userB.token);
    await drainStockTo(api, createApiClients(request, (await createUser()).token), VASE.id, 1);
    const customers = [
      { name: 'A', page: pageA, api },
      { name: 'B', page: pageB, api: apiB },
    ];

    await test.step('both customers have the last unit in the bag and open checkout', async () => {
      for (const c of customers) {
        await setCart(c.api, [{ productId: VASE.id, quantity: 1 }]);
        const checkout = new CheckoutPage(c.page);
        await checkout.goto();
        await checkout.waitForForm();
        await checkout.chooseWallet();
      }
    });

    await test.step('CHK-060 A and B place their orders at the same time', async () => {
      await Promise.all(customers.map((c) => new CheckoutPage(c.page).placeOrder()));
      for (const c of customers) await expect(c.page, c.name).toHaveURL(/#order\//);
    });

    await test.step('ORD-002 / ORD-004 one payment successful, one order not completed', async () => {
      const statuses: string[] = [];
      for (const c of customers) statuses.push(await new OrderPage(c.page).settledStatus(['confirmed', 'rejected']));
      expect([...statuses].sort()).toEqual(['confirmed', 'rejected']);

      const loser = customers[statuses.indexOf('rejected')]!;
      const loserOrder = ((await (await loser.api.orders.list()).json()) as Order[])[0]!;
      expect(loserOrder.status).toBe('rejected');
      expect(((await (await loser.api.payments.get(loserOrder.id)).json()) as Payment).status, 'not charged').toBe('pending');
      expect(await availableStock(anonApi, VASE.id)).toBe(0);
    });

    await test.step('the product shows "Sold out" afterwards', async () => {
      const list = new ProductListPage(pageA);
      await list.goto({ q: VASE.name });
      await expect(list.grid.stock(VASE.name)).toHaveText(CART_TEXT.soldOut);
    });
    await contextB.close();
  });

  test('E2E-08 From a category to an Amex purchase', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
    const home = new HomePage(page);
    const list = new ProductListPage(page);
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    await ensureStock(api, pedalCage.id, 1);

    await test.step('CATM-004 open Sports & Outdoors, CATM-006 choose Cycling, LIST-002 sort by price', async () => {
      await home.goto();
      await home.header.categories.openCategory(SUBCATEGORY.cycling.category);
      await expect(list.heading).toHaveText(SUBCATEGORY.cycling.category);
      await list.waitForProducts();
      await list.subcategoryChip(SUBCATEGORY.cycling.name).click();
      await expect(list.heading).toHaveText(SUBCATEGORY.cycling.name);
      await list.waitForProducts();
      await list.sortBy(LIST_TEXT.sort.priceLowHigh);
    });

    await test.step('CART-001 add the first product', async () => {
      await expect(list.grid.names.first()).toHaveText(pedalCage.name);
      await list.grid.addToBagButton(pedalCage.name).click();
      await expect(home.header.bagCount).toHaveText('1');
    });

    await test.step('CHK-061 pay with a new Amex 3782 822463 10005 and ORD-002 payment successful', async () => {
      await checkout.goto();
      await checkout.waitForForm();
      await checkout.fillCard(cardForm(CARDS.amex, { save: false }));
      await checkout.placeOrder();
      await expect(order.bannerFor('confirmed')).toBeVisible(settle);
      await expect(order.items).toHaveText(ORDER_TEXT.itemLine(1, pedalCage.name, pedalCage.price));
      await expect(order.fact(ORDER_TEXT.facts.payment)).toHaveText(PAYMENT_TEXT.card(CARDS.amex.brand, CARDS.amex.last4));
    });
  });
});
