import type { Locator } from '@playwright/test';
import { BasePage } from './base-page';

export const HELP_PAGES = {
  notices: 'Platform notices',
  'delivery-and-payment': 'Delivery and payment methods',
  'test-cards': 'Test cards',
  returns: 'Complaints and returns',
  faq: 'Frequently asked questions',
  'how-to-shop': 'How to shop online',
} as const;

export type HelpSlug = keyof typeof HELP_PAGES;

/** Shopping help pages (#help/<slug>). */
export class HelpPage extends BasePage {
  readonly sideMenu = this.main.getByRole('navigation', { name: 'Help pages' });
  readonly content = this.main.locator('article.help-content');
  readonly faqItems = this.content.locator('details.faq');
  readonly images = this.content.locator('figure img');

  async goto(slug: string): Promise<void> {
    await this.open(`#help/${slug}`);
  }

  sideLink(title: string): Locator {
    return this.sideMenu.getByRole('link', { name: title, exact: true });
  }
}
