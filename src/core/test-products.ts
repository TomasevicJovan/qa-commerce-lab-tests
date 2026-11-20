/**
 * Stock is shared by every test running against the lab, and the lab has no restock endpoint.
 * A test that asserts a stock delta must therefore be the only test that buys that product
 * while it runs. This map makes the ownership explicit:
 *
 * - parallel tests (api, ui) each own a distinct product,
 * - lab scenarios run one at a time, after everything else, so they may reuse products.
 *
 * Seed stock: p1 12, p2 8, p3 5, p4 3, p5 20, p6 1, p7 7, p8 9, p9 4.
 */
export const STOCK_OWNERS = {
  // parallel
  uiCheckout: { id: 'p5', name: 'Still Ceramic Mug', price: 2_400 },
  idempotencyReplay: { id: 'p1', name: 'Arc Wireless Headphones', price: 12_900 },
  idempotencyConflict: { id: 'p7', name: 'Pebble Desk Clock', price: 4_500 },
  ordersAccess: { id: 'p3', name: 'Loop Mechanical Keyboard', price: 14_900 },
  lastUnitRace: { id: 'p6', name: 'Pocket Mini Speaker', price: 5_900 },
  // serial (tests/scenarios)
  paymentFailure: { id: 'p1', name: 'Arc Wireless Headphones', price: 12_900 },
  consumerOutage: { id: 'p2', name: 'Orbit Desk Lamp', price: 7_900 },
  duplicateEvents: { id: 'p8', name: 'Fold Travel Organizer', price: 3_500 },
} as const;
