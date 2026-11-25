import type { Locator } from '@playwright/test';
import { BasePage } from './base-page';

/** All categories page (#categories). */
export class CategoriesPage extends BasePage {
  readonly cards = this.main.locator('section.category-card');
  readonly breadcrumb = this.main.getByRole('navigation', { name: 'Breadcrumb' });

  async goto(): Promise<void> {
    await this.open('#categories');
  }

  card(category: string): Locator {
    return this.cards.filter({ has: this.page.getByRole('heading', { name: category, exact: true }) });
  }

  /** "Audio 4", "Gaming 4", ... for one card. */
  cardTitle(category: string): Locator {
    return this.card(category).getByRole('heading', { level: 2 });
  }

  cardCount(category: string): Locator {
    return this.card(category).locator('.count');
  }

  cardIcon(category: string): Locator {
    return this.card(category).locator('.category-icon');
  }

  /** A link inside a card: the category name, a subcategory, or "Shop all …". */
  cardLink(category: string, name: string): Locator {
    return this.card(category).getByRole('link', { name, exact: true });
  }

  async subcategoryEntries(category: string): Promise<string[]> {
    return (await this.card(category).locator('li').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
  }
}
