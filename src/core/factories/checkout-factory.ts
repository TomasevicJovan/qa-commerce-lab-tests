import { randomUUID } from 'node:crypto';
import type { Address, CheckoutRequest, NewCard } from '@api/types';
import { CARDS, type TestCard } from '@core/test-data';

export function buildAddress(overrides: Partial<Address> = {}): Address {
  return {
    name: 'Alex Tester',
    line1: '12 Test Avenue',
    city: 'Sarajevo',
    postalCode: '71000',
    country: 'BA',
    ...overrides,
  };
}

/** A card expiring at the end of next year, so it never expires during a run. */
export function futureExpiry(): string {
  const year = (new Date().getFullYear() + 1) % 100;
  return `12/${String(year).padStart(2, '0')}`;
}

export function buildCard(testCard: TestCard = CARDS.visa, overrides: Partial<NewCard> = {}): NewCard {
  return { holder: 'Alex Tester', number: testCard.digits, expiry: futureExpiry(), cvc: testCard.cvc, ...overrides };
}

type PaymentPart = Pick<CheckoutRequest, 'paymentMethod' | 'savedCardId' | 'card' | 'saveCard'>;

/** The three ways to pay at checkout. */
export const pay = {
  newCard: (testCard: TestCard = CARDS.visa, save = false, overrides: Partial<NewCard> = {}): PaymentPart => ({
    paymentMethod: 'card',
    card: buildCard(testCard, overrides),
    saveCard: save,
  }),
  savedCard: (savedCardId: string): PaymentPart => ({ paymentMethod: 'card', savedCardId }),
  wallet: (): PaymentPart => ({ paymentMethod: 'test-wallet' }),
};

/** Default payment is a new approved Visa card that is not saved. */
export function buildCheckout(expectedTotal: number, overrides: Partial<CheckoutRequest> = {}): CheckoutRequest {
  // A payment given in overrides replaces the default one completely (a wallet must not carry card details).
  return {
    address: buildAddress(),
    ...(overrides.paymentMethod ? {} : pay.newCard()),
    coupon: '',
    expectedTotal,
    ...overrides,
  } as CheckoutRequest;
}

export const newIdempotencyKey = (): string => randomUUID();
