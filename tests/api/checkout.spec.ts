import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { API_ERRORS, APPROVED_CARDS, CARDS, DEMO_CARDS, PRODUCTS } from '@data/index';
import { INVALID_CARD_FIELDS, INVALID_CHECKOUT_REQUESTS } from '@data/cases/checkout';
import { calculateTotals } from '@core/pricing';
import { availableStock, ensureStock, placeOrder, setCart, waitForTerminalOrder } from '@core/flows/order-flow';
import { buildAddress, buildCheckout, newIdempotencyKey, pay } from '@core/factories/checkout-factory';
import type { ApiClients } from '@api/index';
import type { ApiError, CheckoutRequest, Order, Payment } from '@api/types';

const { arcHeadphones, stillMug, pureToothbrush, markHighlighter } = PRODUCTS;
const line = (productId: string) => [{ productId, quantity: 1 }];

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
      expect(body).toEqual({ error: API_ERRORS.checkout.savedOrNewCard, field: 'card' });
    }
    await noOrders(api);
  });

  for (const { name, card, change, field, error } of INVALID_CARD_FIELDS) {
    test(`CHK-081 Invalid card field returns 422 with its field name: ${name}`, { tag: '@regression' }, async ({ api }) => {
      await setCart(api, line(arcHeadphones.id));
      const { status, body } = await rejectCheckout(api, pay.newCard(card, true, change));

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
    expect(body).toEqual({ error: API_ERRORS.checkout.savedCardExpired, field: 'savedCardId' });
  });

  test("CHK-085 Another customer's saved card returns 422", { tag: '@regression' }, async ({ api }) => {
    await setCart(api, line(stillMug.id));
    const { status, body } = await rejectCheckout(api, pay.savedCard(DEMO_CARDS.visa.id));

    expect(status).toBe(422);
    expect(body).toEqual({ error: API_ERRORS.checkout.savedCardNotFound, field: 'savedCardId' });
    await noOrders(api);
  });

  test('CHK-086 Card details with the wallet return 422', { tag: '@regression' }, async ({ api }) => {
    await setCart(api, line(stillMug.id));
    const { status, body } = await rejectCheckout(api, { paymentMethod: 'test-wallet', card: pay.newCard().card });

    expect(status).toBe(422);
    expect(body).toEqual({ error: API_ERRORS.checkout.cardDetailsWithWallet, field: 'paymentMethod' });
  });

  test('CHK-087 Full card number and CVC are never returned', { tag: '@regression' }, async ({ api }) => {
    const card = APPROVED_CARDS[2]!;
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

  for (const { name, request, emptyCart, error } of INVALID_CHECKOUT_REQUESTS) {
    test(`CHK-088 Invalid checkout request returns 422: ${name}`, { tag: '@regression' }, async ({ api }) => {
      await setCart(api, emptyCart ? [] : line(arcHeadphones.id));
      const { status, body } = await rejectCheckout(api, request());

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
    const currentTotal = calculateTotals([{ unitPrice: arcHeadphones.price, quantity: 1 }]).total;
    expect(((await response.json()) as ApiError).error).toBe(API_ERRORS.checkout.priceChanged(currentTotal));
    await noOrders(api);
    expect(await (await api.cart.get()).json()).toEqual(line(arcHeadphones.id));
  });

  test('CHK-090 Same key returns the same order; different body returns 409', { tag: '@regression' }, async ({ api }) => {
    await ensureStock(api, pureToothbrush.id, 1);
    const { order, body, idempotencyKey } = await placeOrder(api, line(pureToothbrush.id), pay.wallet());

    const replay = await api.orders.place(body, idempotencyKey);
    expect(replay.status()).toBe(200);
    expect(((await replay.json()) as Order).id).toBe(order.id);

    const changed = await api.orders.place({ ...body, address: buildAddress() }, idempotencyKey);
    expect(changed.status()).toBe(409);
    expect(((await changed.json()) as ApiError).error).toBe(API_ERRORS.checkout.idempotencyConflict);

    expect(await (await api.orders.list()).json()).toHaveLength(1);
  });
});
