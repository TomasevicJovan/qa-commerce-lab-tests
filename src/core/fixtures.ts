import { test as base, expect, type Page } from '@playwright/test';
import { createApiClients, type ApiClients } from '@api/index';
import type { Credentials } from '@api/types';
import { config } from '@core/config';
import { registerUser, type RegisteredUser } from '@core/factories/user-factory';
import { LabControls } from '@core/lab-controls';

interface WorkerFixtures {
  /** One customer per worker, registered once through the API. Parallel workers never share a cart. */
  workerUser: RegisteredUser;
}

interface TestFixtures {
  /** API clients authenticated as the worker's customer. */
  api: ApiClients;
  /** API clients without a token, for public endpoints and auth negatives. */
  anonApi: ApiClients;
  /** Registers extra customers inside a test, e.g. for ownership checks. */
  createUser: (overrides?: Partial<Credentials>) => Promise<RegisteredUser>;
  /** Global lab switches; restored to baseline after the test if anything was changed. */
  lab: LabControls;
  /**
   * Browser page already signed in as the worker's customer.
   * The storefront keeps its token in sessionStorage (not cookies), which storageState does not
   * persist, so the API token is injected before the app boots instead of logging in through the UI.
   */
  signedInPage: Page;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  workerUser: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext({ baseURL: config.baseUrl });
      const user = await registerUser(request);
      await request.dispose();
      await use(user);
    },
    { scope: 'worker' },
  ],

  api: async ({ request, workerUser }, use) => {
    await use(createApiClients(request, workerUser.token));
  },

  anonApi: async ({ request }, use) => {
    await use(createApiClients(request));
  },

  createUser: async ({ request }, use) => {
    await use((overrides) => registerUser(request, overrides));
  },

  lab: async ({ request }, use) => {
    const lab = new LabControls(request);
    await use(lab);
    if (lab.changed) await lab.reset();
  },

  signedInPage: async ({ page, workerUser }, use) => {
    await page.addInitScript((token) => {
      // Inject only once per tab, so a sign-out inside the test is not undone on the next navigation.
      if (sessionStorage.getItem('qa-test-auth-injected')) return;
      sessionStorage.setItem('qa-token', token);
      sessionStorage.setItem('qa-test-auth-injected', '1');
    }, workerUser.token);
    await use(page);
  },
});

export { expect };
