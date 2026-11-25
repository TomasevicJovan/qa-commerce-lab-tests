/** Published test cards and the saved cards of the demo account. */
import type { CardBrand } from '@api/types';

export interface TestCard {
  brand: CardBrand;
  brandName: string;
  /** As printed on the card, with spaces. */
  number: string;
  digits: string;
  last4: string;
  cvc: string;
}

const card = (brand: CardBrand, number: string): TestCard => {
  const digits = number.replace(/\s/g, '');
  return {
    brand,
    brandName: { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' }[brand],
    number,
    digits,
    last4: digits.slice(-4),
    cvc: brand === 'amex' ? '1234' : '123',
  };
};

/** The ten published test cards that the shop approves. */
export const APPROVED_CARDS: TestCard[] = [
  card('visa', '4242 4242 4242 4242'),
  card('visa', '4111 1111 1111 1111'),
  card('visa', '4012 8888 8888 1881'),
  card('visa', '4000 0566 5566 5556'),
  card('mastercard', '5555 5555 5555 4444'),
  card('mastercard', '5105 1051 0510 5100'),
  card('mastercard', '2223 0031 2200 3222'),
  card('mastercard', '5200 8282 8282 8210'),
  card('amex', '3782 822463 10005'),
  card('amex', '3714 496353 98431'),
];

export const CARDS = {
  visa: APPROVED_CARDS[0] as TestCard,
  mastercard: APPROVED_CARDS[4] as TestCard,
  amex: APPROVED_CARDS[8] as TestCard,
  /** Second approved card of each brand, for tests that need two different cards. */
  visa2: APPROVED_CARDS[1] as TestCard,
  mastercard2: APPROVED_CARDS[5] as TestCard,
  amex2: APPROVED_CARDS[9] as TestCard,
  /** Valid number that the simulated bank declines. */
  declined: card('visa', '4000 0000 0000 0002'),
  /** Valid check digit, unsupported brand (Discover). */
  discover: '6011 1111 1111 1117',
  /** Fails the check digit. */
  invalidCheckDigit: '4242 4242 4242 4241',
} as const;

/** Saved cards of the demo account on fresh data. Only read, never changed, by tests. */
export const DEMO_CARDS = {
  visa: { id: 'card-demo-visa', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030, expired: false },
  mastercard: { id: 'card-demo-mastercard', brand: 'mastercard', last4: '4444', expMonth: 8, expYear: 2029, expired: false },
  declined: { id: 'card-demo-declined', brand: 'visa', last4: '0002', expMonth: 5, expYear: 2029, expired: false },
  expired: { id: 'card-demo-expired', brand: 'mastercard', last4: '5100', expMonth: 1, expYear: 2025, expired: true },
} as const;
