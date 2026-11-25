import { expect, type APIRequestContext } from '@playwright/test';
import { AuthApi } from '@api/auth-api';
import type { Credentials, Session } from '@api/types';
import { random } from '@core/random-data';

/** A new customer's details: generated name and password, unique email. */
export function buildCredentials(overrides: Partial<Credentials> = {}): Credentials {
  const name = random.fullName();
  return { name, email: random.email(name), password: random.password(), ...overrides };
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
