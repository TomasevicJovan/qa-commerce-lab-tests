import { test, expect } from '@playwright/test';

const SERVICES = ['broker', 'identity', 'catalog', 'orders', 'inventory', 'payments'];

test.describe('Lab health', () => {
  test('all backend services report healthy through the gateway', { tag: ['@smoke', '@api'] }, async ({ request }) => {
    const response = await test.step('request lab status', () => request.get('/api/lab/status'));

    await test.step('verify every service is up', async () => {
      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(['local', 'kafka']).toContain(body.transport);
      expect(body.services.map((s: { service: string }) => s.service).sort()).toEqual([...SERVICES].sort());
      for (const service of body.services) {
        expect.soft(service.status, `${service.service} status`).toBe('ok');
      }
    });
  });
});
