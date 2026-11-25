import { BaseApi } from './base-api';
import type { NewCard } from './types';

/** Saved cards. The lab never returns full card numbers or security codes. */
export class CardsApi extends BaseApi {
  list() {
    return this.request.get('/api/cards', { headers: this.headers() });
  }

  /** Typed loosely on purpose so tests can send invalid cards. */
  save(card: NewCard | Record<string, unknown>) {
    return this.request.post('/api/cards', { headers: this.headers(), data: card });
  }

  remove(cardId: string) {
    return this.request.delete(`/api/cards/${encodeURIComponent(cardId)}`, { headers: this.headers() });
  }
}
