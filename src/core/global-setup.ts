import type { FullConfig } from '@playwright/test';
import { config } from './config';

/**
 * Runs once before all tests:
 * 1. fails fast with a readable message when the lab is not running or unhealthy,
 * 2. restores baseline scenario settings left over from earlier manual exploration.
 */
export default async function globalSetup(_: FullConfig): Promise<void> {
  const statusUrl = `${config.baseUrl}/api/lab/status`;
  let body: { transport: string; services: { service: string; status: string }[] };

  try {
    const response = await fetch(statusUrl, { signal: AbortSignal.timeout(5_000) });
    body = await response.json();
  } catch {
    throw new Error(
      `qa-commerce-lab is not reachable at ${config.baseUrl}.\n` +
        'Start it first (in the qa-commerce-lab folder): "npm start" or "docker compose up -d --wait".',
    );
  }

  const unhealthy = body.services.filter((s) => s.status !== 'ok');
  if (unhealthy.length) {
    throw new Error(`Lab services are not healthy: ${unhealthy.map((s) => `${s.service}=${s.status}`).join(', ')}`);
  }

  const reset = await fetch(`${config.baseUrl}/api/lab/defaults`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!reset.ok) throw new Error(`Could not restore lab defaults: HTTP ${reset.status}`);

  console.log(`Lab ready at ${config.baseUrl} (${body.transport} transport), baseline settings restored.`);
  console.log(`Test data seed: TEST_SEED=${process.env.TEST_SEED} (set it to repeat this run's generated data).`);
}
