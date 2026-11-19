import { BaseApi } from './base-api';
import type { LabConfig } from './types';

/** Local QA controls. They are global and unauthenticated by design. */
export class LabApi extends BaseApi {
  status() {
    return this.request.get('/api/lab/status');
  }

  getConfig() {
    return this.request.get('/api/lab/config');
  }

  patchConfig(patch: Partial<LabConfig> | Record<string, unknown>) {
    return this.request.post('/api/lab/config', { data: patch });
  }

  restoreDefaults() {
    return this.request.post('/api/lab/defaults', { data: {} });
  }

  events() {
    return this.request.get('/api/lab/events');
  }
}
