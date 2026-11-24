import type { APIRequestContext } from '@playwright/test';
import { AuthApi } from './auth-api';
import { CardsApi } from './cards-api';
import { CartApi } from './cart-api';
import { CatalogApi } from './catalog-api';
import { InventoryApi } from './inventory-api';
import { LabApi } from './lab-api';
import { OrdersApi } from './orders-api';
import { PaymentsApi } from './payments-api';
import { WishlistApi } from './wishlist-api';

export type ApiClients = ReturnType<typeof createApiClients>;

/** One entry point per service, optionally authenticated with a bearer token. */
export function createApiClients(request: APIRequestContext, token?: string) {
  return {
    auth: new AuthApi(request, token),
    catalog: new CatalogApi(request, token),
    inventory: new InventoryApi(request, token),
    cart: new CartApi(request, token),
    wishlist: new WishlistApi(request, token),
    cards: new CardsApi(request, token),
    orders: new OrdersApi(request, token),
    payments: new PaymentsApi(request, token),
    lab: new LabApi(request, token),
  };
}

export * from './types';
