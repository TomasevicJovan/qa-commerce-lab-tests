import { test, expect } from '@core/fixtures';
import { buildCredentials } from '@core/factories/user-factory';
import { expectMatchesContract } from '@core/schema-validator';
import { config } from '@core/config';
import { createApiClients } from '@api/index';
import type { ApiError, Session, User } from '@api/types';

test.describe('Registration and sign-in', { tag: ['@auth', '@api'] }, () => {
  test('AUTH-040 Register returns a session', { tag: '@smoke' }, async ({ anonApi }) => {
    const response = await anonApi.auth.register(buildCredentials({ password: 'Secret123' }));

    expect(response.status()).toBe(201);
    await expectMatchesContract(response, 'post', '/auth/register');
    const session = (await response.json()) as Session;
    expect(session.user.role).toBe('customer');
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  const INVALID = [
    { name: 'missing name', body: { name: undefined } },
    { name: 'name of spaces only', body: { name: '   ' } },
    { name: 'email not-an-email', body: { email: 'not-an-email' } },
    { name: 'password of 7 characters', body: { password: 'Secret1' } },
    { name: 'password of 129 characters', body: { password: 'a'.repeat(129) } },
  ];
  for (const { name, body } of INVALID) {
    test(`AUTH-041 Invalid registration returns 422: ${name}`, { tag: '@regression' }, async ({ anonApi }) => {
      const response = await anonApi.auth.register({ ...buildCredentials(), ...body });

      expect(response.status()).toBe(422);
      expect(((await response.json()) as ApiError).error).toBe('Name, valid email and password of 8–128 characters required');
    });
  }

  test('AUTH-042 Passwords of 8 and 128 characters are accepted', { tag: '@regression' }, async ({ anonApi }) => {
    for (const password of ['Secret12', 'a'.repeat(128)]) {
      const response = await anonApi.auth.register(buildCredentials({ password }));
      expect(response.status(), `${password.length} characters`).toBe(201);
    }
  });

  test('AUTH-043 Duplicate email returns 409', { tag: '@regression' }, async ({ anonApi }) => {
    const response = await anonApi.auth.register(buildCredentials({ email: ' QA@EXAMPLE.COM ' }));

    expect(response.status()).toBe(409);
    expect(((await response.json()) as ApiError).error).toBe('Email already registered');
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
    const wrongPassword = await anonApi.auth.login({ email: config.demoUser.email, password: 'WrongPassword1!' });
    const unknownEmail = await anonApi.auth.login({ email: 'nobody@example.com', password: config.demoUser.password });

    for (const response of [wrongPassword, unknownEmail]) {
      expect(response.status()).toBe(401);
      expect(await response.text()).toBe('{"error":"Invalid email or password"}');
    }
  });

  test('AUTH-046 Profile needs a valid token', { tag: '@smoke' }, async ({ api, anonApi, customer }) => {
    const signedIn = await api.auth.me();
    expect(signedIn.status()).toBe(200);
    await expectMatchesContract(signedIn, 'get', '/auth/me');
    expect((await signedIn.json()) as User).toMatchObject({ id: customer.id, email: customer.email, name: customer.name, role: 'customer' });

    const anonymous = await anonApi.auth.me();
    expect(anonymous.status()).toBe(401);
    expect(await anonymous.json()).toEqual({ error: 'Session expired. Please sign in.' });
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
