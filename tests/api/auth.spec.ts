import { test, expect } from '@core/fixtures';
import { buildCredentials } from '@core/factories/user-factory';
import { expectMatchesContract } from '@core/schema-validator';
import { random } from '@core/random-data';
import { config } from '@core/config';
import { createApiClients } from '@api/index';
import { API_ERRORS } from '@data/index';
import { INVALID_REGISTRATIONS, PASSWORD, differentlyTyped } from '@data/cases/auth';
import type { ApiError, Session, User } from '@api/types';

test.describe('Registration and sign-in', { tag: ['@auth', '@api'] }, () => {
  test('AUTH-040 Register returns a session', { tag: '@smoke' }, async ({ anonApi }) => {
    const response = await anonApi.auth.register(buildCredentials());

    expect(response.status()).toBe(201);
    await expectMatchesContract(response, 'post', '/auth/register');
    const session = (await response.json()) as Session;
    expect(session.user.role).toBe('customer');
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  for (const { name, change } of INVALID_REGISTRATIONS) {
    test(`AUTH-041 Invalid registration returns 422: ${name}`, { tag: '@regression' }, async ({ anonApi }) => {
      const response = await anonApi.auth.register({ ...buildCredentials(), ...change() });

      expect(response.status()).toBe(422);
      expect(((await response.json()) as ApiError).error).toBe(API_ERRORS.auth.invalidRegistration);
    });
  }

  test(`AUTH-042 Passwords of ${PASSWORD.min} and ${PASSWORD.max} characters are accepted`, { tag: '@regression' }, async ({ anonApi }) => {
    for (const length of [PASSWORD.min, PASSWORD.max]) {
      const response = await anonApi.auth.register(buildCredentials({ password: random.password(length) }));
      expect(response.status(), `${length} characters`).toBe(201);
    }
  });

  test('AUTH-043 Duplicate email returns 409', { tag: '@regression' }, async ({ anonApi }) => {
    const response = await anonApi.auth.register(buildCredentials({ email: differentlyTyped(config.demoUser.email) }));

    expect(response.status()).toBe(409);
    expect(((await response.json()) as ApiError).error).toBe(API_ERRORS.auth.emailTaken);
  });

  test('AUTH-044 Every sign-in issues a new token', { tag: '@regression' }, async ({ anonApi, request }) => {
    const sessions: Session[] = [];
    for (let i = 0; i < 2; i++) {
      const response = await anonApi.auth.login(config.demoUser);
      expect(response.status()).toBe(200);
      sessions.push((await response.json()) as Session);
    }

    expect(sessions[0]!.token).not.toBe(sessions[1]!.token);
    for (const { token } of sessions) expect((await createApiClients(request, token).auth.me()).status()).toBe(200);
  });

  test('AUTH-045 Wrong password and unknown email return the same 401', { tag: '@regression' }, async ({ anonApi }) => {
    const wrongPassword = await anonApi.auth.login({ email: config.demoUser.email, password: random.password() });
    const unknownEmail = await anonApi.auth.login({ email: random.email(), password: config.demoUser.password });

    for (const response of [wrongPassword, unknownEmail]) {
      expect(response.status()).toBe(401);
      expect(await response.text()).toBe(JSON.stringify({ error: API_ERRORS.auth.invalidCredentials }));
    }
  });

  test('AUTH-046 Profile needs a valid token', { tag: '@smoke' }, async ({ api, anonApi, customer }) => {
    const signedIn = await api.auth.me();
    expect(signedIn.status()).toBe(200);
    await expectMatchesContract(signedIn, 'get', '/auth/me');
    expect((await signedIn.json()) as User).toMatchObject({ id: customer.id, email: customer.email, name: customer.name, role: 'customer' });

    const anonymous = await anonApi.auth.me();
    expect(anonymous.status()).toBe(401);
    expect(await anonymous.json()).toEqual({ error: API_ERRORS.auth.sessionExpired });
  });

  test('AUTH-047 Logout revokes only the current token', { tag: '@regression' }, async ({ anonApi, request }) => {
    const tokenOf = async () => ((await (await anonApi.auth.login(config.demoUser)).json()) as Session).token;
    const a = createApiClients(request, await tokenOf());
    const b = createApiClients(request, await tokenOf());

    expect((await a.auth.logout()).status()).toBeLessThan(300);

    expect((await a.auth.me()).status()).toBe(401);
    expect((await b.auth.me()).status()).toBe(200);
  });
});
