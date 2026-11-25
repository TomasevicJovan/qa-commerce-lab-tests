import { test, expect } from '@core/fixtures';
import { HomePage } from '@pages/index';
import { registerUser } from '@core/factories/user-factory';
import { createApiClients } from '@api/index';
import { config } from '@core/config';
import { AUTH_TEXT, LAB, PRODUCTS } from '@data/index';

const SESSION_SECONDS = LAB.shortSessionSeconds;
const SHORT_SESSION_SECONDS = LAB.apiSessionSeconds;

// The session lifetime is a global lab switch, so these tests run alone in the serial "lab-scenarios" project.
test.describe('Registration and sign-in', { tag: '@auth' }, () => {
  test('AUTH-028 Expired session signs the customer out with a message', { tag: '@regression' }, async ({ page, lab }) => {
    const home = new HomePage(page);
    await lab.set({ sessionSeconds: SESSION_SECONDS });
    await home.goto();
    await home.header.openSignIn();
    await home.authDialog.signIn(config.demoUser.email, config.demoUser.password);
    await expect(home.header.accountButton).not.toHaveText(AUTH_TEXT.signInButton);

    await page.waitForTimeout((SESSION_SECONDS + 1) * 1_000); // the session lifetime set above, plus one second
    await home.products('black-friday').addToBagButton(PRODUCTS.pulseController.name).click();

    await home.notifications.expectShown('warning', AUTH_TEXT.notifications.sessionExpired);
    await expect(home.header.accountButton).toHaveText(AUTH_TEXT.signInButton);
    await expect(home.header.bagCount).toHaveText('0');
  });

  test('AUTH-048 Expired token is rejected on every protected endpoint', { tag: ['@regression', '@api'] }, async ({ request, lab }) => {
    await lab.set({ sessionSeconds: SHORT_SESSION_SECONDS });
    const api = createApiClients(request, (await registerUser(request)).token);

    await new Promise((r) => setTimeout(r, (SHORT_SESSION_SECONDS + 1) * 1_000));

    for (const response of [await api.auth.me(), await api.cart.get(), await api.wishlist.get(), await api.cards.list(), await api.orders.list()]) {
      expect(response.status(), response.url()).toBe(401);
    }
  });

  test('AUTH-049 Session lifetime change affects only new sessions', { tag: ['@regression', '@api'] }, async ({ api, lab }) => {
    await lab.set({ sessionSeconds: SHORT_SESSION_SECONDS });

    await new Promise((r) => setTimeout(r, (SHORT_SESSION_SECONDS + 1) * 1_000));

    expect((await api.auth.me()).status(), 'the old session keeps its original expiry').toBe(200);
  });
});
