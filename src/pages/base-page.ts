import { expect, type Locator, type Page } from '@playwright/test';
import { AuthDialog } from './components/auth-dialog';
import { BagDialog } from './components/bag-dialog';
import { Header } from './components/header';
import { Notifications } from './components/notifications';
import { PromoBar } from './components/promo-bar';

/** What every page of the shop shares: header, promotion bar, dialogs, notifications, footer. */
export abstract class BasePage {
  readonly header: Header;
  readonly promo: PromoBar;
  readonly authDialog: AuthDialog;
  readonly bag: BagDialog;
  readonly notifications: Notifications;
  readonly main: Locator;
  readonly heading: Locator;
  readonly footer: Locator;

  constructor(readonly page: Page) {
    this.header = new Header(page);
    this.promo = new PromoBar(page);
    this.authDialog = new AuthDialog(page);
    this.bag = new BagDialog(page);
    this.notifications = new Notifications(page);
    this.main = page.locator('#main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.footer = page.locator('footer.site-footer');
  }

  /**
   * Header buttons exist in the static HTML before app.js attaches their handlers, so an early
   * click does nothing. The app shows the first promotion only after it has restored the session,
   * bag and wishlist, which makes it a reliable "ready" signal on every page.
   */
  async waitUntilReady(): Promise<void> {
    await expect(this.promo.counter).toHaveText('1/4', { timeout: 15_000 });
  }

  protected async open(hash: string): Promise<void> {
    await this.page.goto(`/${hash}`);
    await this.waitUntilReady();
  }

  footerLink(name: string): Locator {
    return this.footer.getByRole('link', { name, exact: true });
  }
}
