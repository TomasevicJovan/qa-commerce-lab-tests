import { test, expect } from '@core/fixtures';
import { CheckoutPage, HelpPage, HomePage, OrderPage, ProductListPage, HELP_PAGES } from '@pages/index';
import { APPROVED_CARDS, CARDS, CATALOG, CATEGORIES_TEXT, CATEGORY, HELP_TEXT, LIST_TEXT, ORDER_TEXT, PRODUCTS, WISHLIST_TEXT } from '@data/index';
import { random } from '@core/random-data';
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

      await expect(help.sideLinks).toHaveText(Object.values(HELP_PAGES));
      await expect(help.currentSideLink).toHaveText(HELP_PAGES['test-cards']);
      await expect(help.currentSideLink).toHaveCount(1);
    });

    test('HELP-003 Side menu switches pages', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto('faq');

      await help.sideLink(HELP_PAGES.returns).click();

      await expect(help.heading).toHaveText(HELP_PAGES.returns);
    });

    test('HELP-004 Unknown help page opens the FAQ', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto(random.text(8));

      await expect(help.heading).toHaveText(HELP_PAGES.faq);
    });

    test('HELP-005 Help page opens directly from a link', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);

      await page.goto('/#help/returns');

      await expect(help.heading).toHaveText(HELP_PAGES.returns);
    });

    test('HELP-006 Delivery page shows the shipping table', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto('delivery-and-payment');

      expect(await help.tableRows()).toEqual(HELP_TEXT.shippingTable);
    });

    test('HELP-007 Test cards page lists the 10 approved cards', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto('test-cards');

      expect(await help.tableRows()).toEqual(APPROVED_CARDS.map((c) => [c.brandName, c.number, HELP_TEXT.testCardResult]));
      await expect(help.code(CARDS.declined.number)).toBeVisible();
    });

    test('HELP-008 FAQ questions open and close', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto('faq');
      const first = help.faqItems.first();
      const answer = help.faqAnswer(first);
      await expect(answer).toBeHidden();

      await help.faqQuestion(first).click();
      await expect(answer).toBeVisible();

      await help.faqQuestion(first).click();
      await expect(answer).toBeHidden();
    });

    test('HELP-009 How to shop shows 5 steps with screenshots', { tag: '@regression' }, async ({ page }) => {
      const help = new HelpPage(page);
      await help.goto('how-to-shop');

      await expect(help.steps).toHaveCount(HELP_TEXT.howToShopSteps);
      await expect(help.images).toHaveCount(HELP_TEXT.howToShopSteps);
      for (const image of await help.images.all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { message: await image.getAttribute('src') ?? '' }).toBe(true);
      }
    });

    test('HELP-010 Links inside help pages work', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const help = new HelpPage(page);
      // The "My orders" link is on Complaints and returns; Delivery and payment has no links.
      await help.goto('returns');
      await help.contentLink(HELP_TEXT.footerLinks.myOrders).click();
      await expect(page).toHaveURL(/#orders$/);
      await expect(help.heading).toHaveText(ORDER_TEXT.ordersHeading);

      await help.goto('notices');
      await help.contentLink(CATEGORIES_TEXT.heading).click();
      await expect(page).toHaveURL(/#categories$/);
      await expect(help.heading).toHaveText(CATEGORIES_TEXT.heading);
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
        () => new ProductListPage(page).goto({ category: CATEGORY.pets.name }),
        () => new CheckoutPage(page).goto(),
        () => new OrderPage(page).goto(order.id),
        () => new HelpPage(page).goto('faq'),
      ];

      for (const open of pages) {
        await open();
        for (const section of HELP_TEXT.footerSections) {
          await expect(home.footerSection(section), `${page.url()}: ${section}`).toBeVisible();
        }
      }
    });

    test('HELP-021 My orders and Wishlist links open their pages', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.footerLink(HELP_TEXT.footerLinks.myOrders).click();
      await expect(home.heading).toHaveText(ORDER_TEXT.ordersHeading);

      await home.footerLink(HELP_TEXT.footerLinks.wishlist).click();
      await expect(home.heading).toHaveText(WISHLIST_TEXT.heading);
    });

    const DEALS = [
      { link: HELP_TEXT.footerLinks.blackFriday, heading: LIST_TEXT.blackFridayHeading, count: LIST_TEXT.resultCount(CATALOG.blackFridayDeals) },
      { link: HELP_TEXT.footerLinks.freeShipping, heading: LIST_TEXT.freeShippingHeading, count: LIST_TEXT.resultCount(CATALOG.freeShippingProducts) },
      { link: HELP_TEXT.footerLinks.mostPopular, heading: LIST_TEXT.allProducts, count: LIST_TEXT.resultCount(CATALOG.totalProducts), sort: LIST_TEXT.sort.popular },
      { link: HELP_TEXT.footerLinks.allCategories, heading: CATEGORIES_TEXT.heading },
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
        if (sort) await expect(list.selectedSort).toHaveText(sort);
      });
    }

    test('HELP-023 QA laboratory link opens the lab', { tag: '@regression' }, async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.footerLink(HELP_TEXT.footerLinks.lab).click();

      await expect(page).toHaveURL(/#lab$/);
      await expect(home.heading).toHaveText(HELP_TEXT.labHeading);
    });

    test('HELP-024 API specification opens in a new tab', { tag: '@regression' }, async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      const [tab] = await Promise.all([page.context().waitForEvent('page'), home.footerLink(HELP_TEXT.footerLinks.apiSpecification).click()]);

      await tab.waitForLoadState();
      expect(new URL(tab.url()).pathname).toBe('/api/openapi.json');
      await tab.close();
    });
  });
});
