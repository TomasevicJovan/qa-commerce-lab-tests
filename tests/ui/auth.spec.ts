import { test, expect } from '@core/fixtures';
import type { Page } from '@playwright/test';
import { buildCredentials } from '@core/factories/user-factory';
import { random } from '@core/random-data';
import { config } from '@core/config';
import { setCart } from '@core/flows/order-flow';
import { CheckoutPage, HomePage, OrdersPage, WishlistPage } from '@pages/index';
import { AUTH_TEXT, DEMO_ACCOUNT, PRODUCTS } from '@data/index';
import { INVALID_EMAILS, NAME_MAX, PASSWORD, differentlyTyped } from '@data/cases/auth';

const { errors, notifications } = AUTH_TEXT;

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
  await expect(home.authDialog.title).toHaveText(AUTH_TEXT.registerTitle);
  return home;
}

async function openSignIn(page: Page): Promise<HomePage> {
  const home = new HomePage(page);
  await home.goto();
  await home.header.openSignIn();
  await expect(home.authDialog.title).toHaveText(AUTH_TEXT.signInTitle);
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
      await expect(home.header.accountButton).toHaveText(AUTH_TEXT.accountButton(DEMO_ACCOUNT.name));
    });

    test('AUTH-003 Footer link opens the registration dialog', { tag: '@regression' }, async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.footerLink(AUTH_TEXT.footerRegisterLink).click();

      await expect(home.authDialog.root).toBeVisible();
      await expect(home.authDialog.title).toHaveText(AUTH_TEXT.registerTitle);
    });

    test('AUTH-004 Register with valid data signs the customer in', { tag: '@smoke' }, async ({ page }) => {
      const home = await openRegistration(page);
      const { name, email, password } = buildCredentials();

      await home.authDialog.register(name, email, password);

      await expect(home.authDialog.root).not.toBeVisible();
      await expect(home.header.accountButton).toHaveText(AUTH_TEXT.accountButton(name));
      await expect(home.header.createAccountButton).toBeHidden();
      await home.notifications.expectShown('success', {
        title: notifications.accountCreated.title,
        message: notifications.accountCreated.message(name),
      });
    });

    test('AUTH-005 Empty name shows an error', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      const requests = watchAuthRequests(page);
      const { email, password } = buildCredentials();

      await home.authDialog.register('', email, password);

      await expect(home.authDialog.fieldError('name')).toHaveText(errors.name);
      await expect(home.authDialog.root).toBeVisible();
      expect(requests).toHaveLength(0);
    });

    for (const email of INVALID_EMAILS) {
      test(`AUTH-006 Invalid email formats show an error: "${email}"`, { tag: '@regression' }, async ({ page }) => {
        const home = await openRegistration(page);
        const requests = watchAuthRequests(page);
        const { name, password } = buildCredentials();

        await home.authDialog.register(name, email, password);

        await expect(home.authDialog.fieldError('email')).toHaveText(errors.email);
        expect(requests).toHaveLength(0);
      });
    }

    test(`AUTH-007 Password shorter than ${PASSWORD.min} characters shows an error`, { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      const requests = watchAuthRequests(page);
      const { name, email } = buildCredentials();

      await home.authDialog.register(name, email, random.password(PASSWORD.min - 1));

      await expect(home.authDialog.fieldError('password')).toHaveText(errors.passwordTooShort);
      expect(requests).toHaveLength(0);
    });

    test(`AUTH-008 Password of exactly ${PASSWORD.min} characters is accepted`, { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      const { name, email } = buildCredentials();

      await home.authDialog.register(name, email, random.password(PASSWORD.min));

      await expect(home.header.accountButton).toHaveText(AUTH_TEXT.accountButton(name));
    });

    test(`AUTH-009 Password longer than ${PASSWORD.max} characters cannot be entered`, { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);

      await home.authDialog.passwordInput.focus();
      await page.keyboard.insertText(random.password(PASSWORD.max + 1));

      expect((await home.authDialog.passwordInput.inputValue()).length).toBe(PASSWORD.max);
    });

    test('AUTH-010 Mismatched password confirmation shows an error', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      const requests = watchAuthRequests(page);
      const { name, email, password } = buildCredentials();

      await home.authDialog.register(name, email, password, `${password}x`);

      await expect(home.authDialog.fieldError('confirm')).toHaveText(errors.confirm);
      expect(requests).toHaveLength(0);
    });

    test('AUTH-011 Empty form shows the exact error for every field', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      const requests = watchAuthRequests(page);

      await home.authDialog.createAccountButton.click();

      await expect(home.authDialog.fieldError('name')).toHaveText(errors.name);
      await expect(home.authDialog.fieldError('email')).toHaveText(errors.email);
      await expect(home.authDialog.fieldError('password')).toHaveText(errors.password);
      await expect(home.authDialog.nameInput).toBeFocused();
      expect(requests).toHaveLength(0);
    });

    test('AUTH-012 Fixing a field removes its error', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      await home.authDialog.createAccountButton.click();
      await expect(home.authDialog.fieldError('name')).toHaveText(errors.name);

      await home.authDialog.nameInput.fill(random.firstName());
      await home.authDialog.nameInput.press('Tab');

      await expect(home.authDialog.fieldError('name')).toBeEmpty();
    });

    test('AUTH-013 Already registered email shows an error', { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);
      const { name, password } = buildCredentials();

      await home.authDialog.register(name, differentlyTyped(config.demoUser.email), password);

      await expect(home.authDialog.fieldError('email')).toHaveText(errors.emailTakenField);
      await expect(home.authDialog.formError).toHaveText(errors.emailTakenForm);
      await expect(home.header.accountButton).toHaveText(AUTH_TEXT.signInButton);
    });

    test(`AUTH-014 Name longer than ${NAME_MAX} characters cannot be entered`, { tag: '@regression' }, async ({ page }) => {
      const home = await openRegistration(page);

      await home.authDialog.nameInput.focus();
      await page.keyboard.insertText(random.text(NAME_MAX + 1));

      expect((await home.authDialog.nameInput.inputValue()).length).toBe(NAME_MAX);
    });

    test('AUTH-015 Dialog switches between sign in and registration', { tag: '@regression' }, async ({ page }) => {
      const home = await openSignIn(page);

      await home.authDialog.switchToRegister.click();
      await expect(home.authDialog.title).toHaveText(AUTH_TEXT.registerTitle);
      for (const field of ['name', 'email', 'password', 'confirm'] as const) await expect(home.authDialog.input(field)).toBeVisible();

      await home.authDialog.switchToSignIn.click();
      await expect(home.authDialog.title).toHaveText(AUTH_TEXT.signInTitle);
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
      await expect(home.header.accountButton).toHaveText(AUTH_TEXT.accountButton(DEMO_ACCOUNT.name));
      await expect(home.header.createAccountButton).toBeHidden();
      await home.notifications.expectShown('success', {
        title: notifications.signedIn.title,
        message: notifications.signedIn.message(DEMO_ACCOUNT.name),
      });
    });

    // Built inside the test, so generated values follow the test's seed.
    const REFUSED = [
      { id: 'AUTH-021', title: 'Wrong password shows an error', credentials: () => ({ email: config.demoUser.email, password: random.password() }) },
      { id: 'AUTH-022', title: 'Unknown email shows the same error as a wrong password', credentials: () => ({ email: random.email(), password: config.demoUser.password }) },
      { id: 'AUTH-024', title: 'Sign in with empty fields shows an error', credentials: () => ({ email: '', password: '' }) },
    ];
    for (const { id, title, credentials } of REFUSED) {
      test(`${id} ${title}`, { tag: '@regression' }, async ({ page }) => {
        const home = await openSignIn(page);
        const { email, password } = credentials();

        await home.authDialog.signIn(email, password);

        await expect(home.authDialog.formError).toHaveText(errors.invalidCredentials);
        await expect(home.authDialog.root).toBeVisible();
        await expect(home.header.accountButton).toHaveText(AUTH_TEXT.signInButton);
      });
    }

    test('AUTH-023 Email is case-insensitive at sign in', { tag: '@regression' }, async ({ page }) => {
      const home = await openSignIn(page);

      await home.authDialog.signIn(config.demoUser.email.toUpperCase(), config.demoUser.password);

      await expect(home.header.accountButton).toHaveText(AUTH_TEXT.accountButton(DEMO_ACCOUNT.name));
    });

    test('AUTH-025 Account menu shows My orders, Wishlist and Sign out', { tag: '@regression' }, async ({ signedInPage: page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.header.openAccountMenu();

      await expect(home.header.accountMenuItems).toHaveText([...AUTH_TEXT.accountMenu]);
    });

    test('AUTH-026 Sign out', { tag: '@smoke' }, async ({ signedInPage: page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.header.signOut();

      await expect(home.header.accountButton).toHaveText(AUTH_TEXT.signInButton);
      await expect(home.header.createAccountButton).toBeVisible();
      await expect(home.header.bagCount).toHaveText('0');
      await expect(home.header.wishlistCount).toHaveText('0');
      await home.notifications.expectShown('info', { message: notifications.signedOut.message });
    });

    test('AUTH-027 Session survives a page reload', { tag: '@regression' }, async ({ signedInPage: page, api, customer }) => {
      const home = new HomePage(page);
      await setCart(api, [{ productId: PRODUCTS.stillMug.id, quantity: 1 }]);
      await home.goto();
      await page.reload();
      await home.waitUntilReady();

      await expect(home.header.accountButton).toHaveText(AUTH_TEXT.accountButton(customer.name));
      await expect(home.header.bagCount).toHaveText('1');
    });
  });

  test.describe('signed-out visitors', () => {
    const PROTECTED_PAGES = [
      { name: 'My orders', open: (page: Page) => new OrdersPage(page).goto(), heading: AUTH_TEXT.signedOutPages.orders },
      { name: 'Wishlist', open: (page: Page) => new WishlistPage(page).goto(), heading: AUTH_TEXT.signedOutPages.wishlist },
      { name: 'Checkout', open: (page: Page) => new CheckoutPage(page).goto(), heading: AUTH_TEXT.signedOutPages.checkout },
    ];
    for (const { name, open, heading } of PROTECTED_PAGES) {
      test(`AUTH-029 Protected pages show Sign in and Create account: ${name}`, { tag: '@regression' }, async ({ page }) => {
        const home = new HomePage(page);
        await open(page);
        await expect(home.emptyMessageHeading).toHaveText(heading);

        await home.signedOutSignIn.click();
        await expect(home.authDialog.title).toHaveText(AUTH_TEXT.signInTitle);
        await home.authDialog.close();

        await home.signedOutCreateAccount.click();
        await expect(home.authDialog.title).toHaveText(AUTH_TEXT.registerTitle);
      });
    }

    test('AUTH-030 Bag and wishlist ask a visitor to sign in', { tag: '@regression' }, async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.header.openBag();
      await home.notifications.expectShown('info', { message: notifications.bagNeedsSignIn.message });
      await expect(home.authDialog.title).toHaveText(AUTH_TEXT.signInTitle);
      await home.authDialog.close();

      await home.products('black-friday').heart(PRODUCTS.pulseController.name).click();
      await home.notifications.expectShown('info', { message: notifications.wishlistNeedsSignIn.message });
      await expect(home.authDialog.title).toHaveText(AUTH_TEXT.signInTitle);
      await expect(home.header.bagCount).toHaveText('0');
      await expect(home.header.wishlistCount).toHaveText('0');
    });
  });
});
