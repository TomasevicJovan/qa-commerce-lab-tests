import { BaseApi } from './base-api';
import type { ProductQuery } from './types';

export class CatalogApi extends BaseApi {
  list(query: ProductQuery = {}) {
    const params = Object.fromEntries(
      Object.entries(query)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)]),
    );
    return this.request.get('/api/products', { params });
  }

  get(productId: string) {
    return this.request.get(`/api/products/${encodeURIComponent(productId)}`);
  }

  /** Category tree with product counts. */
  categories() {
    return this.request.get('/api/products/categories');
  }
}
