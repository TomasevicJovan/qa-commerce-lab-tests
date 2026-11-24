import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { buildCredentials } from '@core/factories/user-factory';
import { config } from '@core/config';
import { DEMO_NAME, PRODUCTS } from '@core/test-data';
import { setCart } from '@core/flows/order-flow';
import { HomePage } from '@pages/index';

const EMAIL_ERROR = 'Enter a valid email address, for example name@example.com';

/** Records auth requests so tests can prove that client-side validation sent nothing. */
function watchAuthRequests(page: Page): string[] {
  const requests: string[] = [];
  page.on('request', (r) => r.url().includes('/api/auth/') && requests.push(r.url()));
  return requests;
}

async function openRegistration(page: Page): Promise<HomePage> {
  const home = new HomePage(page);
  await home.goto();
  await home.header.openRegistration();
  await expect(home.authDialog.title).toHaveText('Create your account');
  return home;
}

async function openSignIn(page: Page): Promise<HomePage> {
  const home = new HomePage(page);
  await home.goto();
  await home.header.openSignIn();
  await expect(home.authDialog.title).toHaveText('Welcome back');
  return home;
}

test.describe('Registration and sign-in', { tag: '@auth' }, () => {
  test.describe('registration', () => {
    test('AUTH-001 Create account button opens the registration dialog', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);

      for (const field of ['name', 'email', 'password', 'confirm'] as const) await expect(home.authDialog.input(field)).toBeVisible();
      await expect(home.authDialog.nameInput).toBeFocused();
    });

    test('AUTH-002 Create account button is hidden when signed in', { tag: '@regression' }, async ({ demoPage: page }) => {
      const home = new HomePage(page);
      await home.goto();

      await expect(home.header.createAccountButton).toBeHidden();
      await expect(home.header.accountButton).toHaveText(`${DEMO_NAME} ▾`);
    });

    test('AUTH-003 Footer link opens the registration dialog', { tag: '@regression' }, async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.footerLink('Create an account').click();

      await expect(home.authDialog.root).toBeVisible();
      await expect(home.authDialog.title).toHaveText('Create your account');
    });

    test('AUTH-004 Register with valid data signs the customer in', { tag: '@smoke' }, async ({ page }) => {
      const home = await openRegistration(page);
      const credentials = buildCredentials({ name: 'Jovan Test', password: 'Secret123' });

      await home.authDialog.register(credentials.name, credentials.email, credentials.password);

      await expect(home.authDialog.root).not.toBeVisible();
      await expect(home.header.accountButton).toHaveText('Jovan Test ▾');
      await expect(home.header.createAccountButton).toBeHidden();
      await home.notifications.expectShown('success', { title: 'Account created', message: 'Your account was created. Welcome, Jovan Test!' });
    });

    test('AUTH-005 Empty name shows an error', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      const requests = watchAuthRequests(page);
      const { email, password } = buildCredentials();

      await home.authDialog.register('', email, password);

      await expect(home.authDialog.fieldError('name')).toHaveText('Enter your name');
      await expect(home.authDialog.root).toBeVisible();
      expect(requests).toHaveLength(0);
    });

    for (const email of ['jovan', 'jovan@', '@example.com', 'jovan@example', 'jovan @example.com']) {
      test(`AUTH-006 Invalid email formats show an error: "${email}"`, { tag: '@regression' }, async ({ page }) => {
        const home = await openRegistration(page);
        const requests = watchAuthRequests(page);

        await home.authDialog.register('Jovan Test', email, 'Secret123');

        await expect(home.authDialog.fieldError('email')).toHaveText(EMAIL_ERROR);
        expect(requests).toHaveLength(0);
      });
    }

    test('AUTH-007 Password shorter than 8 characters shows an error', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      const requests = watchAuthRequests(page);

      await home.authDialog.register('Jovan Test', buildCredentials().email, 'Secret1');

      await expect(home.authDialog.fieldError('password')).toHaveText('Use at least 8 characters');
      expect(requests).toHaveLength(0);
    });

    test('AUTH-008 Password of exactly 8 characters is accepted', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      const { name, email } = buildCredentials();

      await home.authDialog.register(name, email, 'Secret12');

      await expect(home.header.accountButton).toHaveText(`${name} ▾`);
    });

    test('AUTH-009 Password longer than 128 characters cannot be entered', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);

      await home.authDialog.passwordInput.focus();
      await page.keyboard.insertText('a'.repeat(129));

      expect((await home.authDialog.passwordInput.inputValue()).length).toBe(128);
    });

    test('AUTH-010 Mismatched password confirmation shows an error', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      const requests = watchAuthRequests(page);

      await home.authDialog.register('Jovan Test', buildCredentials().email, 'Secret123', 'Secret12');

      await expect(home.authDialog.fieldError('confirm')).toHaveText('The passwords do not match');
      expect(requests).toHaveLength(0);
    });

    test('AUTH-011 Empty form shows the exact error for every field', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      const requests = watchAuthRequests(page);

      await home.authDialog.createAccountButton.click();

      await expect(home.authDialog.fieldError('name')).toHaveText('Enter your name');
      await expect(home.authDialog.fieldError('email')).toHaveText(EMAIL_ERROR);
      await expect(home.authDialog.fieldError('password')).toHaveText('Enter a password');
      await expect(home.authDialog.nameInput).toBeFocused();
      expect(requests).toHaveLength(0);
    });

    test('AUTH-012 Fixing a field removes its error', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      await home.authDialog.createAccountButton.click();
      await expect(home.authDialog.fieldError('name')).toHaveText('Enter your name');

      await home.authDialog.nameInput.fill('Jovan');
      await home.authDialog.nameInput.press('Tab');

      await expect(home.authDialog.fieldError('name')).toBeEmpty();
    });

    test('AUTH-013 Already registered email shows an error', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);

      await home.authDialog.register('Jovan Test', ' QA@Example.com ', 'Secret123');

      await expect(home.authDialog.fieldError('email')).toHaveText('This email is already registered');
      await expect(home.authDialog.formError).toHaveText('An account with this email already exists. Sign in instead.');
      await expect(home.header.accountButton).toHaveText('Sign in');
    });

    test('AUTH-014 Name longer than 100 characters cannot be entered', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);

      await home.authDialog.nameInput.focus();
      await page.keyboard.insertText('a'.repeat(101));

      expect((await home.authDialog.nameInput.inputValue()).length).toBe(100);
    });

    test('AUTH-015 Dialog switches between sign in and registration', { tag: '@regression' }, async ({ page }) => {
      const home = await openSignIn(page);

      await home.authDialog.switchToRegister.click();
      await expect(home.authDialog.title).toHaveText('Create your account');
      for (const field of ['name', 'email', 'password', 'confirm'] as const) await expect(home.authDialog.input(field)).toBeVisible();

      await home.authDialog.switchToSignIn.click();
      await expect(home.authDialog.title).toHaveText('Welcome back');
      await expect(home.authDialog.emailInput).toBeVisible();
      await expect(home.authDialog.passwordInput).toBeVisible();
      await expect(home.authDialog.nameInput).toHaveCount(0);
      await expect(home.authDialog.confirmInput).toHaveCount(0);
    });
  });

  test.describe('sign in and sign out', () => {
    test('AUTH-020 Sign in with valid credentials', { tag: '@smoke' }, async ({ page }) => {
      const home = await openSignIn(page);

      await home.authDialog.signIn(config.demoUser.email, config.demoUser.password);

      await expect(home.authDialog.root).not.toBeVisible();
      await expect(home.header.accountButton).toHaveText(`${DEMO_NAME} ▾`);
      await expect(home.header.createAccountButton).toBeHidden();
      await home.notifications.expectShown('success', { title: 'Welcome back', message: `Signed in as ${DEMO_NAME}.` });
    });

    const REFUSED = [
      { id: 'AUTH-021', title: 'Wrong password shows an error', email: config.demoUser.email, password: 'WrongPassword1!' },
      { id: 'AUTH-022', title: 'Unknown email shows the same error as a wrong password', email: 'nobody@example.com', password: config.demoUser.password },
      { id: 'AUTH-024', title: 'Sign in with empty fields shows an error', email: '', password: '' },
    ];
    for (const { id, title, email, password } of REFUSED) {
      test(`${id} ${title}`, { tag: '@regression' }, async ({ page }) => {
        const home = await openSignIn(page);

        await home.authDialog.signIn(email, password);

        await expect(home.authDialog.formError).toHaveText('Invalid email or password');
        await expect(home.authDialog.root).toBeVisible();
        await expect(home.header.accountButton).toHaveText('Sign in');
      });
    }

    test('AUTH-023 Email is case-insensitive at sign in', { tag: '@regression' }, async ({ page }) => {
      const home = await openSignIn(page);

      await home.authDialog.signIn(config.demoUser.email.toUpperCase(), config.demoUser.password);

      await expect(home.header.accountButton).toHaveText(`${DEMO_NAME} ▾`);
    });

    test('AUTH-025 Account menu shows My orders, Wishlist and Sign out', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.header.openAccountMenu();

      await expect(home.header.accountMenu.getByRole('link').or(home.header.accountMenu.getByRole('button'))).toHaveText(['My orders', 'Wishlist', 'Sign out']);
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

    test('AUTH-027 Session survives a page reload', { tag: '@regression' }, async ({ signedInPage: page, api, customer }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: PRODUCTS.stillMug.id, quantity: 1 }]);
      await home.goto();
      await page.reload();
      await home.waitUntilReady();

      await expect(home.header.accountButton).toHaveText(`${customer.name} ▾`);
      await expect(home.header.bagCount).toHaveText('1');
    });
  });

  test.describe('signed-out visitors', () => {
    for (const { hash, title } of [
      { hash: '#orders', title: 'Your next good thing starts here.' },
      { hash: '#wishlist', title: 'Your wishlist' },
      { hash: '#checkout', title: 'Sign in to check out' },
    ]) {
      test(`AUTH-029 Protected pages show Sign in and Create account: ${hash}`, { tag: '@regression' }, async ({ page }) => {
        const home = new HomePage(page);
        await page.goto(`/${hash}`);
        await expect(home.main.getByRole('heading', { name: title })).toBeVisible();

        await home.main.getByRole('button', { name: 'Sign in' }).click();
        await expect(home.authDialog.title).toHaveText('Welcome back');
        await home.authDialog.root.press('Escape');

        await home.main.getByRole('button', { name: 'Create account' }).click();
        await expect(home.authDialog.title).toHaveText('Create your account');
      });
    }

    test('AUTH-030 Bag and wishlist ask a visitor to sign in', { tag: '@regression' }, async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.header.openBag();
      await home.notifications.expectShown('info', { message: 'Sign in to see your bag.' });
      await expect(home.authDialog.title).toHaveText('Welcome back');
      await home.authDialog.root.press('Escape');

      await home.shelf('black-friday').getByRole('button', { name: /^Add .+ to wishlist$/ }).first().click();
      await home.notifications.expectShown('info', { message: 'Sign in to save products to your wishlist.' });
      await expect(home.authDialog.title).toHaveText('Welcome back');
      await expect(home.header.bagCount).toHaveText('0');
      await expect(home.header.wishlistCount).toHaveText('0');
    });
  });
});
