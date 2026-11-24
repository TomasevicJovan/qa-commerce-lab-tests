/**
 * Independent implementation of the documented pricing rules (qa-commerce-lab docs/BUSINESS.md),
 * used as the test oracle. It must never import application code.
 *
 *   subtotal         = sum(unit price × quantity)          Black Friday is already in the unit price
 *   couponDiscount   = round(subtotal × 10%) for SAVE10
 *   paymentDiscount  = round((subtotal − couponDiscount) × 10%) when paid with a Mastercard
 *   shipping         = 0 when subtotal − discounts ≥ $150.00, or when every line ships free; otherwise $7.00
 */
import type { CardBrand } from '@api/types';

export const FREE_SHIPPING_THRESHOLD = 15_000;
export const SHIPPING_FEE = 700;
export const VALID_COUPON = 'SAVE10';

export interface PricedLine {
  unitPrice: number;
  quantity: number;
  freeShipping?: boolean;
}

export interface PricingOptions {
  coupon?: string;
  cardBrand?: CardBrand | null;
}

export interface Totals {
  subtotal: number;
  couponDiscount: number;
  paymentDiscount: number;
  discount: number;
  shipping: number;
  total: number;
}

/** Half-up rounding to whole cents, as documented. */
const roundCents = (value: number) => Math.floor(value + 0.5);

export function calculateTotals(lines: PricedLine[], { coupon = '', cardBrand = null }: PricingOptions = {}): Totals {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const couponDiscount = coupon === VALID_COUPON ? roundCents(subtotal * 0.1) : 0;
  const paymentDiscount = cardBrand === 'mastercard' ? roundCents((subtotal - couponDiscount) * 0.1) : 0;
  const discount = couponDiscount + paymentDiscount;
  const allShipFree = lines.length > 0 && lines.every((line) => line.freeShipping === true);
  const shipping = subtotal - discount >= FREE_SHIPPING_THRESHOLD || allShipFree ? 0 : SHIPPING_FEE;
  return { subtotal, couponDiscount, paymentDiscount, discount, shipping, total: subtotal - discount + shipping };
}

/** 12310 -> "$123.10", matching the storefront's en-US formatting. */
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
