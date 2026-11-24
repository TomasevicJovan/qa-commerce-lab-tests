import { test, expect } from '@core/fixtures';
import { CheckoutPage, HelpPage, HomePage, OrderPage, ProductListPage, HELP_PAGES } from '@pages/index';
import { APPROVED_CARDS, CATALOG, PRODUCTS } from '@core/test-data';
import { placeOrder, setCart } from '@core/flows/order-flow';
import { pay } from '@core/factories/checkout-factory';

test.describe('Help pages and footer', { tag: '@help' }, () => {
  test.describe('help pages', () => {
    for (const [slug, title] of Object.entries(HELP_PAGES)) {
      test(`HELP-001 Each Shopping link opens its help page: ${title}`, { tag: '@smoke' }, async ({ page }) => {
        const home = new HomePage(page);
        const help = new HelpPage(page);
        await home.goto();

        await home.footerLink(title).click();

        await expect(page).toHaveURL(new RegExp(`#help/${slug}$`));
        await expect(help.heading).toHaveText(title);
      });
    }

    test('HELP-002 Side menu lists all help pages and highlights the current one', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto('test-cards');

      await expect(help.sideMenu.getByRole('link')).toHaveText(Object.values(HELP_PAGES));
      await expect(help.sideLink('Test cards')).toHaveAttribute('aria-current', 'page');
      await expect(help.sideMenu.locator('[aria-current="page"]')).toHaveCount(1);
    });

    test('HELP-003 Side menu switches pages', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto('faq');

      await help.sideLink('Complaints and returns').click();

      await expect(help.heading).toHaveText('Complaints and returns');
    });

    test('HELP-004 Unknown help page opens the FAQ', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto('unknown');

      await expect(help.heading).toHaveText('Frequently asked questions');
    });

    test('HELP-005 Help page opens directly from a link', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);

      await page.goto('/#help/returns');

      await expect(help.heading).toHaveText('Complaints and returns');
    });

    test('HELP-006 Delivery page shows the shipping table', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto('delivery-and-payment');

      const rows = help.content.locator('table.help-table tbody tr');
      await expect(rows).toHaveCount(3);
      const cells = await rows.evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim())));
      expect(cells).toEqual([
        ['Total after discounts is $150.00 or more', 'Free'],
        ['Every product in the bag is marked “Free shipping”', 'Free'],
        ['Anything else', '$7.00 flat'],
      ]);
    });

    test('HELP-007 Test cards page lists the 10 approved cards', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto('test-cards');

      const rows = help.content.locator('table.help-table tbody tr');
      const cells = await rows.evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim())));
      expect(cells).toEqual(APPROVED_CARDS.map((c) => [c.brandName, c.number, 'Payment approved']));
      await expect(help.content.locator('code', { hasText: '4000 0000 0000 0002' })).toBeVisible();
    });

    test('HELP-008 FAQ questions open and close', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto('faq');
      const first = help.faqItems.first();
      const answer = first.locator('p');
      await expect(answer).toBeHidden();

      await first.locator('summary').click();
      await expect(answer).toBeVisible();

      await first.locator('summary').click();
      await expect(answer).toBeHidden();
    });

    test('HELP-009 How to shop shows 5 steps with screenshots', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto('how-to-shop');

      await expect(help.content.locator('ol.steps > li')).toHaveCount(5);
      await expect(help.images).toHaveCount(5);
      for (const image of await help.images.all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { message: await image.getAttribute('src') ?? '' }).toBe(true);
      }
    });

    test('HELP-010 Links inside help pages work', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const help = new HelpPage(page);
      // The "My orders" link is on Complaints and returns; Delivery and payment has no links.
      await help.goto('returns');
      await help.content.getByRole('link', { name: 'My orders' }).click();
      await expect(page).toHaveURL(/#orders$/);
      await expect(help.heading).toHaveText('Your orders.');

      await help.goto('notices');
      await help.content.getByRole('link', { name: 'All categories' }).click();
      await expect(page).toHaveURL(/#categories$/);
      await expect(help.heading).toHaveText('All categories');
    });
  });

  test.describe('footer', () => {
    test('HELP-020 Footer is shown on every page', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
      await setCart(api, [{ productId: PRODUCTS.pureToothbrush.id, quantity: 1 }]);
      const { order } = await placeOrder(api, [{ productId: PRODUCTS.pureToothbrush.id, quantity: 1 }], pay.wallet());
      await setCart(api, [{ productId: PRODUCTS.stillMug.id, quantity: 1 }]);
      const home = new HomePage(page);
      const pages = [
        () => home.goto(),
        () => new ProductListPage(page).goto({ category: 'Pets' }),
        () => new CheckoutPage(page).goto(),
        () => new OrderPage(page).goto(order.id),
        () => new HelpPage(page).goto('faq'),
      ];

      for (const open of pages) {
        await open();
        for (const section of ['Shopping', 'Your account', 'Deals']) {
          await expect(home.footer.getByRole('heading', { name: section }), `${page.url()}: ${section}`).toBeVisible();
        }
      }
    });

    test('HELP-021 My orders and Wishlist links open their pages', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.footerLink('My orders').click();
      await expect(home.heading).toHaveText('Your orders.');

      await home.footerLink('Wishlist').click();
      await expect(home.heading).toHaveText('Your wishlist.');
    });

    const DEALS = [
      { link: 'Black Friday', heading: 'Black Friday deals', count: `${CATALOG.blackFridayDeals} products` },
      { link: 'Free shipping', heading: 'Free shipping', count: `${CATALOG.freeShippingProducts} products` },
      { link: 'Most popular', heading: 'All products', count: `${CATALOG.totalProducts} products`, sort: 'Most popular' },
      { link: 'All categories', heading: 'All categories' },
    ];
    for (const { link, heading, count, sort } of DEALS) {
      test(`HELP-022 Deals links open the correct lists: ${link}`, { tag: '@regression' }, async ({ page }) => {
        const home = new HomePage(page);
        const list = new ProductListPage(page);
        await home.goto();

        await home.footerLink(link).click();

        await expect(list.heading).toHaveText(heading);
        if (count) {
          await list.waitForProducts();
          await expect(list.resultCount).toHaveText(count);
        }
        if (sort) await expect(list.sortSelect.locator('option:checked')).toHaveText(sort);
      });
    }

    test('HELP-023 QA laboratory link opens the lab', { tag: '@regression' }, async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.footerLink('QA laboratory').click();

      await expect(page).toHaveURL(/#lab$/);
      await expect(home.heading).toHaveText('Curiosity, in control.');
    });

    test('HELP-024 API specification opens in a new tab', { tag: '@regression' }, async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      const [tab] = await Promise.all([page.context().waitForEvent('page'), home.footerLink('API specification').click()]);

      await tab.waitForLoadState();
      expect(new URL(tab.url()).pathname).toBe('/api/openapi.json');
      await tab.close();
    });
  });
});
