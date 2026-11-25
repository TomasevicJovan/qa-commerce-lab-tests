import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { CheckoutPage, OrderPage } from '@pages/index';
import { APPROVED_CARDS, AUTH_TEXT, CARD_ERRORS, CARDS, CHECKOUT_TEXT, COUPONS, DEMO_CARDS, ORDER_TEXT, PAYMENT_TEXT, PRODUCTS, TOTALS_TEXT, API_ERRORS } from '@data/index';
import { ADDRESS_FIELDS, ADDRESS_MAX, EXPIRY, INVALID_HOLDERS } from '@data/cases/checkout';
import { ensureStock, setCart } from '@core/flows/order-flow';
import { cardForm } from '@core/factories/checkout-factory';
import { random } from '@core/random-data';
import { calculateTotals, formatUsd } from '@core/pricing';
import { config } from '@core/config';
import { KNOWN_ISSUES, issue } from '@core/known-issues';
import type { ApiClients } from '@api/index';
import type { SavedCard } from '@api/types';

const { arcHeadphones, orbitLamp, stillMug, markHighlighter } = PRODUCTS;
const { notifications } = CHECKOUT_TEXT;

/**
 * Puts one product in the bag and opens checkout. After an order the page keeps its own
 * (empty) copy of the bag, so a second visit in the same test reloads the page.
 */
async function openCheckout(page: Page, api: ApiClients, productId: string = arcHeadphones.id, { reload = false } = {}): Promise<CheckoutPage> {
  const checkout = new CheckoutPage(page);
  await setCart(api, [{ productId, quantity: 1 }]);
  await checkout.goto();
  if (reload) await page.reload();
  await checkout.waitForForm();
  return checkout;
}

/** Records order requests so tests can prove that client-side validation sent nothing. */
function watchOrderRequests(page: Page): string[] {
  const requests: string[] = [];
  page.on('request', (r) => r.url().endsWith('/api/orders') && r.method() === 'POST' && requests.push(r.url()));
  return requests;
}

