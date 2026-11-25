import type { Locator } from '@playwright/test';
import { BasePage } from './base-page';
import { ProductGrid } from './components/product-grid';

export type ShelfId = 'black-friday' | 'popular' | 'free-shipping' | 'workspace';

/** Home page with four product rows (carousels). */
export class HomePage extends BasePage {
  readonly shelves = this.main.locator('section.shelf');

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
