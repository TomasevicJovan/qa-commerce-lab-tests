import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { APPROVED_CARDS, CARDS, DEMO_CARDS, PRODUCTS } from '@core/test-data';
import { availableStock, ensureStock, placeOrder, setCart, waitForTerminalOrder } from '@core/flows/order-flow';
import { buildAddress, buildCheckout, newIdempotencyKey, pay } from '@core/factories/checkout-factory';
import type { ApiClients } from '@api/index';
import type { ApiError, CheckoutRequest, Order, Payment } from '@api/types';

const { arcHeadphones, stillMug, pureToothbrush, markHighlighter } = PRODUCTS;
const line = (productId: string) => [{ productId, quantity: 1 }];

/** Last month as MM/YY: the newest expiry that is already expired. */
function lastMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear() % 100).padStart(2, '0')}`;
}

/**
 * Sends a checkout that must be refused before anything is saved.
 * A payment in overrides replaces the default new Visa card.
 */
async function rejectCheckout(api: ApiClients, overrides: Partial<CheckoutRequest> | Record<string, unknown>) {
  const response = await api.orders.place(buildCheckout(1, overrides as Partial<CheckoutRequest>), newIdempotencyKey());
  return { status: response.status(), body: (await response.json()) as ApiError };
}

const noOrders = async (api: ApiClients) => expect(await (await api.orders.list()).json(), 'no order is created').toEqual([]);

test.describe('Checkout and card payments', { tag: ['@checkout', '@api'] }, () => {
  test('CHK-080 Card payment needs exactly one of saved card or new card', { tag: '@regression' }, async ({ api, saveCards }) => {
    const [saved] = await saveCards(CARDS.visa);
    await setCart(api, line(arcHeadphones.id));

    for (const payment of [{ paymentMethod: 'card' }, { paymentMethod: 'card', savedCardId: saved!.id, card: pay.newCard().card }]) {
      const { status, body } = await rejectCheckout(api, payment);
      expect(status).toBe(422);
      expect(body).toEqual({ error: 'Pay with either a saved card or a new card', field: 'card' });
    }
    await noOrders(api);
  });

  const INVALID_FIELDS = [
    { name: 'holder J', card: { holder: 'J' }, field: 'holder', error: 'Enter the cardholder name as it appears on the card' },
    { name: 'number with a wrong check digit', card: { number: CARDS.invalidCheckDigit }, field: 'number', error: 'Enter a valid card number' },
    { name: 'Discover number', card: { number: CARDS.discover }, field: 'number', error: 'We accept Visa, Mastercard and American Express' },
    { name: 'expiry 13/29', card: { expiry: '13/29' }, field: 'expiry', error: 'Expiry month must be between 01 and 12' },
    { name: 'expiry last month', card: { expiry: lastMonth() }, field: 'expiry', error: 'This card has expired' },
    { name: 'cvc 12', card: { cvc: '12' }, field: 'cvc', error: 'Enter the 3-digit security code' },
    { name: 'Amex with cvc 123', card: { number: CARDS.amex.number, cvc: '123' }, field: 'cvc', error: 'Enter the 4-digit security code' },
  ];
  for (const { name, card, field, error } of INVALID_FIELDS) {
    test(`CHK-081 Invalid card field returns 422 with its field name: ${name}`, { tag: '@regression' }, async ({ api }) => {
      await setCart(api, line(arcHeadphones.id));
      const { status, body } = await rejectCheckout(api, pay.newCard(CARDS.visa, true, card));

      expect(status).toBe(422);
      expect(body).toEqual({ error, field });
      expect(await (await api.cards.list()).json(), 'the card is not saved').toEqual([]);
      await noOrders(api);
    });
  }

  for (const card of APPROVED_CARDS) {
    test(`CHK-082 Approved card ends in a confirmed order: ${card.brandName} ${card.number}`, { tag: '@regression' }, async ({ api }) => {
      const { order: accepted, expected } = await placeOrder(api, line(pureToothbrush.id), pay.newCard(card));
      expect(accepted.status).toBe('pending');

      const order = await waitForTerminalOrder(api, accepted.id);
      expect(order.status).toBe('confirmed');
      const payment = (await (await api.payments.get(order.id)).json()) as Payment;
      expect(payment).toMatchObject({ status: 'approved', amount: expected.total, brand: card.brand, last4: card.last4 });
    });
  }

  test('CHK-083 Any other valid card is declined after acceptance', { tag: '@smoke' }, async ({ api }) => {
    const stockBefore = await availableStock(api, markHighlighter.id);

    const { order: accepted, expected } = await placeOrder(api, line(markHighlighter.id), pay.newCard(CARDS.declined));
    expect(accepted.status).toBe('pending');

    const order = await waitForTerminalOrder(api, accepted.id);
    expect(order).toMatchObject({ status: 'cancelled', reason: 'card_declined' });
    const payment = (await (await api.payments.get(order.id)).json()) as Payment;
    expect(payment).toMatchObject({ status: 'failed', reason: 'card_declined', amount: expected.total, brand: 'visa', last4: CARDS.declined.last4 });
    await expect.poll(() => availableStock(api, markHighlighter.id)).toBe(stockBefore);
  });

  test('CHK-084 Expired saved card returns 422', { tag: '@regression' }, async ({ demoApi }) => {
    // Refused before the cart is read, so the shared demo account is not changed.
    const { status, body } = await rejectCheckout(demoApi, pay.savedCard(DEMO_CARDS.expired.id));

    expect(status).toBe(422);
    expect(body).toEqual({ error: 'This saved card has expired. Choose another card', field: 'savedCardId' });
  });

  test("CHK-085 Another customer's saved card returns 422", { tag: '@regression' }, async ({ api }) => {
    await setCart(api, line(stillMug.id));
    const { status, body } = await rejectCheckout(api, pay.savedCard(DEMO_CARDS.visa.id));

    expect(status).toBe(422);
    expect(body).toEqual({ error: 'Saved card not found', field: 'savedCardId' });
    await noOrders(api);
  });

  test('CHK-086 Card details with the wallet return 422', { tag: '@regression' }, async ({ api }) => {
    await setCart(api, line(stillMug.id));
    const { status, body } = await rejectCheckout(api, { paymentMethod: 'test-wallet', card: pay.newCard().card });

    expect(status).toBe(422);
    expect(body).toEqual({ error: 'Card details are only accepted with the card payment method', field: 'paymentMethod' });
  });

  test('CHK-087 Full card number and CVC are never returned', { tag: '@regression' }, async ({ api }) => {
    const card = APPROVED_CARDS[2]!; // Visa 4012 8888 8888 1881
    const { order } = await placeOrder(api, line(pureToothbrush.id), pay.newCard(card, true));
    await waitForTerminalOrder(api, order.id);

    const responses = [await api.orders.get(order.id), await api.cards.list(), await api.payments.get(order.id)];
    for (const response of responses) {
      const text = await response.text();
      expect(text, response.url()).not.toContain(card.digits);
      expect(text, response.url()).not.toContain(card.digits.slice(0, 12));
      expect(text, response.url()).not.toMatch(new RegExp(`"(cvc|cvv|number)"`));
      expect(text, response.url()).toContain(card.last4);
    }
  });

  const INVALID_REQUESTS = [
    { name: 'missing address.city', overrides: { address: { ...buildAddress(), city: undefined } }, error: 'Complete shipping address required' },
    { name: 'empty cart', overrides: pay.wallet(), emptyCart: true, error: 'Cart is empty' },
    { name: 'payment method cash', overrides: { paymentMethod: 'cash' }, error: 'Choose a payment method: card or test-wallet' },
    { name: 'coupon EXPIRED', overrides: { coupon: 'EXPIRED' }, error: 'Coupon has expired' },
    { name: 'coupon HELLO', overrides: { coupon: 'HELLO' }, error: 'Unknown coupon' },
  ];
  for (const { name, overrides, emptyCart, error } of INVALID_REQUESTS) {
    test(`CHK-088 Invalid checkout request returns 422: ${name}`, { tag: '@regression' }, async ({ api }) => {
      await setCart(api, emptyCart ? [] : line(arcHeadphones.id));
      const { status, body } = await rejectCheckout(api, overrides);

      expect(status).toBe(422);
      expect(body.error).toBe(error);
      await noOrders(api);
    });
  }

  test('CHK-089 Wrong expected total returns 409 and saves nothing', { tag: '@regression' }, async ({ api }) => {
    await setCart(api, line(arcHeadphones.id));
    const response = await api.orders.place(buildCheckout(1), newIdempotencyKey());

    expect(response.status()).toBe(409);
    await expectMatchesContract(response, 'post', '/orders');
    expect(((await response.json()) as ApiError).error).toBe('Price changed. Current total is 13600 cents. Refresh your cart.');
    await noOrders(api);
    expect(await (await api.cart.get()).json()).toEqual(line(arcHeadphones.id));
  });

  test('CHK-090 Same key returns the same order; different body returns 409', { tag: '@regression' }, async ({ api }) => {
    await ensureStock(api, pureToothbrush.id, 1);
    const { order, body, idempotencyKey } = await placeOrder(api, line(pureToothbrush.id), pay.wallet());

    const replay = await api.orders.place(body, idempotencyKey);
    expect(replay.status()).toBe(200);
    expect(((await replay.json()) as Order).id).toBe(order.id);

    const changed = await api.orders.place({ ...body, address: buildAddress({ city: 'Mostar' }) }, idempotencyKey);
    expect(changed.status()).toBe(409);
    expect(((await changed.json()) as ApiError).error).toBe('Idempotency key already used with different request');

    expect(await (await api.orders.list()).json()).toHaveLength(1);
  });
});
