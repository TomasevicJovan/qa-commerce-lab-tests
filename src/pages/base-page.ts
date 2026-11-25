import { expect, type Locator, type Page } from '@playwright/test';
import { HOME_TEXT } from '@data/messages';
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
  /** Buttons on pages that ask a signed-out visitor to sign in (orders, wishlist, checkout, an order). */
  readonly signedOutSignIn: Locator;
  readonly signedOutCreateAccount: Locator;
  /** The centred message a page shows when there is nothing to show or the visitor must sign in first. */
  readonly emptyMessage: Locator;
  readonly emptyMessageHeading: Locator;
  readonly emptyMessageLink: Locator;

  constructor(readonly page: Page) {
    this.header = new Header(page);
    this.promo = new PromoBar(page);
    this.authDialog = new AuthDialog(page);
    this.bag = new BagDialog(page);
    this.notifications = new Notifications(page);
    this.main = page.locator('#main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.footer = page.locator('footer.site-footer');
    this.signedOutSignIn = this.main.getByRole('button', { name: 'Sign in' });
    this.signedOutCreateAccount = this.main.getByRole('button', { name: 'Create account' });
    this.emptyMessage = this.main.locator('.empty');
    this.emptyMessageHeading = this.emptyMessage.locator('h2');
    this.emptyMessageLink = this.emptyMessage.getByRole('link');
  }

  /**
   * Header buttons exist in the static HTML before app.js attaches their handlers, so an early
   * click does nothing. The app shows the first promotion only after it has restored the session,
   * bag and wishlist, which makes it a reliable "ready" signal on every page.
   */
  async waitUntilReady(): Promise<void> {
    await expect(this.promo.counter).toHaveText(HOME_TEXT.promoCounter(1), { timeout: 15_000 });
  }

  protected async open(hash: string): Promise<void> {
    await this.page.goto(`/${hash}`);
    await this.waitUntilReady();
  }

  footerSection(name: string): Locator {
    return this.footer.getByRole('heading', { name });
  }

  footerLink(name: string): Locator {
    return this.footer.getByRole('link', { name, exact: true });
  }
}
