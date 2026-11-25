import { HELP_PAGES } from '@data/messages';
import type { Locator } from '@playwright/test';
import { BasePage } from './base-page';

export { HELP_PAGES };

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

  readonly sideLinks = this.sideMenu.getByRole('link');
  readonly currentSideLink = this.sideMenu.locator('[aria-current="page"]');
  readonly steps = this.content.locator('ol.steps > li');

  /** Cell texts of the table on the page, row by row. */
  tableRows(): Promise<(string | undefined)[][]> {
    return this.content
      .locator('table.help-table tbody tr')
      .evaluateAll((rows) => rows.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim())));
  }

  /** Inline code text, e.g. the declined test card number. */
  code(text: string): Locator {
    return this.content.locator('code', { hasText: text });
  }

  faqQuestion(item: Locator): Locator {
    return item.locator('summary');
  }

  faqAnswer(item: Locator): Locator {
    return item.locator('p');
  }

  contentLink(name: string): Locator {
    return this.content.getByRole('link', { name });
  }

  sideLink(title: string): Locator {
    return this.sideMenu.getByRole('link', { name: title, exact: true });
  }
}
