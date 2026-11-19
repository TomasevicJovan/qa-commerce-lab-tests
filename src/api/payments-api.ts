import { BaseApi } from './base-api';

export class PaymentsApi extends BaseApi {
  get(orderId: string) {
    return this.request.get(`/api/payments/${encodeURIComponent(orderId)}`, { headers: this.headers() });
  }
}
