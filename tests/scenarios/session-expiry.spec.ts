import { test, expect } from '@core/fixtures';
import { createApiClients } from '@api/index';

// CF-01: lifetime changes apply to new sessions only; expired tokens are rejected server-side.
test('short-lived sessions expire while existing sessions keep working', { tag: ['@regression', '@api'] }, async ({ api, lab, createUser, request }) => {
  await lab.set({ sessionSeconds: 2 });

  const shortLived = await test.step('a session created now lives 2 seconds', async () => {
    const user = await createUser();
    expect(user.expiresAt - Date.now()).toBeLessThanOrEqual(2_000);
    return createApiClients(request, user.token);
  });

  expect((await shortLived.auth.me()).status(), 'valid right after login').toBe(200);

  await test.step('it is rejected once it expires', async () => {
    await expect.poll(async () => (await shortLived.auth.me()).status(), { timeout: 5_000, intervals: [500] }).toBe(401);
    expect((await shortLived.cart.get()).status()).toBe(401);
  });

  await test.step('the worker session issued earlier is unaffected', async () => {
    expect((await api.auth.me()).status()).toBe(200);
  });
});
