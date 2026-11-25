import { test, expect } from '@core/fixtures';
import { CheckoutPage, ProductListPage } from '@pages/index';
import { API_ERRORS, CARDS, CHECKOUT_TEXT, LAB, PRODUCTS, TOTALS_TEXT } from '@data/index';
import { random } from '@core/random-data';
import { calculateTotals, formatUsd } from '@core/pricing';
import { ensureStock, placeOrder, setCart, waitForTerminalOrder } from '@core/flows/order-flow';
import { pay } from '@core/factories/checkout-factory';
import type { Order, Payment } from '@api/types';

const { markHighlighter, stillMug } = PRODUCTS;

// Lab switches are global, so these tests run alone in the serial "lab-scenarios" project.
test.describe('Checkout and card payments', { tag: '@checkout' }, () => {
  test('CHK-065 Button shows progress while sending', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards, lab }) => {
    const checkout = new CheckoutPage(page);
    await saveCards(CARDS.visa);
    await ensureStock(api, markHighlighter.id, 1);
    await setCart(api, [{ productId: markHighlighter.id, quantity: 1 }]);
    await checkout.goto();
    await checkout.waitForForm();
    await lab.set({ apiDelay: LAB.slowApiMs });

    await checkout.placeOrder();

    await expect(checkout.placeOrderButton).toBeDisabled();
    await expect(checkout.placeOrderButton).toHaveText(CHECKOUT_TEXT.placingOrder);
    await expect(page).toHaveURL(/#order\//, { timeout: 10_000 });
  });

  test('CHK-066 Double click creates one order', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards, lab }) => {
    const checkout = new CheckoutPage(page);
    await saveCards(CARDS.visa);
    await ensureStock(api, markHighlighter.id, 1);
    await setCart(api, [{ productId: markHighlighter.id, quantity: 1 }]);
    await checkout.goto();
    await checkout.waitForForm();
    await lab.set({ apiDelay: LAB.doubleClickApiMs });

    await checkout.placeOrderButton.dblclick({ force: true });

    await expect(page).toHaveURL(/#order\//, { timeout: 10_000 });
    await lab.set({ apiDelay: 0 });
    expect(await (await api.orders.list()).json()).toHaveLength(1);
  });

  test('CHK-067 Changed price rejects the order and keeps the data', { tag: '@regression' }, async ({ signedInPage: page, api, saveCards, lab }) => {
    const checkout = new CheckoutPage(page);
    await saveCards(CARDS.visa);
    await ensureStock(api, stillMug.id, 1);
    await setCart(api, [{ productId: stillMug.id, quantity: 1 }]);
    await lab.set({ stalePrice: true });
    // The storefront remembers prices from product lists, so the customer browses the list first.
    const list = new ProductListPage(page);
    await page.reload();
    await list.goto({ q: stillMug.name });
    const stalePrice = stillMug.price - LAB.stalePriceCents;
    await expect(list.grid.price(stillMug.name)).toContainText(formatUsd(stalePrice));
    await checkout.goto();
    await checkout.waitForForm();
    await expect(checkout.totals.value(TOTALS_TEXT.total)).toHaveText(formatUsd(calculateTotals([{ unitPrice: stalePrice, quantity: 1 }]).total));
    const recipient = random.fullName();
    await checkout.recipient.fill(recipient);

    await checkout.placeOrder();

    const message = API_ERRORS.checkout.priceChanged(calculateTotals([{ unitPrice: stillMug.price, quantity: 1 }]).total);
    await expect(checkout.error).toHaveText(`${message} ${CHECKOUT_TEXT.refreshHint}`);
    await checkout.notifications.expectShown('error', { title: CHECKOUT_TEXT.notifications.rejected.title, message });
    await expect(page).toHaveURL(/#checkout$/);
    await expect(checkout.recipient, 'address is kept').toHaveValue(recipient);
    await expect(checkout.savedCardRadio(CARDS.visa.last4), 'payment choice is kept').toBeChecked();
    expect(await (await api.cart.get()).json(), 'bag unchanged').toEqual([{ productId: stillMug.id, quantity: 1 }]);
    expect(await (await api.orders.list()).json()).toEqual([]);
  });

  test('CHK-091 Lab decline fails the payment even with an approved card', { tag: ['@regression', '@api'] }, async ({ api, lab }) => {
    await lab.set({ paymentMode: 'decline' });

    const { order: accepted } = await placeOrder(api, [{ productId: markHighlighter.id, quantity: 1 }], pay.newCard(CARDS.visa));
    const order: Order = await waitForTerminalOrder(api, accepted.id);

    expect(order).toMatchObject({ status: 'cancelled', reason: 'decline' });
    const payment = (await (await api.payments.get(order.id)).json()) as Payment;
    expect(payment).toMatchObject({ status: 'failed', reason: 'decline' });
  });
});
