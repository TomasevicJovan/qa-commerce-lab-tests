/**
 * Generated test data. Every name, email, password and address a test types or sends comes from here,
 * never from a literal in a test.
 *
 * The data is random but repeatable: each run has a seed (printed at the start of the run and stored in the
 * report), and each test derives its own seed from it and its title. Running again with the same
 * TEST_SEED gives every test the same names and addresses. Only the unique part of an email changes,
 * so a repeated run never collides with an account that already exists.
 */
import { randomUUID } from 'node:crypto';
import { faker } from '@faker-js/faker';

const MAX_SEED = 2 ** 31 - 1;

/** Seed of the whole run: TEST_SEED when given, otherwise chosen once in playwright.config.ts. */
export function runSeed(): number {
  const value = Number(process.env.TEST_SEED);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

/** A new run seed, used by playwright.config.ts when TEST_SEED is not set. */
export const newRunSeed = (): number => 1 + Math.floor(Math.random() * (MAX_SEED - 1));

/** Seeds the generator for one test, from the run seed and the test's own title. */
export function seedForTest(testId: string): number {
  let hash = runSeed();
  for (const char of testId) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  const seed = (Math.abs(hash) % MAX_SEED) || 1;
  faker.seed(seed);
  return seed;
}

/** Letters only, without accents: for the part of an email address before @. */
const asciiLetters = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
    .toLowerCase();

const fullName = (): string => `${faker.person.firstName()} ${faker.person.lastName()}`;

export const random = {
  firstName: (): string => faker.person.firstName(),
  lastName: (): string => faker.person.lastName(),
  fullName,

  /** Unique email address; the name part is repeatable, the 8-character suffix is unique per call. */
  email: (name: string = fullName()): string => {
    const [first = 'qa', ...rest] = name.split(' ');
    const local = [asciiLetters(first), asciiLetters(rest.join(''))].filter(Boolean).join('.') || 'qa';
    return `${local}.${randomUUID().slice(0, 8)}@example.com`;
  },

  /** A password that meets the shop's rule (8–128 characters); `length` picks an exact length for boundary tests. */
  password: (length = 12): string => faker.internet.password({ length }),

  /** Cardholder name: a real-looking name, which can contain letters with accents, apostrophes and hyphens. */
  cardholder: (): string => fullName(),

  address: () => ({
    name: fullName(),
    line1: faker.location.streetAddress(),
    city: faker.location.city(),
    postalCode: faker.location.zipCode('#####'),
  }),

  /** Text of an exact length, for maximum-length checks. */
  text: (length: number): string => faker.string.alphanumeric(length),
};
