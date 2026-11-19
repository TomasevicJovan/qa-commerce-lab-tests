import { BaseApi } from './base-api';

export class InventoryApi extends BaseApi {
  get() {
    return this.request.get('/api/inventory');
  }
}
