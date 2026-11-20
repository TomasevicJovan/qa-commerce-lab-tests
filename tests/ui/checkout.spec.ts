import { test, expect } from '@core/fixtures';
import { config } from '@core/config';
import { availableStock, ensureStock } from '@core/flows/order-flow';
import { calculateTotals, formatUsd } from '@core/pricing';
import { KNOWN_ISSUES, issue } from '@core/known-issues';
import type { LabEvent, Order, Payment } from '@api/types';
import { OrdersPage, ShopPage } from '@pages/index';
import { STOCK_OWNERS } from '@core/test-products';

test.describe('Bag and checkout', () => {
  test('customer checks out in the browser and the order is confirmed end to end', { tag: ['@smoke'] }, async ({ signedInPage: page, api, lab }) => {
    const shop = new ShopPage(page);
    const orders = new OrdersPage(page);
    const product = STOCK_OWNERS.uiCheckout;
    const expected = calculateTotals([{ unitPrice: product.price, quantity: 1 }]);

    await ensureStock(api, product.id, 1);
    const stockBefore = await availableStock(api, product.id);
    await api.cart.clear();
    await shop.goto();

    await test.step('add the product and open checkout', async () => {
      await shop.addToBag(product.name);
      await expect(shop.header.bagCount).toHaveText('1');
      await shop.header.openBag();
      await expect(shop.bag.totals.value('Total')).toHaveText(formatUsd(expected.total));
      await shop.bag.continueToCheckout();
      await expect(shop.checkout.title).toHaveText('A few final details');
    });

    const order = await test.step('place the order and capture its id from the API response', async () => {
      const placed = page.waitForResponse((r) => r.url().endsWith('/api/orders') && r.request().method() === 'POST');
      await shop.checkout.choosePayment('test-wallet');
      await shop.checkout.placeOrder();
      const response = await placed;
      // 202 means "accepted for processing", not "paid".
      expect(response.status()).toBe(202);
      return (await response.json()) as Order;
    });

    await test.step('My orders shows the order reaching confirmed', async () => {
      await expect(page).toHaveURL(/#orders$/);
      await expect(shop.header.bagCount).toHaveText('0');
      await expect(orders.statusOf(order.id)).toHaveText('confirmed', { timeout: config.orderTimeoutMs });
    });

    await test.step('backend agrees: totals, payment, stock and event chain', async () => {
      const saved = (await (await api.orders.get(order.id)).json()) as Order;
      expect(saved).toMatchObject({ total: expected.total, shipping: expected.shipping, paymentMethod: 'test-wallet' });
      expect(saved.history.map((h) => h.status)).toEqual(['pending', 'payment_pending', 'confirmed']);

      const payment = (await (await api.payments.get(order.id)).json()) as Payment;
      expect(payment).toMatchObject({ status: 'approved', amount: expected.total });

      expect(await availableStock(api, product.id)).toBe(stockBefore - 1);

      // OrderConfirmed is published shortly after the status flips, so poll the audit stream.
      // The audit sequence is not a Kafka offset and can differ from causal order, so compare as a set.
      await expect
        .poll(async () => (await lab.eventsFor(order.id)).map((e: LabEvent) => e.type).sort())
        .toEqual(['InventoryReserved', 'OrderConfirmed', 'OrderPlaced', 'PaymentApproved']);
    });
  });

  test('free shipping threshold is applied after the SAVE10 discount', { tag: ['@regression'] }, async ({ signedInPage: page, api }) => {
    const shop = new ShopPage(page);
    // 2 x Orbit Desk Lamp = $158.00. With SAVE10 the discounted subtotal drops below $150, so shipping returns.
    const lines = [{ unitPrice: 7_900, quantity: 2 }];
    const withoutCoupon = calculateTotals(lines);
    const withCoupon = calculateTotals(lines, 'SAVE10');

    await api.cart.replace([{ productId: 'p2', quantity: 2 }]);
    await shop.goto();
    await shop.header.openBag();

    await test.step('bag: $158.00 qualifies for free shipping', async () => {
      await expect(shop.bag.totals.value('Subtotal')).toHaveText(formatUsd(withoutCoupon.subtotal));
      await expect(shop.bag.totals.value('Shipping')).toHaveText('On us');
      await expect(shop.bag.totals.value('Total')).toHaveText(formatUsd(withoutCoupon.total));
    });

    await test.step('checkout with save10 (lowercase is normalised): shipping is charged again', async () => {
      await shop.bag.continueToCheckout();
      await shop.checkout.applyCoupon(' save10 ');
      await expect(shop.checkout.totals.value('Discount')).toHaveText(`−${formatUsd(withCoupon.discount)}`);
      await expect(shop.checkout.totals.value('Shipping')).toHaveText(formatUsd(withCoupon.shipping));
      await expect(shop.checkout.totals.value('Total')).toHaveText(formatUsd(withCoupon.total));
    });
  });

  test('quantity controls update the bag and removing the last unit empties it', { tag: ['@regression'] }, async ({ signedInPage: page, api }) => {
    const shop = new ShopPage(page);
    const name = 'Pebble Desk Clock';

    await api.cart.replace([{ productId: 'p7', quantity: 1 }]);
    await shop.goto();
    await shop.header.openBag();

    await test.step('increase to two', () => shop.bag.increase(name));
    await expect(shop.bag.quantityOf(name)).toHaveText('2');
    await expect(shop.header.bagCount).toHaveText('2');
    await expect(shop.bag.totals.value('Subtotal')).toHaveText(formatUsd(2 * 4_500));

    await test.step('decrease to zero', async () => {
      await shop.bag.decrease(name);
      await expect(shop.bag.quantityOf(name)).toHaveText('1');
      await shop.bag.decrease(name);
    });

    await expect(shop.bag.emptyState).toBeVisible();
    await expect(shop.header.bagCount).toHaveText('0');
    // Zero quantity removes the line on the client; the server stores an empty cart, not quantity 0.
    expect(await (await api.cart.get()).json()).toEqual([]);
  });

  test('expired coupon is rejected without creating an order or losing the bag', { tag: ['@regression'] }, async ({ signedInPage: page, api }) => {
    const shop = new ShopPage(page);
    const cart = [{ productId: 'p8', quantity: 1 }];
    const ordersBefore = ((await (await api.orders.list()).json()) as Order[]).length;

    await api.cart.replace(cart);
    await shop.goto();
    await shop.header.openBag();
    await shop.bag.continueToCheckout();

    await test.step('submit with EXPIRED', async () => {
      await shop.checkout.applyCoupon('EXPIRED');
      await shop.checkout.placeOrder();
    });

    await expect(shop.checkout.error).toHaveText('Coupon has expired');
    await expect(shop.checkout.root).toBeVisible();
    expect(await (await api.cart.get()).json()).toEqual(cart);
    expect(((await (await api.orders.list()).json()) as Order[]).length).toBe(ordersBefore);
  });

  test(
    'country dropdown offers every supported shipping country',
    { tag: ['@regression'], annotation: issue(KNOWN_ISSUES.checkoutCountryMissingGermany) },
    async ({ signedInPage: page, api }) => {
      // Known defect: a malformed <option> tag swallows "Germany". Remove test.fail() once the lab is fixed.
      test.fail();
      const shop = new ShopPage(page);

      await api.cart.replace([{ productId: 'p8', quantity: 1 }]);
      await shop.goto();
      await shop.header.openBag();
      await shop.bag.continueToCheckout();

      expect(await shop.checkout.countryOptions()).toEqual(['Bosnia and Herzegovina', 'Germany', 'United States']);
    },
  );
});
