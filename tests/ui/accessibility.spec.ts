import { test, expect } from '@core/fixtures';
import { expectNoSeriousViolations, scanAccessibility } from '@core/a11y';
import { KNOWN_ISSUES } from '@core/known-issues';
import { ShopPage } from '@pages/index';

test.describe('Accessibility (axe-core, WCAG 2.1 A/AA)', () => {
  test('product collection has no serious or critical violations', { tag: ['@regression', '@a11y'] }, async ({ page }, testInfo) => {
    const shop = new ShopPage(page);
    await shop.goto();

    const results = await test.step('scan the collection page', () =>
      scanAccessibility(page, testInfo, {
        knownViolations: [
          // Secondary text (#707a71 on #f7f8f2) is 4.17:1, below the 4.5:1 AA minimum, on many elements.
          { rule: 'color-contrast', issue: KNOWN_ISSUES.mutedTextContrast },
          // Visible "Bag 0" vs accessible name "Open shopping bag" (WCAG 2.5.3 Label in Name).
          { rule: 'label-content-name-mismatch', issue: KNOWN_ISSUES.bagButtonLabelMismatch, targets: ['#cart-open'] },
        ],
      }),
    );

    expectNoSeriousViolations(results);
  });

  test('checkout dialog has no serious or critical violations', { tag: ['@regression', '@a11y'] }, async ({ signedInPage: page, api }, testInfo) => {
    const shop = new ShopPage(page);
    await api.cart.replace([{ productId: 'p8', quantity: 1 }]);
    await shop.goto();

    await test.step('open checkout', async () => {
      await shop.header.openBag();
      await shop.bag.continueToCheckout();
      await expect(shop.checkout.title).toHaveText('A few final details');
    });

    const results = await test.step('scan the open dialog', () => scanAccessibility(page, testInfo, { include: '#dialog' }));

    expectNoSeriousViolations(results);
  });
});
