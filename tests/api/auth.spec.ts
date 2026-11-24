import { test, expect } from '@core/fixtures';
import { buildCredentials } from '@core/factories/user-factory';
import { expectMatchesContract } from '@core/schema-validator';
import type { Session, User } from '@api/types';

test.describe('Registration and sign-in', { tag: ['@auth', '@api'] }, () => {
  test('AUTH-040 Register returns a session', { tag: '@smoke' }, async ({ anonApi }) => {
    const response = await anonApi.auth.register(buildCredentials({ password: 'Secret123' }));

    expect(response.status()).toBe(201);
    await expectMatchesContract(response, 'post', '/auth/register');
    const session = (await response.json()) as Session;
    expect(session.user.role).toBe('customer');
    expect(session.expiresAt).toBeGreaterThan(Date.now());
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
});
