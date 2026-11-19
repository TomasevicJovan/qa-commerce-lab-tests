import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import type { LabStatus } from '@api/types';

const SERVICES = ['broker', 'identity', 'catalog', 'orders', 'inventory', 'payments'];

test.describe('Lab health', () => {
  test('all backend services report healthy through the gateway', { tag: ['@smoke', '@api'] }, async ({ anonApi }) => {
    const response = await test.step('request lab status', () => anonApi.lab.status());

    await test.step('response matches the OpenAPI contract', async () => {
      expect(response.status()).toBe(200);
      await expectMatchesContract(response, 'get', '/lab/status');
    });

    await test.step('every service is up', async () => {
      const body = (await response.json()) as LabStatus;
      expect(['local', 'kafka']).toContain(body.transport);
      expect(body.services.map((s) => s.service).sort()).toEqual([...SERVICES].sort());
      for (const service of body.services) {
        expect.soft(service.status, `${service.service} status`).toBe('ok');
      }
    });
  });
});
