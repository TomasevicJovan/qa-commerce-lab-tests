import { expect } from '@playwright/test';
import type { ApiClients } from '@api/index';
import {
  TERMINAL_STATUSES,
  type ApiError,
  type CardBrand,
  type CartItem,
  type CheckoutRequest,
  type Order,
  type Product,
  type SavedCard,
} from '@api/types';
import { config } from '@core/config';
import { calculateTotals, type PricedLine, type Totals } from '@core/pricing';
import { buildCheckout, newIdempotencyKey } from '@core/factories/checkout-factory';

/** Reads authoritative prices from product detail (list prices can be stale on purpose). */
export async function authoritativeLines(api: ApiClients, items: CartItem[]): Promise<(CartItem & PricedLine)[]> {
  return Promise.all(
    items.map(async (item) => {
      const response = await api.catalog.get(item.productId);
      expect(response.status(), `product ${item.productId}`).toBe(200);
      const product = (await response.json()) as Product;
      return { ...item, unitPrice: product.price, freeShipping: product.freeShipping };
    }),
  );
}

export async function setCart(api: ApiClients, items: CartItem[]): Promise<void> {
  const response = await api.cart.replace(items);
  expect(response.status(), `set cart: ${await response.text()}`).toBe(200);
}

/** Card brand by number prefix, implemented independently of the shop. */
export function brandOfNumber(number: string): CardBrand | null {
  const digits = number.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  return null;
}

/** Brand that pays for this checkout body: the new card's, the saved card's, or none for the wallet. */
export async function brandOfPayment(api: ApiClients, body: Partial<CheckoutRequest>): Promise<CardBrand | null> {
  if (body.card) return brandOfNumber(body.card.number);
  if (body.savedCardId) {
    const cards = (await (await api.cards.list()).json()) as SavedCard[];
    return cards.find((c) => c.id === body.savedCardId)?.brand ?? null;
  }
  return null;
}

/** Expected totals for a cart and checkout options, from the test oracle. */
export async function expectedTotals(api: ApiClients, items: CartItem[], overrides: Partial<CheckoutRequest> = {}): Promise<Totals> {
  const lines = await authoritativeLines(api, items);
  const body = buildCheckout(0, overrides);
  return calculateTotals(lines, { coupon: body.coupon ?? '', cardBrand: await brandOfPayment(api, body) });
}

export interface PlacedOrder {
  order: Order;
  body: CheckoutRequest;
  idempotencyKey: string;
  expected: Totals;
}

/**
 * Builds the cart, computes the expected total with the test oracle and places the order.
 * Returns the exact body and key so tests can replay them for idempotency checks.
 */
export async function placeOrder(api: ApiClients, items: CartItem[], overrides: Partial<CheckoutRequest> = {}): Promise<PlacedOrder> {
  for (const item of items) await ensureStock(api, item.productId, item.quantity);
  await setCart(api, items);
  const expected = await expectedTotals(api, items, overrides);
  const body = buildCheckout(expected.total, overrides);
  const idempotencyKey = newIdempotencyKey();

  const response = await api.orders.place(body, idempotencyKey);
  expect(response.status(), `place order: ${await response.text()}`).toBe(202);
  return { order: (await response.json()) as Order, body, idempotencyKey, expected };
}

/** Places an order and waits until it is confirmed, rejected or cancelled. */
export async function placeAndSettle(api: ApiClients, items: CartItem[], overrides: Partial<CheckoutRequest> = {}) {
  const placed = await placeOrder(api, items, overrides);
  return { ...placed, order: await waitForTerminalOrder(api, placed.order.id) };
}

/** Polls until the order reaches confirmed, rejected or cancelled. HTTP 202 is not success. */
export async function waitForTerminalOrder(api: ApiClients, orderId: string): Promise<Order> {
  let latest: Order | undefined;
  await expect
    .poll(
      async () => {
        latest = (await (await api.orders.get(orderId)).json()) as Order;
        return latest.status;
      },
      { message: `order ${orderId} should reach a terminal state`, timeout: config.orderTimeoutMs, intervals: [250] },
    )
    .toMatch(new RegExp(`^(${TERMINAL_STATUSES.join('|')})$`));
  return latest as Order;
}

/** Current available units; product responses only hold the seed amount. */
export async function availableStock(api: ApiClients, productId: string): Promise<number> {
  const inventory = (await (await api.inventory.get()).json()) as Record<string, number>;
  return inventory[productId] ?? 0;
}

export const RESET_HINT =
  'The lab has no restock endpoint. Reset its data: "npm run reset" (Node mode, lab stopped) ' +
  'or "docker compose down --volumes" followed by "docker compose up -d --wait" (Docker mode).';

/** Fails with a clear instruction when stock ran out, instead of a confusing rejected order later. */
export async function ensureStock(api: ApiClients, productId: string, quantity: number): Promise<void> {
  const available = await availableStock(api, productId);
  expect(available, `Need ${quantity} unit(s) of ${productId}, lab has ${available}. ${RESET_HINT}`).toBeGreaterThanOrEqual(quantity);
}

/**
 * Asks the backend for its authoritative total without creating an order or touching stock.
 * Checkout rejects a mismatching expectedTotal with 409 "Current total is N cents" before
 * anything is saved, so a deliberately wrong total (1 cent) reveals the server's calculation.
 */
export async function quoteServerTotal(api: ApiClients, items: CartItem[], overrides: Partial<CheckoutRequest> = {}): Promise<number> {
  await setCart(api, items);
  const response = await api.orders.place(buildCheckout(1, overrides), newIdempotencyKey());
  const body = (await response.json()) as ApiError;
  expect(response.status(), `quote: ${body.error}`).toBe(409);
  const match = /Current total is (\d+) cents/.exec(body.error);
  expect(match, `unexpected 409 message: ${body.error}`).not.toBeNull();
  return Number(match?.[1]);
}
