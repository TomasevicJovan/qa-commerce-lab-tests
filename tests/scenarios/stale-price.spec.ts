import { test, expect } from '@core/fixtures';
import { setCart } from '@core/flows/order-flow';
import { buildCheckout, newIdempotencyKey } from '@core/factories/checkout-factory';
import { calculateTotals } from '@core/pricing';
import type { Order, ProductPage } from '@api/types';

// CF-07: the list price is a display hint; checkout must use the authoritative product price.
test('checkout with a stale list price is rejected before anything is saved', { tag: ['@regression', '@api'] }, async ({ api, lab }) => {
  await lab.set({ stalePrice: true });
  const items = [{ productId: 'p5', quantity: 1 }];

  const { listPrice, detailPrice } = await test.step('list price is $1 below the detail price', async () => {
    const list = (await (await api.catalog.list({ q: 'mug' })).json()) as ProductPage;
    const detail = await (await api.catalog.get('p5')).json();
    expect(list.items[0]?.price).toBe(detail.price - 100);
    return { listPrice: list.items[0]?.price ?? 0, detailPrice: detail.price as number };
  });

  await setCart(api, items);
  const ordersBefore = ((await (await api.orders.list()).json()) as Order[]).length;

  const response = await test.step('check out with the total a stale storefront would show', () =>
    api.orders.place(buildCheckout(calculateTotals([{ unitPrice: listPrice, quantity: 1 }]).total), newIdempotencyKey()),
  );

  await test.step('409 with the authoritative total, cart kept, no order', async () => {
    const authoritative = calculateTotals([{ unitPrice: detailPrice, quantity: 1 }]).total;
    expect(response.status()).toBe(409);
    expect((await response.json()).error).toContain(`Current total is ${authoritative} cents`);
    expect(await (await api.cart.get()).json()).toEqual(items);
    expect(((await (await api.orders.list()).json()) as Order[]).length).toBe(ordersBefore);
  });
});
