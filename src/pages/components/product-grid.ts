import type { Locator } from '@playwright/test';

/**
 * Product cards inside a container (a list, a home row, the wishlist).
 * Cards are found by their accessible name (product name), which works in both
 * stable and dynamic locator modes; test ids are deliberately not relied on.
 */
export class ProductGrid {
  readonly cards: Locator;
  readonly names: Locator;

  constructor(readonly root: Locator) {
    this.cards = root.getByRole('article');
    this.names = this.cards.getByRole('heading', { level: 3 });
  }

  card(name: string): Locator {
    return this.cards.filter({ has: this.root.page().getByRole('heading', { name, exact: true }) });
  }

  addToBagButton(name: string): Locator {
    // Every card has an identical "Add to bag +" button, so it must be scoped to its card.
    return this.card(name).getByRole('button', { name: 'Add to bag +', exact: true });
  }

  heart(name: string): Locator {
    return this.card(name).getByRole('button', { name: new RegExp(`(Add|Remove) ${escape(name)} (to|from) wishlist`) });
  }

  price(name: string): Locator {
    return this.card(name).locator('.price');
  }

  comparePrice(name: string): Locator {
    return this.card(name).locator('.compare-price');
  }

  dealBadge(name: string): Locator {
    return this.card(name).locator('.product-tag.deal');
  }

  subcategoryLink(name: string): Locator {
    return this.card(name).locator('a.category');
  }

  stock(name: string): Locator {
    return this.card(name).locator('.product-bottom > span');
  }

  async addToBag(name: string): Promise<void> {
    await this.addToBagButton(name).click();
  }

  async productNames(): Promise<string[]> {
    return (await this.names.allTextContents()).map((t) => t.trim());
  }

  /** Prices in cents, in card order. */
  async prices(): Promise<number[]> {
    return (await this.cards.locator('.price').allTextContents()).map((t) => Math.round(Number(t.replace(/[^0-9.]/g, '')) * 100));
  }
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
