import type { APIRequestContext } from '@playwright/test';

/**
 * Thin wrapper around Playwright's request context.
 * Clients return the raw APIResponse so tests can assert status codes,
 * headers and bodies for both happy and negative paths.
 */
export abstract class BaseApi {
  constructor(
    protected readonly request: APIRequestContext,
    protected readonly token?: string,
  ) {}

  protected headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...extra,
    };
  }
}
