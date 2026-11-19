import { randomUUID } from 'node:crypto';
import type { Address, CheckoutRequest } from '@api/types';

export function buildAddress(overrides: Partial<Address> = {}): Address {
  return {
    name: 'Alex Tester',
    line1: '12 Test Avenue',
    city: 'Sarajevo',
    postalCode: '71000',
    country: 'BA',
    ...overrides,
  };
}

export function buildCheckout(expectedTotal: number, overrides: Partial<CheckoutRequest> = {}): CheckoutRequest {
  return {
    address: buildAddress(),
    paymentMethod: 'test-card',
    coupon: '',
    expectedTotal,
    ...overrides,
  };
}

export const newIdempotencyKey = (): string => randomUUID();
