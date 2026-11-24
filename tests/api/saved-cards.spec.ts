import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { APPROVED_CARDS, CARDS, DEMO_CARDS } from '@core/test-data';
import { buildCard } from '@core/factories/checkout-factory';
import type { ApiError, SavedCard } from '@api/types';

test.describe('Saved cards', { tag: ['@saved-cards', '@api'] }, () => {
  test('CARD-020 GET /cards returns only own cards', { tag: '@smoke' }, async ({ demoApi }) => {
    const response = await demoApi.cards.list();

    expect(response.status()).toBe(200);
    await expectMatchesContract(response, 'get', '/cards');
    const cards = (await response.json()) as SavedCard[];
    expect(cards.map(({ id, brand, last4, expMonth, expYear, expired }) => ({ id, brand, last4, expMonth, expYear, expired }))).toEqual(
      Object.values(DEMO_CARDS),
    );
    for (const card of cards) {
      expect(card).not.toHaveProperty('number');
      expect(card).not.toHaveProperty('cvc');
    }
  });

  test('CARD-021 POST /cards saves a card; the same card returns the existing one', { tag: '@regression' }, async ({ api }) => {
    const card = buildCard(CARDS.visa, { expiry: '12/29' });

    const created = await api.cards.save(card);
    expect(created.status()).toBe(201);
    await expectMatchesContract(created, 'post', '/cards');
    const saved = (await created.json()) as SavedCard;
    expect(saved).toMatchObject({ brand: 'visa', last4: '4242', expMonth: 12, expYear: 2029 });

    const again = await api.cards.save(card);
    expect(again.status()).toBe(200);
    expect(((await again.json()) as SavedCard).id).toBe(saved.id);
    expect(await (await api.cards.list()).json()).toHaveLength(1);
  });

  test('CARD-022 Sixth card returns 422', { tag: '@regression' }, async ({ api, saveCards }) => {
    await saveCards(...APPROVED_CARDS.slice(0, 5));

    const response = await api.cards.save(buildCard(APPROVED_CARDS[5]));

    expect(response.status()).toBe(422);
    expect((await response.json()) as ApiError).toEqual({ error: 'You can save at most 5 cards', field: 'card' });
    expect(await (await api.cards.list()).json()).toHaveLength(5);
  });

  test('CARD-023 DELETE /cards/{id} removes the card', { tag: '@regression' }, async ({ api, saveCards }) => {
    // Same setup as the demo account, on a new customer, so the shared demo data stays intact.
    const cards = await saveCards(CARDS.visa, CARDS.mastercard, CARDS.declined);
    const declined = cards.find((c) => c.last4 === CARDS.declined.last4)!;

    const response = await api.cards.remove(declined.id);

    expect(response.status()).toBe(200);
    const left = (await response.json()) as SavedCard[];
    expect(left).toHaveLength(2);
    expect(left.map((c) => c.id)).not.toContain(declined.id);
  });

  test("CARD-024 Unknown or another customer's card returns 404", { tag: '@regression' }, async ({ api, demoApi }) => {
    for (const id of [DEMO_CARDS.visa.id, 'unknown']) {
      const response = await api.cards.remove(id);
      expect(response.status(), id).toBe(404);
      expect(((await response.json()) as ApiError).error).toBe('Card not found');
    }
    const demoCards = (await (await demoApi.cards.list()).json()) as SavedCard[];
    expect(demoCards.map((c) => c.id)).toContain(DEMO_CARDS.visa.id);
  });

  test('CARD-025 Cards without a token return 401', { tag: '@regression' }, async ({ anonApi }) => {
    for (const response of [await anonApi.cards.list(), await anonApi.cards.save(buildCard()), await anonApi.cards.remove('x')]) {
      expect(response.status(), response.url()).toBe(401);
    }
  });
});
