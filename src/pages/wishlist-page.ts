import { BasePage } from './base-page';
import { ProductGrid } from './components/product-grid';

/** Wishlist (#wishlist). */
export class WishlistPage extends BasePage {
  readonly grid = new ProductGrid(this.page.locator('#wishlist-grid'));
  readonly summary = this.main.locator('.page-head p');
  readonly emptyState = this.main.getByText('Nothing saved yet.');
  readonly discoverLink = this.main.getByRole('link', { name: 'Discover products →' });

  async goto(): Promise<void> {
    await this.open('#wishlist');
  }
}
