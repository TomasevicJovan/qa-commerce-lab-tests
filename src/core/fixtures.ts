import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { AuthApi } from '@api/auth-api';
import { createApiClients, type ApiClients } from '@api/index';
import type { Credentials, NewCard, SavedCard, Session } from '@api/types';
import { config } from '@core/config';
import { registerUser, type RegisteredUser } from '@core/factories/user-factory';
import { buildCard } from '@core/factories/checkout-factory';
import { LabControls } from '@core/lab-controls';
import { runSeed, seedForTest } from '@core/random-data';
import type { TestCard } from '@data/index';

interface TestFixtures {
  /** Seeds generated data for this test (automatic). The run seed is added to the test's annotations. */
  testDataSeed: number;
  /** A new customer for every test, so bags, wishlists and saved cards never mix. */
  customer: RegisteredUser;
  /** API clients authenticated as the test's customer. */
  api: ApiClients;
  /** API clients without a token, for public endpoints and signed-out negatives. */
  anonApi: ApiClients;
  /** API clients of the demo account. Its seeded saved cards are only read, never changed. */
  demoApi: ApiClients;
  /** Registers extra customers inside a test, e.g. for ownership checks. */
  createUser: (overrides?: Partial<Credentials>) => Promise<RegisteredUser>;
  /** Saves cards for the test's customer and returns them as the API lists them. */
  saveCards: (...cards: (TestCard | NewCard)[]) => Promise<SavedCard[]>;
  /** Global lab switches; restored to baseline after the test if anything was changed. */
  lab: LabControls;
  /** Browser page signed in as the test's customer. */
  signedInPage: Page;
  /** Browser page signed in as the demo account. */
  demoPage: Page;
}

/**
 * The storefront keeps its token in sessionStorage (not cookies), which storageState does not
 * persist, so the API token is injected before the app boots instead of signing in through the UI.
 */
export async function signInWithToken(page: Page, token: string): Promise<void> {
  await page.addInitScript((value) => {
    // Inject only once per tab, so a sign-out inside the test is not undone on the next navigation.
    if (sessionStorage.getItem('qa-test-auth-injected')) return;
    sessionStorage.setItem('qa-token', value);
    sessionStorage.setItem('qa-test-auth-injected', '1');
  }, token);
}

async function demoToken(request: APIRequestContext): Promise<string> {
  const response = await new AuthApi(request).login(config.demoUser);
  expect(response.status(), 'demo account sign-in').toBe(200);
  return ((await response.json()) as Session).token;
}

export const test = base.extend<TestFixtures>({
  testDataSeed: [
    async ({}, use, testInfo) => {
      const seed = seedForTest(`${testInfo.titlePath.join(' > ')} #${testInfo.repeatEachIndex}`);
      testInfo.annotations.push({ type: 'test data', description: `TEST_SEED=${runSeed()} (test seed ${seed})` });
      await use(seed);
    },
    { auto: true },
  ],

  customer: async ({ request, testDataSeed: _ }, use) => {
    await use(await registerUser(request));
  },

  api: async ({ request, customer }, use) => {
    await use(createApiClients(request, customer.token));
  },

  anonApi: async ({ request }, use) => {
    await use(createApiClients(request));
  },

  demoApi: async ({ request }, use) => {
    await use(createApiClients(request, await demoToken(request)));
  },

  createUser: async ({ request, testDataSeed: _ }, use) => {
    await use((overrides) => registerUser(request, overrides));
  },

  saveCards: async ({ api }, use) => {
    await use(async (...cards) => {
      for (const card of cards) {
        const body = 'digits' in card ? buildCard(card) : card;
        const response = await api.cards.save(body);
        expect([200, 201], `save card: ${await response.text()}`).toContain(response.status());
      }
      return (await (await api.cards.list()).json()) as SavedCard[];
    });
  },

  lab: async ({ request }, use) => {
    const lab = new LabControls(request);
    await use(lab);
    if (lab.changed) await lab.reset();
  },

  signedInPage: async ({ page, customer }, use) => {
    await signInWithToken(page, customer.token);
    await use(page);
  },

  demoPage: async ({ page, request }, use) => {
    await signInWithToken(page, await demoToken(request));
    await use(page);
  },
});

export { expect };
