import { test, expect } from '@core/fixtures';
import { HomePage } from '@pages/index';

export const PROMOTIONS = [
  'Pay with a Mastercard and save 10% on every order, even on top of SAVE10.',
  'Black Friday: up to 40% off selected products →',
  'Free shipping from $150, or when every item in your bag ships free.',
  'Use code SAVE10 at checkout for 10% off.',
];

test.describe('Promotion bar', { tag: '@promo' }, () => {
  test('PROMO-001 Page loads with the first message', { tag: '@smoke' }, async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.promo.counter).toHaveText('1/4');
    expect(await home.promo.text()).toBe(PROMOTIONS[0]);
  });
});
