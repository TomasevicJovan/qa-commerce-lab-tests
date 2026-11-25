import { expect, type Locator } from '@playwright/test';
import { BasePage } from './base-page';
import { ProductGrid } from './components/product-grid';

export type ShelfId = 'black-friday' | 'popular' | 'free-shipping' | 'workspace';

/** Home page with four product rows (carousels). */
export class HomePage extends BasePage {
  readonly shelves = this.main.locator('section.shelf');
  readonly shelfTitles = this.shelves.locator('h2');
  readonly shelfSubtitles = this.shelves.locator('.shelf-head p');

  async goto(): Promise<void> {
    await this.open('#home');
  }

  shelf(id: ShelfId): Locator {
    return this.main.locator(`[data-shelf="${id}"]`);
  }

  products(id: ShelfId): ProductGrid {
    return new ProductGrid(this.page.locator(`#carousel-${id}`));
  }

  /** "1-4 of 12" */
  position(id: ShelfId): Locator {
    return this.page.locator(`#carousel-${id}`);
  }

  /** Waits until the row shows the given position, e.g. "5-8 of 12", or matches a pattern. */
  async expectPosition(id: ShelfId, position: string | RegExp): Promise<void> {
    await expect(this.position(id)).toHaveAttribute('data-position', position);
  }

  /** Clicks › and waits until the row has moved. */
  async moveNext(id: ShelfId): Promise<void> {
    const before = await this.position(id).getAttribute('data-position');
    await this.next(id).click();
    await expect(this.position(id)).not.toHaveAttribute('data-position', before ?? '');
  }

  next(id: ShelfId): Locator {
    return this.page.locator(`[data-carousel-next="${id}"]`);
  }

  previous(id: ShelfId): Locator {
    return this.page.locator(`[data-carousel-prev="${id}"]`);
  }

  seeAll(id: ShelfId): Locator {
    return this.shelf(id).getByRole('link', { name: 'See all →' });
  }
}
