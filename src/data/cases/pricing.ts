/**
 * Pricing decision table from docs/BUSINESS.md. Expected amounts are fixed numbers (cents), worked out
 * by hand from the rules, not computed: they check the shop and our own calculation in src/core/pricing.ts.
 */
import type { CartItem } from '@api/types';
import { PRODUCTS } from '@data/catalog';
import { COUPONS } from '@data/promotions';

const p = PRODUCTS;
const line = (product: { id: string }, quantity = 1): CartItem => ({ productId: product.id, quantity });
const { save10 } = COUPONS;

export interface PriceRow {
  id: string;
  title: string;
  items: CartItem[];
  coupon?: string;
  mastercard?: boolean;
  total: number;
  shipping: number;
}

export const PRICE_TABLE: PriceRow[] = [
  { id: 'PRICE-001', title: '1 × Arc Wireless Headphones → $136.00', items: [line(p.arcHeadphones)], total: 13_600, shipping: 700 },
  { id: 'PRICE-002', title: '1 × Arc Wireless Headphones + SAVE10 → $123.10', items: [line(p.arcHeadphones)], coupon: save10, total: 12_310, shipping: 700 },
  { id: 'PRICE-003', title: '1 × Arc Wireless Headphones + Mastercard → $123.10', items: [line(p.arcHeadphones)], mastercard: true, total: 12_310, shipping: 700 },
  { id: 'PRICE-005', title: 'Exactly $150.00 ships free (boundary is inclusive)', items: [line(p.pebbleClock), line(p.foldOrganizer, 3)], total: 15_000, shipping: 0 },
  { id: 'PRICE-006', title: '$149.00 pays shipping → $156.00', items: [line(p.loopKeyboard)], total: 15_600, shipping: 700 },
  { id: 'PRICE-007', title: '2 × Orbit Desk Lamp → $158.00 (free shipping)', items: [line(p.orbitLamp, 2)], total: 15_800, shipping: 0 },
  { id: 'PRICE-008', title: '2 × Orbit Desk Lamp + SAVE10 → $149.20 (coupon brings shipping back)', items: [line(p.orbitLamp, 2)], coupon: save10, total: 14_920, shipping: 700 },
  { id: 'PRICE-009', title: '2 × Orbit Desk Lamp + Mastercard → $149.20 (Mastercard brings shipping back)', items: [line(p.orbitLamp, 2)], mastercard: true, total: 14_920, shipping: 700 },
  { id: 'PRICE-010', title: '2 × Orbit Desk Lamp + SAVE10 + Mastercard → $134.98', items: [line(p.orbitLamp, 2)], coupon: save10, mastercard: true, total: 13_498, shipping: 700 },
  { id: 'PRICE-011', title: '1 × Note Dotted Journal (all items ship free) → $18.00', items: [line(p.noteJournal)], total: 1_800, shipping: 0 },
  { id: 'PRICE-012', title: 'Note Dotted Journal + Still Ceramic Mug (mixed) → $49.00', items: [line(p.noteJournal), line(p.stillMug)], total: 4_900, shipping: 700 },
  { id: 'PRICE-013', title: 'Nova Gaming Chair is charged at the Black Friday price → $249.00', items: [line(p.novaChair)], total: 24_900, shipping: 0 },
  { id: 'PRICE-014', title: 'Pulse Wireless Controller (deal) + SAVE10 + Mastercard → $54.79', items: [line(p.pulseController)], coupon: save10, mastercard: true, total: 5_479, shipping: 700 },
  { id: 'PRICE-020', title: 'Pocket Notebook 3-pack + SAVE10 → $24.95 (1.995 rounds up)', items: [line(p.pocketNotebook)], coupon: save10, total: 2_495, shipping: 700 },
  { id: 'PRICE-021', title: 'Pocket Notebook 3-pack + SAVE10 + Mastercard → $23.15 (1.795 rounds up)', items: [line(p.pocketNotebook)], coupon: save10, mastercard: true, total: 2_315, shipping: 700 },
  { id: 'PRICE-022', title: 'Twist Phone Grip + SAVE10 + Mastercard → $17.48 (1.165 rounds up)', items: [line(p.twistGrip)], coupon: save10, mastercard: true, total: 1_748, shipping: 700 },
];

/** Arc Wireless Headphones with SAVE10 and a Mastercard: every discount at once (PRICE-004, 030, 042). */
export const ARC_ALL_DISCOUNTS = {
  items: [line(p.arcHeadphones)],
  coupon: save10,
  subtotal: 12_900,
  couponDiscount: 1_290,
  paymentDiscount: 1_161,
  discount: 2_451,
  shipping: 700,
  total: 11_149,
} as const;

/** Pocket Notebook 3-pack with SAVE10 and a Mastercard: both discounts round half up (PRICE-044). */
export const NOTEBOOK_ROUNDING = {
  product: p.pocketNotebook,
  coupon: save10,
  couponDiscount: 200,
  paymentDiscount: 180,
  total: 2_315,
} as const;

/** Bag totals for the shipping rules (PRICE-040, 041). */
export const BAG_SHIPPING = {
  freeByAmount: { items: [line(p.orbitLamp, 2)], total: 15_800 },
  paid: { items: [line(p.arcHeadphones)], shipping: 700, total: 13_600 },
  allFreeShipping: { kept: p.noteJournal, removed: p.stillMug, total: 1_800 },
} as const;

export { line };
