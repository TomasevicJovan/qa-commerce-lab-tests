import { Ajv, type ValidateFunction } from 'ajv';
import { expect, type APIResponse } from '@playwright/test';
import { config } from '@core/config';

type HttpMethod = 'get' | 'post' | 'put' | 'delete';

const SPEC_KEY = 'openapi';
let ajv: Ajv | undefined;
let spec: { paths: Record<string, Record<string, { responses: Record<string, unknown> }>> } | undefined;
const cache = new Map<string, ValidateFunction>();

/** JSON Pointer escaping: "/orders/{orderId}" -> "~1orders~1{orderId}". */
const pointer = (segment: string) => segment.replace(/~/g, '~0').replace(/\//g, '~1');

/**
 * The contract is read from the running lab (/api/openapi.json), so tests always
 * validate against the version they are talking to.
 */
async function load(): Promise<Ajv> {
  if (ajv) return ajv;
  const response = await fetch(`${config.baseUrl}/api/openapi.json`);
  if (!response.ok) throw new Error(`Cannot load OpenAPI spec: HTTP ${response.status}`);
  spec = await response.json();

  // OpenAPI 3.0 uses keywords Ajv does not know (example, nullable, ...). strict:false ignores them.
  ajv = new Ajv({ allErrors: true, strict: false });
  // Formats used by the lab spec, registered here to avoid an extra dependency.
  ajv.addFormat('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  ajv.addFormat('date-time', (value: string) => !Number.isNaN(Date.parse(value)));
  ajv.addFormat('int64', { type: 'number', validate: (value: number) => Number.isInteger(value) });
  ajv.addSchema(spec as object, SPEC_KEY);
  return ajv;
}

async function validatorFor(method: HttpMethod, path: string, status: number): Promise<ValidateFunction> {
  const key = `${method} ${path} ${status}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const instance = await load();
  const operation = spec?.paths[path]?.[method];
  if (!operation) throw new Error(`OpenAPI has no operation ${method.toUpperCase()} ${path}`);
  if (!operation.responses[String(status)]) {
    throw new Error(`OpenAPI does not document status ${status} for ${method.toUpperCase()} ${path}`);
  }

  const ref = `${SPEC_KEY}#/paths/${pointer(path)}/${method}/responses/${status}/content/application~1json/schema`;
  const validate = instance.compile({ $ref: ref });
  cache.set(key, validate);
  return validate;
}

/**
 * Asserts that a response status is documented and its body matches the OpenAPI schema.
 * `path` is the template as written in the spec, without the /api prefix, e.g. "/orders/{orderId}".
 */
export async function expectMatchesContract(response: APIResponse, method: HttpMethod, path: string): Promise<void> {
  const validate = await validatorFor(method, path, response.status());
  const body = await response.json();
  const valid = validate(body);
  const errors = (validate.errors ?? []).map((e) => `${e.instancePath || '(root)'} ${e.message}`);
  expect(valid, `${method.toUpperCase()} ${path} ${response.status()} violates the contract:\n${errors.join('\n')}`).toBe(
    true,
  );
}
