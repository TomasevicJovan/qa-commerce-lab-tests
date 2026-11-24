import { test, expect } from '@core/fixtures';
import { buildCredentials } from '@core/factories/user-factory';
import { config } from '@core/config';
import { DEMO_NAME } from '@core/test-data';
import { HomePage } from '@pages/index';

test.describe('Registration and sign-in', { tag: '@auth' }, () => {
  test('AUTH-004 Register with valid data signs the customer in', { tag: '@smoke' }, async ({ page }) => {
    const home = new HomePage(page);
    const credentials = buildCredentials({ name: 'Jovan Test', password: 'Secret123' });
    await home.goto();

    await test.step('open registration from the header and submit valid data', async () => {
      await home.header.openRegistration();
      await expect(home.authDialog.title).toHaveText('Create your account');
      await home.authDialog.register(credentials.name, credentials.email, credentials.password);
    });

    await test.step('the customer is signed in', async () => {
      await expect(home.authDialog.root).not.toBeVisible();
      await expect(home.header.accountButton).toHaveText('Jovan Test ▾');
      await expect(home.header.createAccountButton).toBeHidden();
      await home.notifications.expectShown('success', { title: 'Account created', message: 'Your account was created. Welcome, Jovan Test!' });
    });
  });

  test('AUTH-020 Sign in with valid credentials', { tag: '@smoke' }, async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.header.openSignIn();
    await home.authDialog.signIn(config.demoUser.email, config.demoUser.password);

    await expect(home.authDialog.root).not.toBeVisible();
    await expect(home.header.accountButton).toHaveText(`${DEMO_NAME} ▾`);
    await expect(home.header.createAccountButton).toBeHidden();
    await home.notifications.expectShown('success', { title: 'Welcome back', message: `Signed in as ${DEMO_NAME}.` });
  });

  test('AUTH-026 Sign out', { tag: '@smoke' }, async ({ signedInPage: page }) => {
    const home = new HomePage(page);
    await home.goto();

    await home.header.signOut();

    await expect(home.header.accountButton).toHaveText('Sign in');
    await expect(home.header.createAccountButton).toBeVisible();
    await expect(home.header.bagCount).toHaveText('0');
    await expect(home.header.wishlistCount).toHaveText('0');
    await home.notifications.expectShown('info', { message: 'You have been signed out.' });
  });
});
