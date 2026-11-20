import { test, expect } from '@core/fixtures';
import { config } from '@core/config';
import { buildCredentials } from '@core/factories/user-factory';
import { expectMatchesContract } from '@core/schema-validator';
import type { Session } from '@api/types';
import { createApiClients } from '@api/index';

test.describe('Authentication API', () => {
  test('register, read profile, log out: the revoked token stops working', { tag: ['@smoke', '@api'] }, async ({ anonApi, request }) => {
    const credentials = buildCredentials();

    const session = await test.step('register returns 201 and a session', async () => {
      const response = await anonApi.auth.register(credentials);
      expect(response.status()).toBe(201);
      await expectMatchesContract(response, 'post', '/auth/register');
      const body = (await response.json()) as Session;
      expect(body.user).toMatchObject({ email: credentials.email, name: credentials.name, role: 'customer' });
      expect(body.expiresAt).toBeGreaterThan(Date.now());
      return body;
    });

    await test.step('login with the same credentials issues a different token', async () => {
      const response = await anonApi.auth.login({ email: credentials.email.toUpperCase(), password: credentials.password });
      expect(response.status()).toBe(200);
      await expectMatchesContract(response, 'post', '/auth/login');
      expect(((await response.json()) as Session).token).not.toBe(session.token);
    });

    const authed = createApiClients(request, session.token);

    await test.step('the token reads the profile', async () => {
      const response = await authed.auth.me();
      expect(response.status()).toBe(200);
      await expectMatchesContract(response, 'get', '/auth/me');
      expect(await response.json()).toEqual(session.user);
    });

    await test.step('logout revokes only this token', async () => {
      const response = await authed.auth.logout();
      expect(response.status()).toBe(200);
      await expectMatchesContract(response, 'post', '/auth/logout');
      expect((await authed.auth.me()).status()).toBe(401);
      expect((await authed.cart.get()).status()).toBe(401);
    });
  });

  test('invalid credentials and requests get the documented status codes', { tag: ['@regression', '@api'] }, async ({ anonApi, workerUser }) => {
    const checks: { name: string; send: () => ReturnType<typeof anonApi.auth.login>; status: number; error: RegExp }[] = [
      {
        name: 'wrong password',
        send: () => anonApi.auth.login({ email: config.demoUser.email, password: 'WrongPassword1!' }),
        status: 401,
        error: /Invalid email or password/,
      },
      {
        name: 'unknown email',
        send: () => anonApi.auth.login({ email: 'nobody@example.com', password: 'Password123!' }),
        status: 401,
        error: /Invalid email or password/,
      },
      {
        name: 'duplicate email, compared case-insensitively',
        send: () => anonApi.auth.register(buildCredentials({ email: `  ${workerUser.email.toUpperCase()} ` })),
        status: 409,
        error: /already registered/,
      },
      {
        name: 'password shorter than 8 characters',
        send: () => anonApi.auth.register(buildCredentials({ password: 'short' })),
        status: 422,
        error: /password of 8–128 characters/,
      },
      {
        name: 'malformed email',
        send: () => anonApi.auth.register(buildCredentials({ email: 'not-an-email' })),
        status: 422,
        error: /valid email/,
      },
      { name: 'protected endpoint without a token', send: () => anonApi.cart.get(), status: 401, error: /Session expired/ },
    ];

    for (const check of checks) {
      await test.step(`${check.name} -> ${check.status}`, async () => {
        const response = await check.send();
        expect.soft(response.status(), check.name).toBe(check.status);
        expect.soft((await response.json()).error, check.name).toMatch(check.error);
      });
    }
  });
});
