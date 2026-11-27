import { existsSync } from 'node:fs';

// Node 24 reads .env natively, so no dotenv dependency is needed.
if (existsSync('.env')) process.loadEnvFile('.env');

const ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

function read(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

/** Secrets have no default: a missing value stops the run with a clear message. */
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Locally: copy .env.example to .env and fill it in. In CI: add ${name} as a repository secret.`,
    );
  }
  return value;
}

function readNumber(name: string, fallback: number): number {
  const raw = read(name, String(fallback));
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

const baseUrl = withoutTrailingSlashes(read('BASE_URL', 'http://localhost:3000'));

// The lab gateway rejects any other Host header with 403, so fail early with a clear message.
if (!ALLOWED_ORIGINS.includes(baseUrl)) {
  throw new Error(`BASE_URL must be one of ${ALLOWED_ORIGINS.join(', ')}; got "${baseUrl}"`);
}

export const config = {
  baseUrl,
  demoUser: {
    email: required('DEMO_EMAIL'),
    password: required('DEMO_PASSWORD'),
  },
  orderTimeoutMs: readNumber('ORDER_TIMEOUT_MS', 15_000),
  isCI: Boolean(process.env.CI),
} as const;

function withoutTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end--;
  return url.slice(0, end);
}
