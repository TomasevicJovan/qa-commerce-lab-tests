import type { Locator, Page } from '@playwright/test';
import type { Address, PaymentMethod } from '@api/types';
import { Totals } from './totals';

/** Checkout form: fictional shipping details, test payment method and coupon. */
export class CheckoutDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly recipient: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly postalCode: Locator;
  readonly country: Locator;
  readonly paymentMethod: Locator;
  readonly coupon: Locator;
  readonly error: Locator;
  readonly placeOrderButton: Locator;
  readonly totals: Totals;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.title = this.root.getByRole('heading', { level: 2 });
    this.recipient = this.root.getByLabel('Recipient');
    this.street = this.root.getByLabel('Street address');
    this.city = this.root.getByLabel('City');
    this.postalCode = this.root.getByLabel('Postal code');
    this.country = this.root.getByLabel('Country');
    this.paymentMethod = this.root.getByLabel('Payment method');
    this.coupon = this.root.getByLabel('Discount code');
    this.error = this.root.getByRole('alert');
    this.placeOrderButton = this.root.getByRole('button', { name: 'Place test order →' });
    this.totals = new Totals(this.root);
  }

  /** Visible names of the country options, in order. */
  async countryOptions(): Promise<string[]> {
    return (await this.country.locator('option').allTextContents()).map((text) => text.trim());
  }

  async fillAddress(address: Partial<Address>): Promise<void> {
    if (address.name !== undefined) await this.recipient.fill(address.name);
    if (address.line1 !== undefined) await this.street.fill(address.line1);
    if (address.city !== undefined) await this.city.fill(address.city);
    if (address.postalCode !== undefined) await this.postalCode.fill(address.postalCode);
    if (address.country !== undefined) await this.country.selectOption(address.country);
  }

  async choosePayment(method: PaymentMethod): Promise<void> {
    await this.paymentMethod.selectOption(method);
  }

  async applyCoupon(code: string): Promise<void> {
    await this.coupon.fill(code);
  }

  async placeOrder(): Promise<void> {
    await this.placeOrderButton.click();
  }
}
