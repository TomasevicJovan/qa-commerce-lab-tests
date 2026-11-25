/** Carts the API must refuse, from the cart rules in BUSINESS.md. */
import { API_ERRORS } from '@data/messages';
import { LIMITS } from '@data/limits';
import { PRODUCTS, productId } from '@data/catalog';

const id = PRODUCTS.arcHeadphones.id;
const { min, max } = LIMITS.cartQuantity;

export const INVALID_CARTS: { name: string; items: unknown; error: string }[] = [
  { name: `quantity ${min - 1}`, items: [{ productId: id, quantity: min - 1 }], error: API_ERRORS.cart.invalidItems },
  { name: 'negative quantity', items: [{ productId: id, quantity: -1 }], error: API_ERRORS.cart.invalidItems },
  { name: 'quantity 1.5', items: [{ productId: id, quantity: 1.5 }], error: API_ERRORS.cart.invalidItems },
  { name: `quantity ${max + 1}`, items: [{ productId: id, quantity: max + 1 }], error: API_ERRORS.cart.invalidItems },
  { name: 'same product twice', items: [{ productId: id, quantity: 1 }, { productId: id, quantity: 1 }], error: API_ERRORS.cart.invalidItems },
  {
    name: `${LIMITS.cartLines + 1} different products`,
    items: Array.from({ length: LIMITS.cartLines + 1 }, (_, i) => ({ productId: productId(i + 1), quantity: 1 })),
    error: API_ERRORS.cart.tooManyItems,
  },
  { name: 'items not a list', items: { productId: id, quantity: 1 }, error: API_ERRORS.cart.tooManyItems },
];
