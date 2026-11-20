import { test, expect } from '@core/fixtures';
import { createApiClients } from '@api/index';

// API-12: 12 business requests per 10 seconds per token; QA controls stay reachable for recovery.
test('the 13th request within the window is throttled with Retry-After', { tag: ['@regression', '@api'] }, async ({ lab, createUser, request }) => {
  // A fresh token gets its own counter, independent of anything else that ran before.
  const user = await createUser();
  const api = createApiClients(request, user.token);
  await lab.set({ rateLimit: true });

  await test.step('12 requests are allowed', async () => {
    for (let i = 1; i <= 12; i++) {
      expect((await api.cart.get()).status(), `request ${i}`).toBe(200);
    }
  });

  await test.step('the 13th gets 429 with a Retry-After of at most 10 seconds', async () => {
    const response = await api.cart.get();
    expect(response.status()).toBe(429);
    const retryAfter = Number(response.headers()['retry-after']);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(10);
    expect((await response.json()).error).toMatch(/12 requests per 10 seconds/);
  });

  await test.step('QA controls bypass the limit so the lab can be recovered', async () => {
    expect((await lab.current()).rateLimit).toBe(true);
  });
});
