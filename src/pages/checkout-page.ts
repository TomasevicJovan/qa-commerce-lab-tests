import type { Locator } from '@playwright/test';
import type { Address } from '@api/types';
import { BasePage } from './base-page';
import { Totals } from './components/totals';

export type CheckoutField = 'name' | 'line1' | 'city' | 'postalCode' | 'holder' | 'number' | 'expiry' | 'cvc' | 'payment';

/** Checkout page (#checkout): address, payment, discount code and the order summary. */
export class CheckoutPage extends BasePage {
  readonly form = this.page.locator('#checkout-form');
  readonly recipient = this.form.getByLabel('Recipient');
  readonly street = this.form.getByLabel('Street address');
  readonly city = this.form.getByLabel('City');
  readonly postalCode = this.form.getByLabel('Postal code');
  readonly country = this.form.getByLabel('Country');
  readonly savedCards = this.form.locator('.payment-option').filter({ has: this.page.locator('input[value^="saved:"]') });
  readonly newCardOption = this.form.locator('input[name="payment"][value="new"]');
  readonly walletOption = this.form.locator('input[name="payment"][value="wallet"]');
  readonly newCardForm = this.form.locator('#new-card');
  readonly holder = this.form.getByLabel('Cardholder name');
  readonly cardNumber = this.form.getByLabel('Card number');
  readonly brandHint = this.form.locator('#card-brand-hint');
  readonly expiry = this.form.getByLabel('Expiry date (MM/YY)');
  readonly cvc = this.form.getByLabel('Security code (CVC)');
  readonly saveCard = this.form.getByLabel('Save this card for next time');
  readonly coupon = this.form.getByRole('textbox', { name: 'Discount code' });
  readonly couponStatus = this.form.locator('#coupon-status');
  readonly summaryItems = this.form.locator('.summary-item');
  readonly totals = new Totals(this.form.locator('#checkout-total'));
  readonly error = this.form.locator('#checkout-error');
  readonly placeOrderButton = this.form.locator('button.place-order');
  readonly emptyBag = this.main.getByText('Your bag is empty.');

  async goto(): Promise<void> {
    await this.open('#checkout');
  }

  async waitForForm(): Promise<void> {
    await this.placeOrderButton.waitFor();
  }

  fieldError(field: CheckoutField): Locator {
    return this.form.locator(`#error-${field}`);
  }

  /** Radio button of a saved card, by its last four digits. */
  savedCardRadio(last4: string): Locator {
    return this.savedCards.filter({ hasText: `•••• ${last4}` }).locator('input[type="radio"]');
  }

  savedCard(last4: string): Locator {
    return this.savedCards.filter({ hasText: `•••• ${last4}` });
  }

  removeCardButton(label: string): Locator {
    return this.form.getByRole('button', { name: `Remove ${label}` });
  }

  async fillAddress(address: Partial<Address>): Promise<void> {
    if (address.name !== undefined) await this.recipient.fill(address.name);
    if (address.line1 !== undefined) await this.street.fill(address.line1);
    if (address.city !== undefined) await this.city.fill(address.city);
    if (address.postalCode !== undefined) await this.postalCode.fill(address.postalCode);
    if (address.country !== undefined) await this.country.selectOption(address.country);
  }

  async chooseSavedCard(last4: string): Promise<void> {
    await this.savedCardRadio(last4).check();
  }

  async chooseNewCard(): Promise<void> {
    await this.newCardOption.check();
  }

  async chooseWallet(): Promise<void> {
    await this.walletOption.check();
  }

  /** Fills the new-card form; fields left undefined are not touched. */
  async fillCard(card: { holder?: string; number?: string; expiry?: string; cvc?: string; save?: boolean }): Promise<void> {
    if (card.holder !== undefined) await this.holder.fill(card.holder);
    if (card.number !== undefined) await this.cardNumber.fill(card.number);
    if (card.expiry !== undefined) await this.expiry.fill(card.expiry);
    if (card.cvc !== undefined) await this.cvc.fill(card.cvc);
    if (card.save !== undefined) await this.saveCard.setChecked(card.save);
  }

  async placeOrder(): Promise<void> {
    await this.placeOrderButton.click();
  }
}
