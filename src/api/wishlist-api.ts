import { BaseApi } from './base-api';

export class WishlistApi extends BaseApi {
  get() {
    return this.request.get('/api/wishlist', { headers: this.headers() });
  }

  add(productId: string) {
    return this.request.put(`/api/wishlist/${encodeURIComponent(productId)}`, { headers: this.headers() });
  }

  remove(productId: string) {
    return this.request.delete(`/api/wishlist/${encodeURIComponent(productId)}`, { headers: this.headers() });
  }
}
