import { randomUUID } from 'node:crypto';
import type { Address, CheckoutRequest, NewCard } from '@api/types';
import { CARDS, type TestCard } from '@data/index';
import { random } from '@core/random-data';

/** Supported delivery countries, as the API expects them. */
export const COUNTRIES = { bosnia: 'BA', germany: 'DE', unitedStates: 'US' } as const;

/** A generated delivery address in Bosnia and Herzegovina. */
export function buildAddress(overrides: Partial<Address> = {}): Address {
  return { ...random.address(), country: COUNTRIES.bosnia, ...overrides };
}

/** The address as the order page shows it under "Deliver to". */
export const formatAddress = (a: Address): string => `${a.name}${a.line1}${a.postalCode} ${a.city}, ${a.country}`;

/** Expiry as MM/YY, `monthsFromNow` months from the current month (negative for the past). */
export function expiryIn(monthsFromNow: number): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + monthsFromNow);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear() % 100).padStart(2, '0')}`;
}

/** A card expiring at the end of next year, so it never expires during a run. */
export function futureExpiry(): string {
  const year = (new Date().getFullYear() + 1) % 100;
  return `12/${String(year).padStart(2, '0')}`;
}

/** A new card as typed on the checkout page: generated holder, test card number, valid expiry. */
export function cardForm(testCard: TestCard = CARDS.visa, overrides: { holder?: string; expiry?: string; cvc?: string; number?: string; save?: boolean } = {}) {
  return { holder: random.cardholder(), number: testCard.number, expiry: futureExpiry(), cvc: testCard.cvc, ...overrides };
}

export function buildCard(testCard: TestCard = CARDS.visa, overrides: Partial<NewCard> = {}): NewCard {
  return { holder: random.cardholder(), number: testCard.digits, expiry: futureExpiry(), cvc: testCard.cvc, ...overrides };
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
