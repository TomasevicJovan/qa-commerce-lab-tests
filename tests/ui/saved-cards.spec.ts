import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { CheckoutPage } from '@pages/index';
import { API_ERRORS, CARDS, CHECKOUT_TEXT, DEMO_ACCOUNT, DEMO_CARDS, LIMITS, PAYMENT_TEXT, PRODUCTS, type TestCard } from '@data/index';
import { ensureStock, setCart } from '@core/flows/order-flow';
import { cardForm, futureExpiry } from '@core/factories/checkout-factory';
import { random } from '@core/random-data';
import type { ApiClients } from '@api/index';
import type { SavedCard } from '@api/types';

const { stillMug, markHighlighter } = PRODUCTS;
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const startsWith = (text: string) => new RegExp(`^${escapeRegex(text)}`);
/** "Visa •••• 0002": how a card is named on its Remove button and in messages. */
const cardName = (card: TestCard) => PAYMENT_TEXT.card(card.brand, card.last4);

/** Puts one product in the bag and opens checkout (reloads when the page already showed checkout once). */
async function openCheckout(page: Page, api: ApiClients, productId: string = stillMug.id, reload = false): Promise<CheckoutPage> {
  const checkout = new CheckoutPage(page);
  await setCart(api, [{ productId, quantity: 1 }]);
  await checkout.goto();
  if (reload) await page.reload();
  await checkout.waitForForm();
  return checkout;
}

/** Pays on the open checkout with a new card and ticks "Save this card". */
async function payWithNewSavedCard(checkout: CheckoutPage, card: ReturnType<typeof cardForm>): Promise<void> {
  if (await checkout.newCardOption.isVisible()) await checkout.chooseNewCard();
  await checkout.fillCard({ ...card, save: true });
  await checkout.placeOrder();
}

test.describe('Saved cards', { tag: '@saved-cards' }, () => {
  test('CARD-001 Demo account shows its 4 saved cards', { tag: '@smoke' }, async ({ demoPage: page, demoApi }) => {
    const checkout = await openCheckout(page, demoApi);

    await expect(checkout.savedCards).toHaveCount(DEMO_ACCOUNT.savedCards);
    for (const card of Object.values(DEMO_CARDS)) {
      await expect(checkout.savedCardLabel(card.last4)).toHaveText(startsWith(PAYMENT_TEXT.savedCardLabel(card, DEMO_ACCOUNT.cardholder)));
    }
  });

  test('CARD-002 New account has no saved cards', { tag: '@regression' }, async ({ signedInPage: page, api }) => {
    const checkout = await openCheckout(page, api);

    await expect(checkout.savedCardsHeading).toHaveCount(0);
    await expect(checkout.savedCards).toHaveCount(0);
    await expect(checkout.newCardOption).toBeChecked();
    await expect(checkout.newCardForm).toBeVisible();
  });

  test('CARD-003 Remove a saved card', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    await saveCards(CARDS.visa, CARDS.mastercard, CARDS.declined);
    const checkout = await openCheckout(page, api);

    await checkout.removeCardButton(cardName(CARDS.declined)).click();

    await expect(checkout.savedCard(CARDS.declined.last4)).toHaveCount(0);
    await expect(checkout.savedCards).toHaveCount(2);
    await checkout.notifications.expectShown('info', { message: PAYMENT_TEXT.savedCardRemoved(CARDS.declined.brand, CARDS.declined.last4) });
  });

  test('CARD-004 Removing the selected card selects the next usable one', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    await saveCards(CARDS.visa, CARDS.mastercard, CARDS.declined);
    const checkout = await openCheckout(page, api);
    await expect(checkout.savedCardRadio(CARDS.visa.last4)).toBeChecked();

    await checkout.removeCardButton(cardName(CARDS.visa)).click();
    await expect(checkout.savedCardRadio(CARDS.mastercard.last4)).toBeChecked();

    await checkout.removeCardButton(cardName(CARDS.mastercard)).click();
    await expect(checkout.savedCardRadio(CARDS.declined.last4)).toBeChecked();
    await checkout.removeCardButton(cardName(CARDS.declined)).click();

    await expect(checkout.newCardOption).toBeChecked();
    await expect(checkout.newCardForm).toBeVisible();
  });

  test('CARD-005 Removed card stays removed after reload', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    await saveCards(CARDS.visa, CARDS.declined);
    const checkout = await openCheckout(page, api);
    await checkout.removeCardButton(cardName(CARDS.declined)).click();
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
    const card = cardForm(CARDS.amex2);

    await payWithNewSavedCard(first, card);
    await expect(page).toHaveURL(/#order\//);

    const checkout = await openCheckout(page, api, stillMug.id, true);
    const [month, year] = card.expiry.split('/').map(Number) as [number, number];
    await expect(checkout.savedCardLabel(CARDS.amex2.last4)).toHaveText(
      startsWith(PAYMENT_TEXT.savedCardLabel({ brand: 'amex', last4: CARDS.amex2.last4, expMonth: month, expYear: 2000 + year, expired: false }, card.holder)),
    );
  });

  test('CARD-007 Saving the same card again does not duplicate it', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    const card = cardForm(CARDS.amex2);
    await saveCards({ holder: card.holder, number: CARDS.amex2.digits, expiry: card.expiry, cvc: card.cvc });
    await ensureStock(api, markHighlighter.id, 1);
    const checkout = await openCheckout(page, api, markHighlighter.id);

    await payWithNewSavedCard(checkout, card);
    await expect(page).toHaveURL(/#order\//);

    const again = await openCheckout(page, api, stillMug.id, true);
    await expect(again.savedCard(CARDS.amex2.last4)).toHaveCount(1);
    expect(((await (await api.cards.list()).json()) as SavedCard[]).filter((c) => c.last4 === CARDS.amex2.last4)).toHaveLength(1);
  });

  test('CARD-008 A sixth card cannot be saved', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards }) => {
    await saveCards(CARDS.visa, CARDS.mastercard, CARDS.declined, CARDS.amex, CARDS.visa2);
    const checkout = await openCheckout(page, api);

    await payWithNewSavedCard(checkout, cardForm(CARDS.amex2, { holder: random.cardholder(), expiry: futureExpiry() }));

    await checkout.notifications.expectShown('error', { title: CHECKOUT_TEXT.notifications.rejected.title, message: API_ERRORS.checkout.saveCardLimit });
    await expect(page).toHaveURL(/#checkout$/);
    expect(await (await api.orders.list()).json()).toEqual([]);
    expect(await (await api.cards.list()).json()).toHaveLength(LIMITS.savedCards);
  });
});
