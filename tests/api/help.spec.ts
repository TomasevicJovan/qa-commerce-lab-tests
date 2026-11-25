import { test, expect } from '@core/fixtures';
import { random } from '@core/random-data';
import { HELP_TEXT, OPENAPI_VERSION } from '@data/index';

test.describe('Help pages and footer', { tag: ['@help', '@api'] }, () => {
  test('HELP-030 OpenAPI document is valid', { tag: '@regression' }, async ({ request }) => {
    const response = await request.get('/api/openapi.json');

    expect(response.status()).toBe(200);
    const spec = (await response.json()) as { openapi: string; info: { title: string; version: string }; paths: Record<string, Record<string, { responses?: object }>> };
    expect(spec.openapi).toBe(OPENAPI_VERSION);
    expect(spec.info.title).toBeTruthy();
    expect(spec.info.version).toBeTruthy();
    expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
    for (const [path, operations] of Object.entries(spec.paths)) {
      expect(path.startsWith('/'), path).toBe(true);
      for (const [method, operation] of Object.entries(operations)) {
        if (method === 'parameters') continue;
        expect.soft(operation.responses, `${method.toUpperCase()} ${path} has responses`).toBeTruthy();
      }
    }
  });

  test('HELP-031 Help screenshots are served; unknown image returns 404', { tag: '@regression' }, async ({ request }) => {
    for (const name of HELP_TEXT.screenshots) {
      const response = await request.get(`/help/${name}.png`);
      expect(response.status(), name).toBe(200);
      expect(response.headers()['content-type'], name).toContain('image/png');
    }

    expect((await request.get(`/help/${random.text(12)}.png`)).status()).toBe(404);
  });
});
