import { test, expect } from '@core/fixtures';
import { CheckoutPage, HomePage, OrderPage } from '@pages/index';
import { CARDS, PRODUCTS, TOTALS_TEXT } from '@data/index';
import { ARC_ALL_DISCOUNTS, BAG_SHIPPING, NOTEBOOK_ROUNDING } from '@data/cases/pricing';
import { formatUsd } from '@core/pricing';
import { ensureStock, setCart } from '@core/flows/order-flow';
import { config } from '@core/config';

const { arcHeadphones } = PRODUCTS;
const { shipping, total, mastercard, minus } = TOTALS_TEXT;
const coupon = TOTALS_TEXT.coupon(ARC_ALL_DISCOUNTS.coupon);

test.describe('Pricing', { tag: '@pricing' }, () => {
  test('PRICE-040 Bag shows shipping by the rules', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
    const home = new HomePage(page);

    await test.step('2 × Orbit Desk Lamp ships free', async () => {
      await setCart(api, [...BAG_SHIPPING.freeByAmount.items]);
      await home.goto();
      await home.header.openBag();
      await expect(home.bag.totals.value(shipping)).toHaveText(TOTALS_TEXT.freeShipping);
      await expect(home.bag.totals.value(total)).toHaveText(formatUsd(BAG_SHIPPING.freeByAmount.total));
    });

    await test.step('1 × Arc Wireless Headphones pays $7.00', async () => {
      await setCart(api, [...BAG_SHIPPING.paid.items]);
      // The bag dialog is still open; a reload picks up the new server-side bag.
      await page.reload();
      await home.waitUntilReady();
      await home.header.openBag();
      await expect(home.bag.totals.value(shipping)).toHaveText(formatUsd(BAG_SHIPPING.paid.shipping));
      await expect(home.bag.totals.value(total)).toHaveText(formatUsd(BAG_SHIPPING.paid.total));
    });
  });

  test('PRICE-041 Removing the last product without free shipping makes shipping free', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
    const home = new HomePage(page);
    const { kept, removed } = BAG_SHIPPING.allFreeShipping;
    await setCart(api, [{ productId: kept.id, quantity: 1 }, { productId: removed.id, quantity: 1 }]);
    await home.goto();
    await home.header.openBag();
    await expect(home.bag.totals.value(shipping)).toHaveText(formatUsd(BAG_SHIPPING.paid.shipping));

    await home.bag.decrease(removed.name);

    await expect(home.bag.totals.value(shipping)).toHaveText(TOTALS_TEXT.freeShipping);
    await expect(home.bag.totals.value(total)).toHaveText(formatUsd(BAG_SHIPPING.allFreeShipping.total));
  });

  test('PRICE-042 Checkout total equals the order total', { tag: '@smoke' }, async ({ signedInPage: page, api, saveCards }) => {
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    await saveCards(CARDS.visa, CARDS.mastercard);
    await ensureStock(api, arcHeadphones.id, 1);
    await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }]);
    await checkout.goto();

    await test.step('checkout shows the discounted total', async () => {
      await checkout.coupon.fill(ARC_ALL_DISCOUNTS.coupon);
      await checkout.chooseSavedCard(CARDS.mastercard.last4);
      await expect(checkout.totals.value(coupon)).toHaveText(minus(ARC_ALL_DISCOUNTS.couponDiscount));
      await expect(checkout.totals.value(mastercard)).toHaveText(minus(ARC_ALL_DISCOUNTS.paymentDiscount));
      await expect(checkout.totals.value(total)).toHaveText(formatUsd(ARC_ALL_DISCOUNTS.total));
    });

    await test.step('the order shows the same lines and total', async () => {
      await checkout.placeOrder();
      await expect(order.bannerFor('confirmed')).toBeVisible({ timeout: config.orderTimeoutMs });
      await expect(order.totals.value(coupon)).toHaveText(minus(ARC_ALL_DISCOUNTS.couponDiscount));
      await expect(order.totals.value(mastercard)).toHaveText(minus(ARC_ALL_DISCOUNTS.paymentDiscount));
      await expect(order.totals.value(total)).toHaveText(formatUsd(ARC_ALL_DISCOUNTS.total));
    });
  });

  test('PRICE-043 Switching from Mastercard to Visa removes the discount', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    const checkout = new CheckoutPage(page);
    await saveCards(CARDS.visa, CARDS.mastercard);
    await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }]);
    await checkout.goto();
    await checkout.chooseSavedCard(CARDS.mastercard.last4);
    await expect(checkout.totals.row(mastercard)).toBeVisible();

    await checkout.chooseSavedCard(CARDS.visa.last4);

    await expect(checkout.totals.row(mastercard)).toHaveCount(0);
    await expect(checkout.totals.value(total)).toHaveText(formatUsd(BAG_SHIPPING.paid.total));
  });

  test('PRICE-044 Checkout shows the same rounded amounts as the server', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    const checkout = new CheckoutPage(page);
    const order = new OrderPage(page);
    await saveCards(CARDS.mastercard);
    const { product, couponDiscount, paymentDiscount } = NOTEBOOK_ROUNDING;
    await ensureStock(api, product.id, 1);
    await setCart(api, [{ productId: product.id, quantity: 1 }]);
    await checkout.goto();

    await checkout.coupon.fill(NOTEBOOK_ROUNDING.coupon);
    await expect(checkout.totals.value(coupon)).toHaveText(minus(couponDiscount));
    await expect(checkout.totals.value(mastercard)).toHaveText(minus(paymentDiscount));
    await expect(checkout.totals.value(total)).toHaveText(formatUsd(NOTEBOOK_ROUNDING.total));

    // A preview that differed from the server would be rejected with "Price changed".
    await checkout.placeOrder();
    await expect(order.bannerFor('confirmed')).toBeVisible({ timeout: config.orderTimeoutMs });
    await expect(order.totals.value(total)).toHaveText(formatUsd(NOTEBOOK_ROUNDING.total));
  });
});
