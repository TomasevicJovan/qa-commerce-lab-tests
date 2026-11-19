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

export type Category = 'Audio' | 'Workspace' | 'Travel' | 'Home';

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
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

export interface ProductQuery {
  q?: string;
  category?: string;
  sort?: 'price';
  page?: number | string;
  limit?: number | string;
}

export type Inventory = Record<string, number>;

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Address {
  name: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

export type PaymentMethod = 'test-card' | 'test-wallet';

export interface CheckoutRequest {
  address: Address;
  paymentMethod: PaymentMethod;
  coupon?: string;
  expectedTotal: number;
}

export type OrderStatus = 'pending' | 'payment_pending' | 'compensating' | 'confirmed' | 'rejected' | 'cancelled';

export const TERMINAL_STATUSES: readonly OrderStatus[] = ['confirmed', 'rejected', 'cancelled'];

export interface OrderLine extends CartItem {
  name: string;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderLine[];
  address: Address;
  paymentMethod: PaymentMethod;
  coupon: string;
  subtotal: number;
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
