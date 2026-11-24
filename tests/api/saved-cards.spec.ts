import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import { DEMO_CARDS } from '@core/test-data';
import type { SavedCard } from '@api/types';

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
});
