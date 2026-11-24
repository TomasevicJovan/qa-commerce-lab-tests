import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { CheckoutPage, OrderPage } from '@pages/index';
import { APPROVED_CARDS, CARDS, DEMO_CARDS, PRODUCTS } from '@core/test-data';
import { ensureStock, setCart } from '@core/flows/order-flow';
import { futureExpiry } from '@core/factories/checkout-factory';
import { formatUsd } from '@core/pricing';
import { config } from '@core/config';
import { KNOWN_ISSUES, issue } from '@core/known-issues';
import type { ApiClients } from '@api/index';
import type { SavedCard } from '@api/types';

const { arcHeadphones, orbitLamp, stillMug, markHighlighter } = PRODUCTS;

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

const monthYear = (offsetMonths: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear() % 100).padStart(2, '0')}`;
};

const validCard = (card = CARDS.visa) => ({ holder: 'Alex Tester', number: card.number, expiry: futureExpiry(), cvc: card.cvc });

test.describe('Checkout and card payments', { tag: '@checkout' }, () => {
  test.describe('access and content', () => {
    test('CHK-001 Signed out checkout asks to sign in', { tag: '@regression' }, async ({ page }) => {
      const checkout = new CheckoutPage(page);
      await checkout.goto();

      await expect(checkout.main.getByRole('heading', { name: 'Sign in to check out' })).toBeVisible();
      await expect(checkout.main.getByRole('button', { name: 'Sign in' })).toBeVisible();
      await expect(checkout.main.getByRole('button', { name: 'Create account' })).toBeVisible();
    });

    test('CHK-002 Empty bag shows the empty message', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const checkout = new CheckoutPage(page);
      await checkout.goto();

      await expect(checkout.emptyBag).toBeVisible();
      await expect(checkout.main.getByRole('link', { name: 'Continue shopping →' })).toBeVisible();
    });

    test('CHK-003 Page shows all sections and the summary', { tag: '@smoke' }, async ({ signedInPage: page, api }) => {
      const checkout = new CheckoutPage(page);
      await setCart(api, [{ productId: arcHeadphones.id, quantity: 1 }, { productId: orbitLamp.id, quantity: 2 }]);

      await checkout.goto();

      await expect(checkout.heading).toHaveText('Checkout');
      await expect(checkout.form.locator('h2')).toHaveText(['1 Delivery address', '2 Payment', '3 Discount code', 'Order summary']);
      await expect(checkout.summaryItems).toHaveCount(2);
      await expect(checkout.summaryItems.filter({ hasText: arcHeadphones.name })).toContainText(`1 × ${formatUsd(arcHeadphones.price)}`);
      await expect(checkout.summaryItems.filter({ hasText: orbitLamp.name })).toContainText(`2 × ${formatUsd(orbitLamp.price)}`);
      await expect(checkout.summaryItems.filter({ hasText: orbitLamp.name })).toContainText(formatUsd(orbitLamp.price * 2));
      await expect(checkout.placeOrderButton).toHaveText('Place order →');
    });
  });

  test.describe('address', () => {
    const FIELDS = [
      { label: 'Recipient', field: 'name', message: 'Enter the recipient name' },
      { label: 'Street address', field: 'line1', message: 'Enter the street address' },
      { label: 'City', field: 'city', message: 'Enter the city' },
      { label: 'Postal code', field: 'postalCode', message: 'Enter the postal code' },
    ] as const;

    for (const { label, field, message } of FIELDS) {
      test(`CHK-010 Each empty address field shows its message: ${label}`, { tag: '@regression' }, async ({ signedInPage: page, api }) => {
        const checkout = await openCheckout(page, api);
        const requests: string[] = [];
        page.on('request', (r) => r.url().endsWith('/api/orders') && r.method() === 'POST' && requests.push(r.url()));

        await checkout.fillAddress({ [field]: '' });
        await checkout.chooseWallet();
        await checkout.placeOrder();

        await expect(checkout.fieldError(field)).toHaveText(message);
        expect(requests, 'no order request').toHaveLength(0);
      });
    }

    test('CHK-011 Address fields accept at most 200 characters', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      const long = 'a'.repeat(201);

      for (const input of [checkout.recipient, checkout.street, checkout.city, checkout.postalCode]) {
        await input.fill('');
        await input.pressSequentially(long.slice(0, 5));
        await input.evaluate((el: HTMLInputElement, value) => { el.value = ''; el.focus(); }, long);
        await page.keyboard.insertText(long);
        expect((await input.inputValue()).length).toBe(200);
      }
    });

    test('CHK-012 Country list offers all supported countries', { tag: '@regression', annotation: issue(KNOWN_ISSUES.checkoutCountryMissingGermany) }, async ({ signedInPage: page, api }) => {
      test.fail();
      const checkout = await openCheckout(page, api);

      await expect(checkout.country.locator('option')).toHaveText(['Bosnia and Herzegovina', 'Germany', 'United States']);
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

      await expect(checkout.savedCard(expired.last4)).toContainText('Expired');
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

      await expect(checkout.savedCard(CARDS.mastercard.last4).locator('.perk')).toHaveText('−10%');
      await expect(checkout.savedCard(CARDS.visa.last4).locator('.perk')).toHaveCount(0);
    });
  });

  test.describe('new card validation', () => {
    // A customer without saved cards gets "Add a new card" selected by default.
    for (const holder of ['', 'J', '1234']) {
      test(`CHK-030 Invalid cardholder name shows an error: "${holder}"`, { tag: '@regression' }, async ({ signedInPage: page, api }) => {
        const checkout = await openCheckout(page, api);
        await checkout.fillCard({ ...validCard(), holder });
        await checkout.placeOrder();
        await expect(checkout.fieldError('holder')).toHaveText('Enter the cardholder name as it appears on the card');
      });
    }

    test('CHK-031 Card number failing the check digit shows an error', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.fillCard({ ...validCard(), number: CARDS.invalidCheckDigit });
      await checkout.placeOrder();
      await expect(checkout.fieldError('number')).toHaveText('Enter a valid card number');
    });

    test('CHK-032 Unsupported card brand shows an error', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.fillCard({ ...validCard(), number: CARDS.discover });
      await checkout.placeOrder();
      await expect(checkout.fieldError('number')).toHaveText('We accept Visa, Mastercard and American Express');
    });

    test('CHK-033 Card number is formatted and the brand is shown while typing', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      const cases = [
        { card: CARDS.visa, shown: '4242 4242 4242 4242', hint: 'Visa' },
        { card: CARDS.mastercard, shown: '5555 5555 5555 4444', hint: 'Mastercard · 10% off' },
        { card: CARDS.amex, shown: '3782 822463 10005', hint: 'American Express' },
      ];
      for (const { card, shown, hint } of cases) {
        await checkout.cardNumber.fill('');
        await checkout.cardNumber.pressSequentially(card.digits);
        await expect(checkout.cardNumber).toHaveValue(shown);
        await expect(checkout.brandHint).toHaveText(hint);
      }
    });

    test('CHK-034 Expiry in the wrong format shows an error; slash is added', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.expiry.pressSequentially('1229');
      await expect(checkout.expiry).toHaveValue('12/29');

      await checkout.fillCard({ ...validCard(), expiry: '1' });
      await checkout.placeOrder();
      await expect(checkout.fieldError('expiry')).toHaveText('Enter the expiry date as MM/YY');
    });

    test('CHK-035 Expiry month 13 shows an error', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.fillCard({ ...validCard(), expiry: '13/29' });
      await checkout.placeOrder();
      await expect(checkout.fieldError('expiry')).toHaveText('Expiry month must be between 01 and 12');
    });

    test('CHK-036 Last month is expired; current month is accepted', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      await ensureStock(api, markHighlighter.id, 1);
      const checkout = await openCheckout(page, api, markHighlighter.id);

      await checkout.fillCard({ ...validCard(), expiry: monthYear(-1), save: false });
      await checkout.placeOrder();
      await expect(checkout.fieldError('expiry')).toHaveText('This card has expired');

      await checkout.fillCard({ expiry: monthYear(0) });
      await checkout.placeOrder();
      await expect(page).toHaveURL(/#order\//);
    });

    test('CHK-037 Expiry more than 20 years ahead shows an error', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.fillCard({ ...validCard(), expiry: '12/99' });
      await checkout.placeOrder();
      await expect(checkout.fieldError('expiry')).toHaveText('Expiry date is too far in the future');
    });

    test('CHK-038 Security code length depends on the brand', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.fillCard({ ...validCard(CARDS.visa), cvc: '12' });
      await checkout.placeOrder();
      await expect(checkout.fieldError('cvc')).toHaveText('Enter the 3-digit security code');

      await checkout.fillCard({ number: CARDS.amex.number, cvc: '123' });
      await checkout.placeOrder();
      await expect(checkout.fieldError('cvc')).toHaveText('Enter the 4-digit security code');
    });

    test('CHK-039 Empty card form shows all 4 messages', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.placeOrder();

      await expect(checkout.fieldError('holder')).toHaveText('Enter the cardholder name as it appears on the card');
      await expect(checkout.fieldError('number')).toHaveText('Enter a valid card number');
      await expect(checkout.fieldError('expiry')).toHaveText('Enter the expiry date as MM/YY');
      await expect(checkout.fieldError('cvc')).toHaveText('Enter the 3-digit security code');
      await checkout.notifications.expectShown('error', { title: 'Order not placed', message: 'Please fix the 4 highlighted fields before placing your order.' });
    });

    test('CHK-040 Fixing a field removes its error', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.fillCard({ ...validCard(), number: CARDS.invalidCheckDigit });
      await checkout.placeOrder();
      await expect(checkout.fieldError('number')).toHaveText('Enter a valid card number');

      await checkout.cardNumber.fill(CARDS.visa.number);
      await checkout.cardNumber.blur();

      await expect(checkout.fieldError('number')).toBeEmpty();
      await expect(checkout.cardNumber).toHaveAttribute('aria-invalid', 'false');
    });

    test('CHK-041 Invalid form does not send the order', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      const requests: string[] = [];
      page.on('request', (r) => r.url().endsWith('/api/orders') && r.method() === 'POST' && requests.push(r.url()));

      await checkout.fillCard({ ...validCard(), number: CARDS.invalidCheckDigit });
      await checkout.placeOrder();

      await expect(checkout.fieldError('number')).not.toBeEmpty();
      expect(requests).toHaveLength(0);
      await expect(page).toHaveURL(/#checkout$/);
      expect(await (await api.cart.get()).json()).toEqual([{ productId: arcHeadphones.id, quantity: 1 }]);
    });
  });

  test.describe('discount code', () => {
    test('CHK-050 SAVE10 is applied in any case and with spaces', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.coupon.fill(' save10 ');

      await expect(checkout.couponStatus).toHaveText('✓ SAVE10 applied: 10% off your subtotal.');
      await expect(checkout.totals.value('Coupon SAVE10')).toHaveText('−$12.90');
    });

    test('CHK-051 EXPIRED is rejected', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.coupon.fill('EXPIRED');
      await expect(checkout.couponStatus).toHaveText('✗ This code has expired. Remove it to place your order.');

      await checkout.chooseWallet();
      await checkout.placeOrder();

      await checkout.notifications.expectShown('error', { title: 'Order was not placed', message: 'Coupon has expired' });
      await expect(page).toHaveURL(/#checkout$/);
    });

    test('CHK-052 Unknown code is rejected', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const checkout = await openCheckout(page, api);
      await checkout.coupon.fill('HELLO');
      await expect(checkout.couponStatus).toHaveText('✗ We do not recognise this code. Remove it to place your order.');

      await checkout.chooseWallet();
      await checkout.placeOrder();

      await checkout.notifications.expectShown('error', { title: 'Order was not placed', message: 'Unknown coupon' });
    });

    test('CHK-053 Choosing a Mastercard adds the Mastercard line', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
      await saveCards(CARDS.visa, CARDS.mastercard);
      const checkout = await openCheckout(page, api);

      await checkout.chooseSavedCard(CARDS.mastercard.last4);

      await expect(checkout.totals.value('Mastercard 10%')).toHaveText('−$12.90');
      await expect(checkout.totals.value('Total')).toHaveText('$123.10');
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
      const orderId = page.url().split('/').pop() as string;
      await checkout.notifications.expectShown('success', {
        title: 'Order placed',
        message: `Order ${orderId.slice(0, 8)} was placed successfully. We are processing your payment now.`,
      });
      await expect(checkout.header.bagCount).toHaveText('0');
      await expect(order.eyebrow).toHaveText(`Order ${orderId.slice(0, 8)}`);
    });

    for (const card of APPROVED_CARDS) {
      test(`CHK-061 Pay with each approved test card as a new card: ${card.brandName} ${card.number}`, { tag: '@regression' }, async ({ signedInPage: page, api }) => {
        await ensureStock(api, markHighlighter.id, 1);
        const checkout = await openCheckout(page, api, markHighlighter.id);
        const order = new OrderPage(page);

        await checkout.fillCard({ ...validCard(card), save: false });
        await checkout.placeOrder();

        await expect(order.bannerFor('confirmed')).toBeVisible({ timeout: config.orderTimeoutMs });
        await expect(order.fact('Payment')).toHaveText(`${card.brandName} •••• ${card.last4}`);
      });
    }

    test('CHK-062 Pay with a declined card', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      await ensureStock(api, markHighlighter.id, 1);
      const checkout = await openCheckout(page, api, markHighlighter.id);

      await checkout.fillCard({ ...validCard(CARDS.declined), save: false });
      await checkout.placeOrder();

      await checkout.notifications.expectShown('success', { title: 'Order placed' });
      await expect(page).toHaveURL(/#order\//);
    });

    test('CHK-063 "Save this card" decides whether the card is saved', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      const saved = APPROVED_CARDS[5]!; // Mastercard 5105 ... 5100
      const notSaved = APPROVED_CARDS[1]!; // Visa 4111 ... 1111
      await ensureStock(api, markHighlighter.id, 2);

      for (const { card, save } of [{ card: saved, save: true }, { card: notSaved, save: false }]) {
        const checkout = await openCheckout(page, api, markHighlighter.id, { reload: true });
        if (await checkout.newCardOption.isVisible()) await checkout.chooseNewCard();
        await checkout.fillCard({ ...validCard(card), save });
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
      await expect(order.fact('Payment')).toHaveText('Test wallet');
    });
  });
});
