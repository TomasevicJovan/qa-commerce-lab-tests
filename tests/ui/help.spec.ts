import { test, expect } from '@core/fixtures';
import { HelpPage, HomePage, HELP_PAGES } from '@pages/index';

test.describe('Help pages and footer', { tag: '@help' }, () => {
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
});
