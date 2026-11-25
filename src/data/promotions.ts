/** Promotion bar messages and discount codes, from qa-commerce-lab docs/BUSINESS.md. */

/** Promotion bar messages, in order. */
export const PROMOTIONS = [
  'Pay with a Mastercard and save 10% on every order, even on top of SAVE10.',
  'Black Friday: up to 40% off selected products →',
  'Free shipping from $150, or when every item in your bag ships free.',
  'Use code SAVE10 at checkout for 10% off.',
] as const;

export const COUPONS = {
  /** 10% off the subtotal. */
  save10: 'SAVE10',
  /** A real code whose validity has ended. */
  expired: 'EXPIRED',
  /** A code the shop does not know. */
  unknown: 'HELLO',
} as const;

/** Free shipping limit (cents) and the flat shipping fee (cents). */
export const SHIPPING = {
  freeFrom: 15_000,
  flatFee: 700,
} as const;
