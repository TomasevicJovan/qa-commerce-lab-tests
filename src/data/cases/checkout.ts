/** Inputs for checkout tests: address and card field rules from BUSINESS.md. */
import type { Address, CheckoutRequest, NewCard } from '@api/types';
import { buildAddress, expiryIn, pay } from '@core/factories/checkout-factory';
import { CARDS, type TestCard } from '@data/cards';
import { CARD_ERRORS, API_ERRORS, CHECKOUT_TEXT } from '@data/messages';
import { COUPONS } from '@data/promotions';
import { LIMITS } from '@data/limits';

export const ADDRESS_MAX = LIMITS.addressFieldMax;
export const EXPIRY_MAX_YEARS = LIMITS.expiryMaxYears;

type AddressField = Exclude<keyof Address, 'country'>;

/** Address fields in form order, with the label on the page and the message for an empty field. */
export const ADDRESS_FIELDS: { label: string; field: AddressField; message: string }[] = [
  { label: 'Recipient', field: 'name', message: CHECKOUT_TEXT.addressErrors.name },
  { label: 'Street address', field: 'line1', message: CHECKOUT_TEXT.addressErrors.line1 },
  { label: 'City', field: 'city', message: CHECKOUT_TEXT.addressErrors.city },
  { label: 'Postal code', field: 'postalCode', message: CHECKOUT_TEXT.addressErrors.postalCode },
];

/** Cardholder names the form must reject: empty, one letter, digits. */
export const INVALID_HOLDERS = ['', 'J', '1234'] as const;

const year = (offset: number) => String((new Date().getFullYear() + offset) % 100).padStart(2, '0');

/** Expiry values for the validation rules. */
export const EXPIRY = {
  /** Typed without a slash; the form adds it. */
  typedDigits: `12${year(3)}`,
  typedShown: `12/${year(3)}`,
  /** Too short to be MM/YY. */
  incomplete: '1',
  /** Month 13 of a future year. */
  month13: `13/${year(3)}`,
  lastMonth: expiryIn(-1),
  thisMonth: expiryIn(0),
  /** One year past the allowed range. */
  tooFar: `12/${year(EXPIRY_MAX_YEARS + 1)}`,
} as const;

/** One wrong card field at a time, with the field the error belongs to. Same rules on the page and in the API. */
export interface CardFieldCase {
  name: string;
  card: TestCard;
  change: Partial<NewCard>;
  field: 'holder' | 'number' | 'expiry' | 'cvc';
  error: string;
}
export const INVALID_CARD_FIELDS: CardFieldCase[] = [
  { name: 'holder of one letter', card: CARDS.visa, change: { holder: 'J' }, field: 'holder', error: CARD_ERRORS.holder },
  { name: 'number with a wrong check digit', card: CARDS.visa, change: { number: CARDS.invalidCheckDigit }, field: 'number', error: CARD_ERRORS.number },
  { name: 'Discover number', card: CARDS.visa, change: { number: CARDS.discover }, field: 'number', error: CARD_ERRORS.brand },
  { name: 'expiry month 13', card: CARDS.visa, change: { expiry: EXPIRY.month13 }, field: 'expiry', error: CARD_ERRORS.expiryMonth },
  { name: 'expiry last month', card: CARDS.visa, change: { expiry: EXPIRY.lastMonth }, field: 'expiry', error: CARD_ERRORS.expired },
  { name: 'Visa with a 2-digit code', card: CARDS.visa, change: { cvc: '12' }, field: 'cvc', error: CARD_ERRORS.cvc3 },
  { name: 'Amex with a 3-digit code', card: CARDS.amex, change: { cvc: '123' }, field: 'cvc', error: CARD_ERRORS.cvc4 },
];

/** Checkout requests the API must refuse with 422, one broken part at a time. Built inside the test. */
export const INVALID_CHECKOUT_REQUESTS: { name: string; request: () => Partial<CheckoutRequest> | Record<string, unknown>; emptyCart?: boolean; error: string }[] = [
  { name: 'missing address.city', request: () => ({ address: { ...buildAddress(), city: undefined } }), error: API_ERRORS.checkout.address },
  { name: 'empty cart', request: () => pay.wallet(), emptyCart: true, error: API_ERRORS.checkout.emptyCart },
  { name: 'payment method cash', request: () => ({ paymentMethod: 'cash' }), error: API_ERRORS.checkout.paymentMethod },
  { name: `coupon ${COUPONS.expired}`, request: () => ({ coupon: COUPONS.expired }), error: API_ERRORS.checkout.couponExpired },
  { name: `coupon ${COUPONS.unknown}`, request: () => ({ coupon: COUPONS.unknown }), error: API_ERRORS.checkout.couponUnknown },
];

