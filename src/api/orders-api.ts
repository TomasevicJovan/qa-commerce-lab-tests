import { BaseApi } from './base-api';
import type { CheckoutRequest } from './types';

export class OrdersApi extends BaseApi {
  list() {
    return this.request.get('/api/orders', { headers: this.headers() });
  }

  get(orderId: string) {
    return this.request.get(`/api/orders/${encodeURIComponent(orderId)}`, { headers: this.headers() });
  }

  /**
   * The body is serialized here, once, because the lab fingerprints the exact JSON string.
   * Replaying the same object therefore produces the same fingerprint.
   */
  place(body: CheckoutRequest | Record<string, unknown>, idempotencyKey?: string) {
    return this.request.post('/api/orders', {
      headers: this.headers({
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      }),
      data: JSON.stringify(body),
    });
  }
}
