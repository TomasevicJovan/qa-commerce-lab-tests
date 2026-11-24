import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { CheckoutPage } from '@pages/index';
import { APPROVED_CARDS, CARDS, DEMO_CARDS, DEMO_NAME, PRODUCTS } from '@core/test-data';
import { ensureStock, setCart } from '@core/flows/order-flow';
import type { ApiClients } from '@api/index';
import type { SavedCard } from '@api/types';

const { stillMug, markHighlighter } = PRODUCTS;
const AMEX_8431 = APPROVED_CARDS[9]!; // 3714 496353 98431

const label = (c: { brand: string; last4: string; expMonth: number; expYear: number; expired: boolean }, holder = DEMO_NAME) =>
  `${{ visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' }[c.brand]}•••• ${c.last4} ${holder} · expires ${String(c.expMonth).padStart(2, '0')}/${String(c.expYear).slice(-2)}${c.expired ? ' · Expired' : ''}`;
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Puts one product in the bag and opens checkout (reloads when the page already showed checkout once). */
async function openCheckout(page: Page, api: ApiClients, productId: string = stillMug.id, reload = false): Promise<CheckoutPage> {
  const checkout = new CheckoutPage(page);
  await setCart(api, [{ productId, quantity: 1 }]);
  await checkout.goto();
  if (reload) await page.reload();
  await checkout.waitForForm();
  return checkout;
}

/** Pays on the open checkout with a new card that is saved, as "QA Engineer" with expiry 12/29. */
async function payWithNewSavedCard(checkout: CheckoutPage, card: typeof AMEX_8431): Promise<void> {
  if (await checkout.newCardOption.isVisible()) await checkout.chooseNewCard();
  await checkout.fillCard({ holder: DEMO_NAME, number: card.number, expiry: '12/29', cvc: card.cvc, save: true });
  await checkout.placeOrder();
}

test.describe('Saved cards', { tag: '@saved-cards' }, () => {
  test('CARD-001 Demo account shows its 4 saved cards', { tag: '@smoke' }, async ({ demoPage: page, demoApi }) => {
    const checkout = await openCheckout(page, demoApi);

    await expect(checkout.savedCards).toHaveCount(4);
    for (const card of Object.values(DEMO_CARDS)) {
      await expect(checkout.savedCard(card.last4).locator('label')).toHaveText(new RegExp(`^${escapeRegex(label(card))}`));
    }
  });

  test('CARD-002 New account has no saved cards', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
    const checkout = await openCheckout(page, api);

    await expect(checkout.form.getByText('Saved cards', { exact: true })).toHaveCount(0);
    await expect(checkout.savedCards).toHaveCount(0);
    await expect(checkout.newCardOption).toBeChecked();
    await expect(checkout.newCardForm).toBeVisible();
  });

  test('CARD-003 Remove a saved card', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    await saveCards(CARDS.visa, CARDS.mastercard, CARDS.declined);
    const checkout = await openCheckout(page, api);

    await checkout.removeCardButton('Visa •••• 0002').click();

    await expect(checkout.savedCard(CARDS.declined.last4)).toHaveCount(0);
    await expect(checkout.savedCards).toHaveCount(2);
    await checkout.notifications.expectShown('info', { message: 'Visa •••• 0002 was removed from your saved cards.' });
  });

  test('CARD-004 Removing the selected card selects the next usable one', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    await saveCards(CARDS.visa, CARDS.mastercard, CARDS.declined);
    const checkout = await openCheckout(page, api);
    await expect(checkout.savedCardRadio(CARDS.visa.last4)).toBeChecked();

    await checkout.removeCardButton(`Visa •••• ${CARDS.visa.last4}`).click();
    await expect(checkout.savedCardRadio(CARDS.mastercard.last4)).toBeChecked();

    await checkout.removeCardButton(`Mastercard •••• ${CARDS.mastercard.last4}`).click();
    await expect(checkout.savedCardRadio(CARDS.declined.last4)).toBeChecked();
    await checkout.removeCardButton(`Visa •••• ${CARDS.declined.last4}`).click();

    await expect(checkout.newCardOption).toBeChecked();
    await expect(checkout.newCardForm).toBeVisible();
  });

  test('CARD-005 Removed card stays removed after reload', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    await saveCards(CARDS.visa, CARDS.declined);
    const checkout = await openCheckout(page, api);
    await checkout.removeCardButton('Visa •••• 0002').click();
    await expect(checkout.savedCard(CARDS.declined.last4)).toHaveCount(0);

    await page.reload();
    await checkout.waitForForm();

    await expect(checkout.savedCard(CARDS.visa.last4)).toBeVisible();
    await expect(checkout.savedCard(CARDS.declined.last4)).toHaveCount(0);
  });

  test('CARD-006 Card saved at checkout appears in the list', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    await saveCards(CARDS.visa);
    await ensureStock(api, markHighlighter.id, 1);
    const first = await openCheckout(page, api, markHighlighter.id);

    await payWithNewSavedCard(first, AMEX_8431);
    await expect(page).toHaveURL(/#order\//);

    const checkout = await openCheckout(page, api, stillMug.id, true);
    await expect(checkout.savedCard(AMEX_8431.last4).locator('label')).toHaveText(
      new RegExp(`^${escapeRegex(label({ brand: 'amex', last4: AMEX_8431.last4, expMonth: 12, expYear: 2029, expired: false }))}`),
    );
  });

  test('CARD-007 Saving the same card again does not duplicate it', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    await saveCards({ holder: DEMO_NAME, number: AMEX_8431.digits, expiry: '12/29', cvc: AMEX_8431.cvc });
    await ensureStock(api, markHighlighter.id, 1);
    const checkout = await openCheckout(page, api, markHighlighter.id);

    await payWithNewSavedCard(checkout, AMEX_8431);
    await expect(page).toHaveURL(/#order\//);

    const again = await openCheckout(page, api, stillMug.id, true);
    await expect(again.savedCard(AMEX_8431.last4)).toHaveCount(1);
    expect(((await (await api.cards.list()).json()) as SavedCard[]).filter((c) => c.last4 === AMEX_8431.last4)).toHaveLength(1);
  });

  test('CARD-008 A sixth card cannot be saved', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    await saveCards(CARDS.visa, CARDS.mastercard, CARDS.declined, CARDS.amex, APPROVED_CARDS[1]!);
    const checkout = await openCheckout(page, api);

    await payWithNewSavedCard(checkout, AMEX_8431);

    const message = 'You can save at most 5 cards. Untick "Save this card" or remove one';
    await checkout.notifications.expectShown('error', { title: 'Order was not placed', message });
    await expect(page).toHaveURL(/#checkout$/);
    expect(await (await api.orders.list()).json()).toEqual([]);
    expect(await (await api.cards.list()).json()).toHaveLength(5);
  });
});
