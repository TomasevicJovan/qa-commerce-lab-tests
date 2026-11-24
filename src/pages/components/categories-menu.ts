import type { Locator, Page } from '@playwright/test';

/** "All categories" mega menu: categories on the left, subcategories of the active one on the right. */
export class CategoriesMenu {
  readonly toggle: Locator;
  readonly root: Locator;
  readonly categoryLinks: Locator;
  readonly panel: Locator;
  readonly allCategoriesLink: Locator;

  constructor(private readonly page: Page) {
    this.toggle = page.getByRole('button', { name: /All categories/ });
    this.root = page.locator('#categories-menu');
    this.categoryLinks = this.root.locator('[data-top]');
    this.panel = this.root.locator('#mega-panel');
    this.allCategoriesLink = this.root.getByRole('link', { name: 'All categories →' });
  }

  async open(): Promise<void> {
    await this.toggle.click();
  }

  category(name: string): Locator {
    return this.root.locator(`[data-top="${name}"]`);
  }

  subcategory(name: string): Locator {
    return this.panel.getByRole('link', { name: new RegExp(`^${escapeRegExp(name)} \\d+$`) });
  }

  shopAll(category: string): Locator {
    return this.panel.getByRole('link', { name: `Shop all ${category} →` });
  }

  /** Subcategory names with counts shown in the panel, e.g. ["Audio 4", "Gaming 4"]. */
  async panelEntries(): Promise<string[]> {
    return (await this.panel.locator('ul a').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
  }

  /** Categories with counts on the left, e.g. ["Electronics 20", ...]. */
  async categoryEntries(): Promise<string[]> {
    return (await this.categoryLinks.allTextContents()).map((t) => t.replace(/\s*›\s*$/, '').replace(/\s+/g, ' ').trim());
  }

  async openCategory(name: string): Promise<void> {
    await this.open();
    await this.category(name).click();
  }

  async openSubcategory(category: string, subcategory: string): Promise<void> {
    await this.open();
    await this.category(category).hover();
    await this.subcategory(subcategory).click();
  }
}

export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
