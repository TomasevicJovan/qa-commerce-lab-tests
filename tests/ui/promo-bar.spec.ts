import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { CheckoutPage, HelpPage, HomePage, OrdersPage, ProductListPage } from '@pages/index';
import { CATEGORY, HOME_TEXT, LIST_TEXT, PRODUCTS, PROMOTIONS, STOREFRONT_TIMING } from '@data/index';

const ROTATION = STOREFRONT_TIMING.promoRotationMs;
import { setCart } from '@core/flows/order-flow';

/** Home page with a controlled clock, so the 5-second rotation is tested without real waiting. */
async function openWithClock(page: Page): Promise<HomePage> {
  const home = new HomePage(page);
  await page.clock.install();
  await home.goto();
  await expect(home.promo.counter).toHaveText(HOME_TEXT.promoCounter(1));
  return home;
}

/** Stops the rotation with Pause and moves the pointer away, so only clicks change the message. */
async function pauseRotation(home: HomePage, page: Page): Promise<void> {
  await home.promo.pause.click();
  await expect(home.promo.pause).toHaveText(HOME_TEXT.promoPlay);
  await page.mouse.move(0, 400);
}

async function expectMessage(home: HomePage, index: number): Promise<void> {
  await expect(home.promo.counter).toHaveText(HOME_TEXT.promoCounter(index + 1));
  expect(await home.promo.text()).toBe(PROMOTIONS[index]);
}

test.describe('Promotion bar', { tag: '@promo' }, () => {
  test('PROMO-001 Page loads with the first message', { tag: '@smoke' }, async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.promo.counter).toHaveText(HOME_TEXT.promoCounter(1));
    expect(await home.promo.text()).toBe(PROMOTIONS[0]);
  });

  for (const [index, message] of PROMOTIONS.entries()) {
    test(`PROMO-002 Each message has the exact text: ${index + 1}/4`, { tag: '@regression' }, async ({ page }) => {
      const home = await openWithClock(page);
      await pauseRotation(home, page);

      for (let i = 0; i < index; i++) await home.promo.next.click();

      await expect(home.promo.counter).toHaveText(HOME_TEXT.promoCounter(index + 1));
      expect(await home.promo.text()).toBe(message);
    });
  }

  test('PROMO-003 Next arrow shows the next message', { tag: '@regression' }, async ({ page }) => {
    const home = await openWithClock(page);
    await pauseRotation(home, page);

    await home.promo.next.click();

    await expectMessage(home, 1);
  });

  test('PROMO-004 Previous arrow shows the previous message', { tag: '@regression' }, async ({ page }) => {
    const home = await openWithClock(page);
    await pauseRotation(home, page);
    await home.promo.next.click();
    await home.promo.next.click();
    await expectMessage(home, 2);

    await home.promo.previous.click();

    await expectMessage(home, 1);
  });

  test('PROMO-005 Arrows wrap around at both ends', { tag: '@regression' }, async ({ page }) => {
    const home = await openWithClock(page);
    await pauseRotation(home, page);
    for (let i = 0; i < 3; i++) await home.promo.next.click();
    await expectMessage(home, 3);

    await home.promo.next.click();
    await expectMessage(home, 0);

    await home.promo.previous.click();
    await expectMessage(home, 3);
  });

  test('PROMO-006 Messages change automatically every 5 seconds', { tag: '@regression' }, async ({ page }) => {
    const home = await openWithClock(page);
    await page.mouse.move(0, 400);

    // The timer started at page load, so first find the moment of the first change...
    for (let waited = 0; (await home.promo.counter.textContent()) === HOME_TEXT.promoCounter(1); waited += 100) {
      expect(waited, 'first change within one rotation').toBeLessThanOrEqual(ROTATION);
      await page.clock.runFor(100);
    }
    await expectMessage(home, 1);

    // ...then the next change must come 5 seconds later, not earlier.
    await page.clock.runFor(ROTATION - 200);
    await expectMessage(home, 1);
    await page.clock.runFor(300);
    await expectMessage(home, 2);
  });

  test('PROMO-007 Hovering the bar stops the rotation', { tag: '@regression' }, async ({ page }) => {
    const home = await openWithClock(page);

    await home.promo.root.hover();
    await page.clock.runFor(ROTATION + 2_000);
    await expectMessage(home, 0);

    await page.mouse.move(0, 400);
    await page.clock.runFor(ROTATION); // any window of one rotation holds exactly one tick of the timer
    await expectMessage(home, 1);
  });

  test('PROMO-008 Pause stops the rotation and Play resumes it', { tag: '@regression' }, async ({ page }) => {
    const home = await openWithClock(page);

    await home.promo.pause.click();
    await page.mouse.move(0, 400);
    await page.clock.runFor(ROTATION + 2_000);
    await expect(home.promo.pause).toHaveText(HOME_TEXT.promoPlay);
    await expectMessage(home, 0);

    await home.promo.pause.click();
    await page.mouse.move(0, 400);
    await home.promo.pause.blur();
    await page.clock.runFor(ROTATION); // any window of one rotation holds exactly one tick of the timer
    await expect(home.promo.pause).toHaveText(HOME_TEXT.promoPause);
    await expectMessage(home, 1);
  });

  test('PROMO-009 Black Friday message opens the deals page', { tag: '@regression' }, async ({ page }) => {
    const home = await openWithClock(page);
    const list = new ProductListPage(page);
    await pauseRotation(home, page);
    await home.promo.next.click();
    await expectMessage(home, 1);

    await home.promo.message.getByRole('link').click();

    await expect(page).toHaveURL(/#shop\?deal=black-friday$/);
    await expect(list.heading).toHaveText(LIST_TEXT.blackFridayHeading);
  });

  test('PROMO-010 Bar is shown on every page', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
    await setCart(api, [{ productId: PRODUCTS.stillMug.id, quantity: 1 }]);
    const pages = [
      () => new HomePage(page).goto(),
      () => new ProductListPage(page).goto({ category: CATEGORY.pets.name }),
      () => new CheckoutPage(page).goto(),
      () => new HelpPage(page).goto('delivery-and-payment'),
      () => new OrdersPage(page).goto(),
    ];

    for (const open of pages) {
      await open();
      const home = new HomePage(page);
      await expect(home.promo.root).toBeVisible();
      await expect(home.promo.counter).toHaveText(/^[1-4]\/4$/);
      expect((await home.promo.text()).length).toBeGreaterThan(10);
    }
  });
});
