/**
 * Reference data of the seeded demo account. Its email and password are configuration
 * (see `config.demoUser`, read from .env or CI secrets), not test data.
 */
export const DEMO_ACCOUNT = {
  name: 'QA Engineer',
  /** Holder name on the demo account's seeded saved cards. */
  cardholder: 'QA Engineer',
  savedCards: 4,
} as const;
