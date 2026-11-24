// Shapes returned by the lab API. Money is always integer USD cents.

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Session {
  token: string;
  user: User;
  expiresAt: number;
}

export interface Credentials {
  name: string;
  email: string;
  password: string;
}

/** Error body of every 4xx response. `field` names the invalid input when one field caused it. */
export interface ApiError {
  error: string;
  field?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  compareAtPrice: number | null;
  deal: 'black-friday' | null;
  freeShipping: boolean;
  popularity: number;
  stock: number;
  icon: string;
  color: string;
  description: string;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

export type ProductSort = 'price' | 'price-desc' | 'popular';

export interface ProductQuery {
  q?: string;
  category?: string;
  subcategory?: string;
  deal?: string;
  freeShipping?: string | boolean;
  sort?: ProductSort | string;
  page?: number | string;
  limit?: number | string;
}

export interface SubcategorySummary {
  name: string;
  popular: boolean;
  productCount: number;
}

export interface CategorySummary {
  name: string;
  productCount: number;
  subcategories: SubcategorySummary[];
}

export type Inventory = Record<string, number>;

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface WishlistItem {
  productId: string;
  addedAt: string;
}

export type CardBrand = 'visa' | 'mastercard' | 'amex';

/** Card details as typed by the customer. Never stored or returned by the lab. */
export interface NewCard {
  holder: string;
  number: string;
  expiry: string;
  cvc: string;
}

/** A saved card as returned by GET /cards: never the full number or the security code. */
export interface SavedCard {
  id: string;
  holder: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  expired: boolean;
  createdAt: string;
}

export interface Address {
  name: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

export type PaymentMethod = 'card' | 'test-wallet';

export interface CheckoutRequest {
  address: Address;
  paymentMethod: PaymentMethod;
  savedCardId?: string;
  card?: NewCard;
  saveCard?: boolean;
  coupon?: string;
  expectedTotal: number;
}

export type OrderStatus = 'pending' | 'payment_pending' | 'compensating' | 'confirmed' | 'rejected' | 'cancelled';

export const TERMINAL_STATUSES: readonly OrderStatus[] = ['confirmed', 'rejected', 'cancelled'];

export interface OrderLine extends CartItem {
  name: string;
  unitPrice: number;
  freeShipping: boolean;
}

export interface OrderPayment {
  method: PaymentMethod;
  brand?: CardBrand;
  last4?: string;
  savedCardId?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderLine[];
  address: Address;
  paymentMethod: PaymentMethod;
  payment: OrderPayment;
  coupon: string;
  subtotal: number;
  couponDiscount: number;
  paymentDiscount: number;
  discount: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
  history: { status: OrderStatus; at: string; eventId?: string }[];
}

export interface Payment {
  id?: string;
  orderId: string;
  method?: PaymentMethod;
  brand?: CardBrand;
  last4?: string;
  amount?: number;
  status: 'pending' | 'approved' | 'failed';
  reason?: string | null;
  createdAt?: string;
}

export interface LabConfig {
  locatorMode: 'stable' | 'dynamic';
  renderDelay: number;
  apiDelay: number;
  paymentMode: 'approve' | 'decline' | 'timeout';
  paymentDelay: number;
  pauseInventory: boolean;
  pausePayments: boolean;
  duplicateEvents: boolean;
  stalePrice: boolean;
  rateLimit: boolean;
  sessionSeconds: number;
}

export interface LabStatus {
  transport: 'local' | 'kafka';
  services: { service: string; status: string; eventError?: string | null; pendingEvents?: number }[];
}

export interface LabEvent {
  seq: number;
  id: string;
  originalId?: string;
  type: string;
  orderId: string;
  data: Record<string, unknown>;
  createdAt: string;
}
