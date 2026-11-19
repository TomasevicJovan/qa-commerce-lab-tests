import { expect } from '@playwright/test';
import type { ApiClients } from '@api/index';
import { TERMINAL_STATUSES, type CartItem, type CheckoutRequest, type Order, type Product } from '@api/types';
import { config } from '@core/config';
import { calculateTotals } from '@core/pricing';
import { buildCheckout, newIdempotencyKey } from '@core/factories/checkout-factory';

/** Reads authoritative prices from product detail (list prices can be stale on purpose). */
export async function authoritativeLines(api: ApiClients, items: CartItem[]) {
  return Promise.all(
    items.map(async (item) => {
      const response = await api.catalog.get(item.productId);
      expect(response.status(), `product ${item.productId}`).toBe(200);
      const product = (await response.json()) as Product;
      return { ...item, unitPrice: product.price };
    }),
  );
}

export async function setCart(api: ApiClients, items: CartItem[]): Promise<void> {
  const response = await api.cart.replace(items);
  expect(response.status(), `set cart: ${await response.text()}`).toBe(200);
}

export interface PlacedOrder {
  order: Order;
  body: CheckoutRequest;
  idempotencyKey: string;
  status: number;
}

/**
 * Builds the cart, computes the expected total with the test oracle and places the order.
 * Returns the exact body and key so tests can replay them for idempotency checks.
 */
export async function placeOrder(
  api: ApiClients,
  items: CartItem[],
  overrides: Partial<CheckoutRequest> = {},
): Promise<PlacedOrder> {
  await setCart(api, items);
  const lines = await authoritativeLines(api, items);
  const { total } = calculateTotals(lines, overrides.coupon ?? '');
  const body = buildCheckout(total, overrides);
  const idempotencyKey = newIdempotencyKey();

  const response = await api.orders.place(body, idempotencyKey);
  expect(response.status(), `place order: ${await response.text()}`).toBe(202);
  return { order: (await response.json()) as Order, body, idempotencyKey, status: response.status() };
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
