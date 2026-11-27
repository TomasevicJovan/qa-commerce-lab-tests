import { test, expect } from '@core/fixtures';
import { expectMatchesContract } from '@core/schema-validator';
import type { LabConfig, LabStatus } from '@api/types';
import { LAB } from '@data/index';

const SERVICES = ['broker', 'identity', 'catalog', 'orders', 'inventory', 'payments'];

const BASELINE: LabConfig = {
  locatorMode: 'stable',
  renderDelay: 0,
  apiDelay: 0,
  paymentMode: 'approve',
  paymentDelay: 0,
  pauseInventory: false,
  pausePayments: false,
  duplicateEvents: false,
  stalePrice: false,
  rateLimit: false,
  sessionSeconds: LAB.normalSessionSeconds,
};

// Runs before the api and ui projects. If it fails, they are skipped instead of failing for unrelated reasons.
test.describe('Preflight', () => {
  test('all backend services report healthy through the gateway', { tag: ['@smoke', '@api'] }, async ({ anonApi }) => {
    const response = await test.step('request lab status', () => anonApi.lab.status());

    await test.step('response matches the OpenAPI contract', async () => {
      expect(response.status()).toBe(200);
      await expectMatchesContract(response, 'get', '/lab/status');
    });

    await test.step('every service is up', async () => {
      const body = (await response.json()) as LabStatus;
      expect(['local', 'kafka']).toContain(body.transport);
      expect(body.services.map((s) => s.service).sort((a, b) => a.localeCompare(b))).toEqual([...SERVICES].sort((a, b) => a.localeCompare(b)));
      for (const service of body.services) {
        expect.soft(service.status, `${service.service} status`).toBe('ok');
      }
    });
  });

  test('lab runs with baseline scenario settings', { tag: ['@smoke', '@api'] }, async ({ lab }) => {
    expect(await lab.current()).toEqual(BASELINE);
  });
});
