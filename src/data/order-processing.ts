/** How an order moves through the services, from qa-commerce-lab docs/BUSINESS.md (order processing). */

/** Status history of an order, oldest first. */
export const ORDER_HISTORY = {
  approved: ['pending', 'payment_pending', 'confirmed'],
  declined: ['pending', 'payment_pending', 'compensating', 'cancelled'],
} as const;

/** Events published for one order, in order. */
export const ORDER_EVENTS = {
  approved: ['OrderPlaced', 'InventoryReserved', 'PaymentApproved', 'OrderConfirmed'],
  declined: ['OrderPlaced', 'InventoryReserved', 'PaymentFailed', 'InventoryReleased'],
} as const;
