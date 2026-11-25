/** Values for the lab switches that scenario tests use, and what the lab does with them (qa-commerce-lab docs). */
export const LAB = {
  /** With stalePrice on, product lists show each price this many cents too low. */
  stalePriceCents: 100,
  /** A slow API, long enough to see the "Placing order…" state. */
  slowApiMs: 2_000,
  /** A delay that lets a double click land while the first request is still running. */
  doubleClickApiMs: 1_000,
  /** Payment delay that keeps an order in progress while the order page is checked. */
  slowPaymentMs: 3_000,
  /** Payment delay long enough to leave the order page before the result arrives. */
  paymentWhileBrowsingMs: 4_000,
  /** Session lifetimes (seconds) for expiry tests, and the normal lifetime to restore. */
  shortSessionSeconds: 5,
  apiSessionSeconds: 2,
  checkoutSessionSeconds: 20,
  normalSessionSeconds: 3_600,
} as const;

/** Timings of the storefront itself (qa-commerce-lab docs/FRONTEND.md). */
export const STOREFRONT_TIMING = {
  /** How often the storefront checks orders that are still in progress. */
  orderPollMs: 2_000,
  /** How long a notification stays: errors longer than the rest. */
  notificationMs: 5_000,
  errorNotificationMs: 9_000,
  /** The search runs this long after the last key press. */
  searchDebounceMs: 350,
  /** How often the promotion bar moves to the next message. */
  promoRotationMs: 5_000,
} as const;
