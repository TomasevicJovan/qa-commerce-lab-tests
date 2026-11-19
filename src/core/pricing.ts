/**
 * Independent implementation of the documented pricing rules (docs/BUSINESS.md),
 * used as the test oracle. It must never import application code.
 *
 *   discount = round(subtotal * 0.10) for SAVE10, otherwise 0
 *   shipping = 0 if subtotal - discount >= 15000, otherwise 700
 */
export const FREE_SHIPPING_THRESHOLD = 15_000;
export const SHIPPING_FEE = 700;
export const VALID_COUPON = 'SAVE10';

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

export function calculateTotals(lines: PricedLine[], coupon = ''): Totals {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const discount = coupon === VALID_COUPON ? Math.round(subtotal * 0.1) : 0;
  const shipping = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}

/** 12310 -> "$123.10", matching the storefront's en-US formatting. */
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