test.describe('Checkout and card payments', { tag: '@checkout' }, () => {
  test.describe('access and content', () => {
    test('CHK-001 Signed out checkout asks to sign in', { tag: '@regression' }, async ({ page }) => {
      const checkout = new CheckoutPage(page);
      await checkout.goto();

      await expect(checkout.emptyMessageHeading).toHaveText(AUTH_TEXT.signedOutPages.checkout);
      await expect(checkout.signedOutSignIn).toBeVisible();
      await expect(checkout.signedOutCreateAccount).toBeVisible();
    });

    test('CHK-002 Empty bag shows the empty message', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const checkout = new CheckoutPage(page);
      await checkout.goto();

      await expect(checkout.emptyMessageHeading).toHaveText(CHECKOUT_TEXT.emptyBag);
      await expect(checkout.emptyMessageLink).toHaveText(CHECKOUT_TEXT.continueShopping);
    });

    test('CHK-003 Page shows all sections and the summary', { tag: '@smoke' }, async ({ signedInPage: page, api }) => {
      const checkout = new CheckoutPage(page);
      await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }, { productId: orbitLamp.id, quantity: 2 }]);

      await checkout.goto();

      await expect(checkout.heading).toHaveText(CHECKOUT_TEXT.heading);
      await expect(checkout.sectionHeadings).toHaveText([...CHECKOUT_TEXT.sections]);
      await expect(checkout.summaryItems).toHaveCount(2);
      await expect(checkout.summaryItems.filter({ hasText: arcHeadphones.name })).toContainText(CHECKOUT_TEXT.summaryLine(1, arcHeadphones.price));
      await expect(checkout.summaryItems.filter({ hasText: orbitLamp.name })).toContainText(CHECKOUT_TEXT.summaryLine(2, orbitLamp.price));
      await expect(checkout.summaryItems.filter({ hasText: orbitLamp.name })).toContainText(formatUsd(orbitLamp.price * 2));
      await expect(checkout.placeOrderButton).toHaveText(CHECKOUT_TEXT.placeOrder);
    });
  });

  test.describe('address', () => {
    for (const { label, field, message } of ADDRESS_FIELDS) {
      test(`CHK-010 Each empty address field shows its message: ${label}`, { tag: '@regression' }, async ({ signedInPage: page, api }) => {
        const checkout = await openCheckout(page, api);
        const requests = watchOrderRequests(page);

        await checkout.fillAddress({ [field]: '' });
        await checkout.chooseWallet();
        await checkout.placeOrder();

        await expect(checkout.fieldError(field)).toHaveText(message);
        expect(requests, 'no order request').toHaveLength(0);
      });
    }

    test(`CHK-011 Address fields accept at most ${ADDRESS_MAX} characters`, { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);

      for (const input of [checkout.recipient, checkout.street, checkout.city, checkout.postalCode]) {
        await input.fill('');
        await input.focus();
        await page.keyboard.insertText(random.text(ADDRESS_MAX + 1));
        expect((await input.inputValue()).length).toBe(ADDRESS_MAX);
      }
    });

    test('CHK-012 Country list offers all supported countries', { tag: '@regression', annotation: issue(KNOWN_ISSUES.checkoutCountryMissingGermany) }, async ({ signedInPage: page, api }) => {
      test.fail();
      const checkout = await openCheckout(page, api);

      await expect(checkout.countryOptions).toHaveText([...CHECKOUT_TEXT.countries]);
    });
  });

  test.describe('payment choice', () => {
    test('CHK-020 First usable saved card is selected by default', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      await saveCards(CARDS.visa, CARDS.mastercard);
      const checkout = await openCheckout(page, api);

      await expect(checkout.savedCardRadio(CARDS.visa.last4)).toBeChecked();
      await expect(checkout.savedCardRadio(CARDS.mastercard.last4)).not.toBeChecked();
    });

    test('CHK-021 Expired saved card cannot be selected', { tag: '@regression' }, async ({ demoPage: page, demoApi }) => {
      const checkout = await openCheckout(page, demoApi, stillMug.id);
      const expired = DEMO_CARDS.expired;

      await expect(checkout.savedCard(expired.last4)).toContainText(CHECKOUT_TEXT.savedCardExpired);
      await expect(checkout.savedCardRadio(expired.last4)).toBeDisabled();
    });

    test('CHK-022 "Add a new card" shows the card form', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      await saveCards(CARDS.visa);
      const checkout = await openCheckout(page, api);
      await expect(checkout.newCardForm).toBeHidden();

      await checkout.chooseNewCard();
      await expect(checkout.newCardForm).toBeVisible();
      for (const field of [checkout.holder, checkout.cardNumber, checkout.expiry, checkout.cvc]) await expect(field).toBeVisible();
      await expect(checkout.saveCard).toBeChecked();

      await checkout.chooseSavedCard(CARDS.visa.last4);
      await expect(checkout.newCardForm).toBeHidden();
    });

    test('CHK-023 Saved Mastercard shows "−10%"', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      await saveCards(CARDS.visa, CARDS.mastercard);
      const checkout = await openCheckout(page, api);

      await expect(checkout.perk(CARDS.mastercard.last4)).toHaveText(CHECKOUT_TEXT.mastercardPerk);
      await expect(checkout.perk(CARDS.visa.last4)).toHaveCount(0);
    });
  });

  test.describe('new card validation', () => {
    // A customer without saved cards gets "Add a new card" selected by default.
    for (const holder of INVALID_HOLDERS) {
      test(`CHK-030 Invalid cardholder name shows an error: "${holder}"`, { tag: '@regression' }, async ({ signedInPage: page, api }) => {
        const checkout = await openCheckout(page, api);
        await checkout.fillCard(cardForm(CARDS.visa, { holder }));
        await checkout.placeOrder();
        await expect(checkout.fieldError('holder')).toHaveText(CARD_ERRORS.holder);
      });
    }

    test('CHK-031 Card number failing the check digit shows an error', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.fillCard(cardForm(CARDS.visa, { number: CARDS.invalidCheckDigit }));
      await checkout.placeOrder();
      await expect(checkout.fieldError('number')).toHaveText(CARD_ERRORS.number);
    });

    test('CHK-032 Unsupported card brand shows an error', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.fillCard(cardForm(CARDS.visa, { number: CARDS.discover }));
      await checkout.placeOrder();
      await expect(checkout.fieldError('number')).toHaveText(CARD_ERRORS.brand);
    });

    test('CHK-033 Card number is formatted and the brand is shown while typing', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);

      for (const card of [CARDS.visa, CARDS.mastercard, CARDS.amex]) {
        await checkout.cardNumber.fill('');
        await checkout.cardNumber.pressSequentially(card.digits);
        // The test card's printed number is the expected grouping: 4-4-4-4, or 4-6-5 for American Express.
        await expect(checkout.cardNumber).toHaveValue(card.number);
        await expect(checkout.brandHint).toHaveText(CHECKOUT_TEXT.brandHints[card.brand]);
      }
    });

    test('CHK-034 Expiry in the wrong format shows an error; slash is added', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.expiry.pressSequentially(EXPIRY.typedDigits);
      await expect(checkout.expiry).toHaveValue(EXPIRY.typedShown);

      await checkout.fillCard(cardForm(CARDS.visa, { expiry: EXPIRY.incomplete }));
      await checkout.placeOrder();
      await expect(checkout.fieldError('expiry')).toHaveText(CARD_ERRORS.expiryFormat);
    });

    test('CHK-035 Expiry month 13 shows an error', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.fillCard(cardForm(CARDS.visa, { expiry: EXPIRY.month13 }));
      await checkout.placeOrder();
      await expect(checkout.fieldError('expiry')).toHaveText(CARD_ERRORS.expiryMonth);
    });

    test('CHK-036 Last month is expired; current month is accepted', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      await ensureStock(api, markHighlighter.id, 1);
      const checkout = await openCheckout(page, api, markHighlighter.id);

      await checkout.fillCard(cardForm(CARDS.visa, { expiry: EXPIRY.lastMonth, save: false }));
      await checkout.placeOrder();
      await expect(checkout.fieldError('expiry')).toHaveText(CARD_ERRORS.expired);

      await checkout.fillCard({ expiry: EXPIRY.thisMonth });
      await checkout.placeOrder();
      await expect(page).toHaveURL(/#order\//);
    });

    test('CHK-037 Expiry more than 20 years ahead shows an error', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.fillCard(cardForm(CARDS.visa, { expiry: EXPIRY.tooFar }));
      await checkout.placeOrder();
      await expect(checkout.fieldError('expiry')).toHaveText(CARD_ERRORS.expiryTooFar);
    });

    test('CHK-038 Security code length depends on the brand', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.fillCard(cardForm(CARDS.visa, { cvc: CARDS.visa.cvc.slice(1) }));
      await checkout.placeOrder();
      await expect(checkout.fieldError('cvc')).toHaveText(CARD_ERRORS.cvc3);

      await checkout.fillCard({ number: CARDS.amex.number, cvc: CARDS.visa.cvc });
      await checkout.placeOrder();
      await expect(checkout.fieldError('cvc')).toHaveText(CARD_ERRORS.cvc4);
    });

    test('CHK-039 Empty card form shows all 4 messages', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.placeOrder();

      await expect(checkout.fieldError('holder')).toHaveText(CARD_ERRORS.holder);
      await expect(checkout.fieldError('number')).toHaveText(CARD_ERRORS.number);
      await expect(checkout.fieldError('expiry')).toHaveText(CARD_ERRORS.expiryFormat);
      await expect(checkout.fieldError('cvc')).toHaveText(CARD_ERRORS.cvc3);
      await checkout.notifications.expectShown('error', { title: notifications.invalidForm.title, message: notifications.invalidForm.message(4) });
    });

    test('CHK-040 Fixing a field removes its error', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.fillCard(cardForm(CARDS.visa, { number: CARDS.invalidCheckDigit }));
      await checkout.placeOrder();
      await expect(checkout.fieldError('number')).toHaveText(CARD_ERRORS.number);

      await checkout.cardNumber.fill(CARDS.visa.number);
      await checkout.cardNumber.blur();

      await expect(checkout.fieldError('number')).toBeEmpty();
      await expect(checkout.cardNumber).toHaveAttribute('aria-invalid', 'false');
    });

    test('CHK-041 Invalid form does not send the order', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      const requests = watchOrderRequests(page);

      await checkout.fillCard(cardForm(CARDS.visa, { number: CARDS.invalidCheckDigit }));
      await checkout.placeOrder();

      await expect(checkout.fieldError('number')).not.toBeEmpty();
      expect(requests).toHaveLength(0);
      await expect(page).toHaveURL(/#checkout$/);
      expect(await (await api.cart.get()).json()).toEqual([{ productId: arcHeadphones.id, quantity: 1 }]);
    });
  });

  test.describe('discount code', () => {
    const arcLine = [{ unitPrice: arcHeadphones.price, quantity: 1 }];

    test('CHK-050 SAVE10 is applied in any case and with spaces', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.coupon.fill(` ${COUPONS.save10.toLowerCase()} `);

      await expect(checkout.couponStatus).toHaveText(CHECKOUT_TEXT.coupon.applied(COUPONS.save10));
      await expect(checkout.totals.value(TOTALS_TEXT.coupon(COUPONS.save10))).toHaveText(
        TOTALS_TEXT.minus(calculateTotals(arcLine, { coupon: COUPONS.save10 }).couponDiscount),
      );
    });

    test('CHK-051 EXPIRED is rejected', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.coupon.fill(COUPONS.expired);
      await expect(checkout.couponStatus).toHaveText(CHECKOUT_TEXT.coupon.expired);

      await checkout.chooseWallet();
      await checkout.placeOrder();

      await checkout.notifications.expectShown('error', { title: notifications.rejected.title, message: API_ERRORS.checkout.couponExpired });
      await expect(page).toHaveURL(/#checkout$/);
    });

    test('CHK-052 Unknown code is rejected', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.coupon.fill(COUPONS.unknown);
      await expect(checkout.couponStatus).toHaveText(CHECKOUT_TEXT.coupon.unknown);

      await checkout.chooseWallet();
      await checkout.placeOrder();

      await checkout.notifications.expectShown('error', { title: notifications.rejected.title, message: API_ERRORS.checkout.couponUnknown });
    });

    test('CHK-053 Choosing a Mastercard adds the Mastercard line', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      await saveCards(CARDS.visa, CARDS.mastercard);
      const checkout = await openCheckout(page, api);
      const expected = calculateTotals(arcLine, { cardBrand: 'mastercard' });

      await checkout.chooseSavedCard(CARDS.mastercard.last4);

      await expect(checkout.totals.value(TOTALS_TEXT.mastercard)).toHaveText(TOTALS_TEXT.minus(expected.paymentDiscount));
      await expect(checkout.totals.value(TOTALS_TEXT.total)).toHaveText(formatUsd(expected.total));
    });
  });

  test.describe('placing the order', () => {
    test('CHK-060 Pay with an approved saved card', { tag: '@smoke' }, async ({ signedInPage: page, api, saveCards }) => {
      await saveCards(CARDS.visa);
      await ensureStock(api, stillMug.id, 1);
      const checkout = await openCheckout(page, api, stillMug.id);
      const order = new OrderPage(page);
      await expect(checkout.savedCardRadio(CARDS.visa.last4)).toBeChecked();

      await checkout.placeOrder();

      await expect(page).toHaveURL(/#order\/[0-9a-f-]{36}$/);
      const orderId = order.idFromUrl();
      await checkout.notifications.expectShown('success', { title: notifications.placed.title, message: notifications.placed.message(orderId) });
      await expect(checkout.header.bagCount).toHaveText('0');
      await expect(order.eyebrow).toHaveText(ORDER_TEXT.eyebrow(orderId));
    });

    for (const card of APPROVED_CARDS) {
      test(`CHK-061 Pay with each approved test card as a new card: ${card.brandName} ${card.number}`, { tag: '@regression' }, async ({ signedInPage: page, api }) => {
        await ensureStock(api, markHighlighter.id, 1);
        const checkout = await openCheckout(page, api, markHighlighter.id);
        const order = new OrderPage(page);

        await checkout.fillCard(cardForm(card, { save: false }));
        await checkout.placeOrder();

        await expect(order.bannerFor('confirmed')).toBeVisible({ timeout: config.orderTimeoutMs });
        await expect(order.fact(ORDER_TEXT.facts.payment)).toHaveText(PAYMENT_TEXT.card(card.brand, card.last4));
      });
    }

    test('CHK-062 Pay with a declined card', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      await ensureStock(api, markHighlighter.id, 1);
      const checkout = await openCheckout(page, api, markHighlighter.id);

      await checkout.fillCard(cardForm(CARDS.declined, { save: false }));
      await checkout.placeOrder();

      await checkout.notifications.expectShown('success', { title: notifications.placed.title });
      await expect(page).toHaveURL(/#order\//);
    });

    test('CHK-063 "Save this card" decides whether the card is saved', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const [saved, notSaved] = [CARDS.mastercard2, CARDS.visa2];
      await ensureStock(api, markHighlighter.id, 2);

      for (const { card, save } of [{ card: saved, save: true }, { card: notSaved, save: false }]) {
        const checkout = await openCheckout(page, api, markHighlighter.id, { reload: true });
        if (await checkout.newCardOption.isVisible()) await checkout.chooseNewCard();
        await checkout.fillCard(cardForm(card, { save }));
        await checkout.placeOrder();
        await expect(page).toHaveURL(/#order\//);
      }

      const checkout = await openCheckout(page, api, markHighlighter.id, { reload: true });
      await expect(checkout.savedCard(saved.last4)).toBeVisible();
      await expect(checkout.savedCard(notSaved.last4)).toHaveCount(0);
      const cards = (await (await api.cards.list()).json()) as SavedCard[];
      expect(cards.map((c) => c.last4)).toEqual([saved.last4]);
    });

    test('CHK-064 Pay with Test wallet', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      await ensureStock(api, markHighlighter.id, 1);
      const checkout = await openCheckout(page, api, markHighlighter.id);
      const order = new OrderPage(page);

      await checkout.chooseWallet();
      await checkout.placeOrder();

      await expect(order.bannerFor('confirmed')).toBeVisible({ timeout: config.orderTimeoutMs });
      await expect(order.fact(ORDER_TEXT.facts.payment)).toHaveText(PAYMENT_TEXT.wallet);
    });
  });
});
