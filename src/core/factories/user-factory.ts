import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext } from '@playwright/test';
import { AuthApi } from '@api/auth-api';
import type { Credentials, Session } from '@api/types';

export const DEFAULT_PASSWORD = 'Password123!';

/** Unique, readable credentials. The run id keeps data from different runs apart. */
export function buildCredentials(overrides: Partial<Credentials> = {}): Credentials {
  const suffix = randomUUID().slice(0, 8);
  return {
    name: `QA Tester ${suffix}`,
    email: `qa.${suffix}@example.com`,
    password: DEFAULT_PASSWORD,
    ...overrides,
  };
}

export interface RegisteredUser extends Credentials {
  id: string;
  token: string;
  expiresAt: number;
}

/** Registers a fresh customer through the API and returns credentials plus a live token. */
export async function registerUser(
  request: APIRequestContext,
  overrides: Partial<Credentials> = {},
): Promise<RegisteredUser> {
  const credentials = buildCredentials(overrides);
  const response = await new AuthApi(request).register(credentials);
  expect(response.status(), `register ${credentials.email}: ${await response.text()}`).toBe(201);
  const session = (await response.json()) as Session;
  return { ...credentials, id: session.user.id, token: session.token, expiresAt: session.expiresAt };
}
