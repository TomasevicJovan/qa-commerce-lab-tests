import { test, expect } from '@core/fixtures';
import { HomePage, ProductListPage, CheckoutPage } from '@pages/index';
import { PRODUCTS } from '@core/test-data';
import { setCart } from '@core/flows/order-flow';
import { formatUsd } from '@core/pricing';

test.describe('Cart', { tag: '@cart' }, () => {
  test('CART-001 Add to bag adds the product', { tag: '@smoke' }, async ({ signedInPage: page }) => {
    const list = new ProductListPage(page);
    const product = PRODUCTS.arcHeadphones;
    await list.goto({ q: 'headphones' });

    await list.grid.addToBag(product.name);

    await expect(list.header.bagCount).toHaveText('1');
    await list.notifications.expectShown('success', { title: 'Added to your bag', message: `${product.name} was added to your bag.` });
  });

  test('CART-010 Bag shows each product with name, price and quantity', { tag: '@smoke' }, async ({ signedInPage: page, api }) => {
    const home = new HomePage(page);
    const arc = PRODUCTS.arcHeadphones;
    const orbit = PRODUCTS.orbitLamp;
    await setCart(api, [{ productId: arc.id, quantity: 1 }, { productId: orbit.id, quantity: 2 }]);
    await home.goto();

    await home.header.openBag();

    await expect(home.bag.title).toHaveText('Your shopping bag');
    await expect(home.bag.lines).toHaveCount(2);
    await expect(home.bag.line(arc.name)).toContainText(formatUsd(arc.price));
    await expect(home.bag.quantityOf(arc.name)).toHaveText('1');
    await expect(home.bag.line(orbit.name)).toContainText(formatUsd(orbit.price));
    await expect(home.bag.quantityOf(orbit.name)).toHaveText('2');
  });

  test('CART-017 Continue to checkout opens the checkout page', { tag: '@smoke' }, async ({ signedInPage: page, api }) => {
    const home = new HomePage(page);
    const checkout = new CheckoutPage(page);
    await setCart(api, [{ productId: PRODUCTS.stillMug.id, quantity: 1 }]);
    await home.goto();

    await home.header.openBag();
    await home.bag.continueToCheckout();

    await expect(home.bag.root).not.toBeVisible();
    await expect(page).toHaveURL(/#checkout$/);
    await expect(checkout.heading).toHaveText('Checkout');
  });
});
