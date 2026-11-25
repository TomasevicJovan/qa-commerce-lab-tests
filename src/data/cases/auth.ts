/** Inputs for registration and sign-in tests: limits from BUSINESS.md and invalid formats. */
import type { Credentials } from '@api/types';
import { random } from '@core/random-data';
import { LIMITS } from '@data/limits';

export const PASSWORD = LIMITS.password;
export const NAME_MAX = LIMITS.nameMax;

/** Email formats the registration form must reject. */
export const INVALID_EMAILS = ['plainaddress', 'name@', '@example.com', 'name@example', 'name @example.com'] as const;

/** Registration bodies the API must reject. Built inside the test, so generated values follow the test's seed. */
export const INVALID_REGISTRATIONS: { name: string; change: () => Partial<Record<keyof Credentials, string | undefined>> }[] = [
  { name: 'missing name', change: () => ({ name: undefined }) },
  { name: 'name of spaces only', change: () => ({ name: '   ' }) },
  { name: 'email without @', change: () => ({ email: INVALID_EMAILS[0] }) },
  { name: `password of ${PASSWORD.min - 1} characters`, change: () => ({ password: random.password(PASSWORD.min - 1) }) },
  { name: `password of ${PASSWORD.max + 1} characters`, change: () => ({ password: random.password(PASSWORD.max + 1) }) },
];

/** The registered email typed differently: emails are compared trimmed and case-insensitively. */
export const differentlyTyped = (email: string): string => `  ${email.toUpperCase()}  `;
