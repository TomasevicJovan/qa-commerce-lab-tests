import { test, expect } from '@core/fixtures';
import { CheckoutPage } from '@pages/index';
import { DEMO_CARDS, DEMO_NAME, PRODUCTS } from '@core/test-data';
import { setCart } from '@core/flows/order-flow';

const label = (c: { brand: string; last4: string; expMonth: number; expYear: number; expired: boolean }) =>
  `${{ visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' }[c.brand]}•••• ${c.last4} ${DEMO_NAME} · expires ${String(c.expMonth).padStart(2, '0')}/${String(c.expYear).slice(-2)}${c.expired ? ' · Expired' : ''}`;

test.describe('Saved cards', { tag: '@saved-cards' }, () => {
  test('CARD-001 Demo account shows its 4 saved cards', { tag: '@smoke' }, async ({ demoPage: page, demoApi }) => {
    const checkout = new CheckoutPage(page);
    await setCart(demoApi, [{ productId: PRODUCTS.stillMug.id, quantity: 1 }]);

    await checkout.goto();

    await expect(checkout.savedCards).toHaveCount(4);
    for (const card of Object.values(DEMO_CARDS)) {
      await expect(checkout.savedCard(card.last4).locator('label')).toHaveText(new RegExp(`^${label(card).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    }
  });
});
