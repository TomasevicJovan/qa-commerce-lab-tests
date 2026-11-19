import { BaseApi } from './base-api';
import type { CartItem } from './types';

export class CartApi extends BaseApi {
  get() {
    return this.request.get('/api/cart', { headers: this.headers() });
  }

  /** Replaces the whole cart. Typed loosely on purpose so tests can send invalid payloads. */
  replace(items: CartItem[] | unknown) {
    return this.request.put('/api/cart', { headers: this.headers(), data: { items } });
  }

  clear() {
    return this.replace([]);
  }
}
