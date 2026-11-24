import { expect, type Locator } from '@playwright/test';
import { BasePage } from './base-page';
import { ProductGrid } from './components/product-grid';

export type SortOption = 'Featured' | 'Most popular' | 'Price: low to high' | 'Price: high to low';

/** Product list (#shop?...): search results, categories, deals, free shipping, all products. */
export class ProductListPage extends BasePage {
  readonly breadcrumb = this.main.getByRole('navigation', { name: 'Breadcrumb' });
  readonly resultCount = this.page.locator('#result-count');
  readonly sortSelect = this.page.getByLabel('Sort products');
  readonly activeFilters = this.main.getByLabel('Active filters');
  readonly clearAll = this.main.getByRole('link', { name: 'Clear all' });
  readonly subcategoryChips = this.main.locator('nav.subcategory-chips a');
  readonly grid = new ProductGrid(this.page.locator('#products'));
  readonly emptyState = this.page.locator('#products').getByText('No products found. Try another search or category.');
  readonly pageIndicator = this.page.locator('#page-indicator');
  readonly nextPage = this.page.locator('#next');
  readonly previousPage = this.page.locator('#prev');

  /** Opens a list by its URL parameters, e.g. { category: 'Pets' }. */
  async goto(params: Record<string, string | number> = {}): Promise<void> {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    await this.open(`#shop${query ? `?${query}` : ''}`);
    await this.waitForProducts();
  }

  /** Products (or the empty state) are rendered; the generous timeout covers the lab's render delay. */
  async waitForProducts(): Promise<void> {
    await expect(this.grid.cards.first().or(this.emptyState)).toBeVisible({ timeout: 15_000 });
    await expect(this.page.locator('#products')).not.toHaveAttribute('aria-busy', 'true');
  }

  filterChip(label: string): Locator {
    return this.activeFilters.getByRole('link', { name: `Remove filter ${label}` });
  }

  subcategoryChip(name: string): Locator {
    return this.subcategoryChips.filter({ hasText: new RegExp(`^${name.replace(/[&]/g, '\\$&')}( \\d+)?$`) });
  }

  async sortBy(option: SortOption): Promise<void> {
    await this.sortSelect.selectOption({ label: option });
    await this.waitForProducts();
  }

  /** Breadcrumb as text, e.g. "Home › All categories › Pets › Cats". */
  async breadcrumbText(): Promise<string> {
    return ((await this.breadcrumb.textContent()) ?? '').replace(/\s+/g, ' ').trim();
  }

  /** Names of all products across every page, following Next until the last page. */
  async allProductNames(): Promise<string[]> {
    const names: string[] = [...(await this.grid.productNames())];
    while ((await this.nextPage.count()) && !(await this.nextPage.getAttribute('aria-disabled'))) {
      const indicator = await this.pageIndicator.textContent();
      await this.nextPage.click();
      await expect(this.pageIndicator).not.toHaveText(indicator ?? '');
      await this.waitForProducts();
      names.push(...(await this.grid.productNames()));
    }
    return names;
  }
}
