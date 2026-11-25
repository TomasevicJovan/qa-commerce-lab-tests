/** Business limits from qa-commerce-lab docs/BUSINESS.md. Boundary tests are built from these. */
export const LIMITS = {
  password: { min: 8, max: 128 },
  nameMax: 100,
  addressFieldMax: 200,
  /** How many years ahead a card expiry may be. */
  expiryMaxYears: 20,
  savedCards: 5,
  wishlistProducts: 50,
  cartQuantity: { min: 1, max: 10 },
  cartLines: 20,
  pageSize: { max: 50 },
} as const;
