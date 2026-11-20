import { test, expect } from '@core/fixtures';
import { config } from '@core/config';
import { buildCredentials } from '@core/factories/user-factory';
import { OrdersPage, ShopPage } from '@pages/index';

// These tests exercise the login UI itself, so they start signed out on purpose.
test.describe('Authentication UI', () => {
  test('demo customer can sign in and sign out', { tag: ['@smoke'] }, async ({ page }) => {
    const shop = new ShopPage(page);
    await shop.goto();

    await test.step('sign in with the demo account', async () => {
      await shop.header.openSignIn();
      await shop.authDialog.signIn(config.demoUser.email, config.demoUser.password);
    });

    await expect(shop.authDialog.root).toBeHidden();
    await expect(shop.header.accountButton).toHaveText('QA Engineer · Sign out');

    await test.step('sign out', () => shop.header.signOut());
    await expect(shop.header.accountButton).toHaveText('Sign in');
    expect(await page.evaluate(() => sessionStorage.getItem('qa-token'))).toBeNull();
  });

  test('wrong password keeps the dialog open with an error', { tag: ['@regression'] }, async ({ page }) => {
    const shop = new ShopPage(page);
    await shop.goto();
    await shop.header.openSignIn();

    await shop.authDialog.signIn(config.demoUser.email, 'WrongPassword1!');

    await expect(shop.authDialog.error).toHaveText('Invalid email or password');
    await expect(shop.authDialog.root).toBeVisible();
    await expect(shop.header.accountButton).toHaveText('Sign in');
  });

  test('new visitor can register and is signed in immediately', { tag: ['@regression'] }, async ({ page }) => {
    const shop = new ShopPage(page);
    const user = buildCredentials();
    await shop.goto();

    await test.step('register through the dialog', async () => {
      await shop.header.openSignIn();
      await shop.authDialog.register(user.name, user.email, user.password);
    });

    await expect(shop.header.accountButton).toHaveText(`${user.name} · Sign out`);
  });

  test('visitor adding to bag is asked to sign in first', { tag: ['@regression'] }, async ({ page }) => {
    const shop = new ShopPage(page);
    await shop.goto();

    await shop.addToBag('Orbit Desk Lamp');

    await expect(shop.authDialog.title).toHaveText('Welcome back');
    await expect(shop.header.bagCount).toHaveText('0');
  });

  test('orders page asks a visitor to sign in', { tag: ['@regression'] }, async ({ page }) => {
    const orders = new OrdersPage(page);
    await orders.goto();

    await expect(orders.signedOutMessage).toBeVisible();
    await expect(orders.signInButton).toBeVisible();
  });
});
