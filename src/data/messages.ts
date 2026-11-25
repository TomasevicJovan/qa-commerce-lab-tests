/**
 * Every text the shop shows or returns that a test checks, word for word.
 * Copied from qa-commerce-lab docs/BUSINESS.md. When the shop changes a text on purpose,
 * it changes here, in one place.
 */
import { formatUsd } from '@core/pricing';
import { PROMOTIONS } from './promotions';

/** Order numbers are shown as the first 8 characters of the order id. */
export const shortOrderId = (orderId: string): string => orderId.slice(0, 8);

const cardBrandNames = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' } as const;

/** Errors returned by the API, field by field where the API names a field. */
export const API_ERRORS = {
  auth: {
    invalidRegistration: 'Name, valid email and password of 8–128 characters required',
    emailTaken: 'Email already registered',
    invalidCredentials: 'Invalid email or password',
    sessionExpired: 'Session expired. Please sign in.',
  },
  cart: {
    invalidItems: 'Unique products with quantities 1–10 required',
    tooManyItems: 'items must contain at most 20 products',
  },
  catalog: {
    productNotFound: 'Product not found',
    invalidPagination: 'Invalid pagination',
    unknownDeal: 'Unknown deal. Use black-friday',
    invalidFreeShipping: 'freeShipping must be true or false',
  },
  wishlist: {
    full: 'Wishlist can hold at most 50 products',
  },
  cards: {
    limit: 'You can save at most 5 cards',
    notFound: 'Card not found',
  },
  checkout: {
    savedOrNewCard: 'Pay with either a saved card or a new card',
    savedCardNotFound: 'Saved card not found',
    savedCardExpired: 'This saved card has expired. Choose another card',
    cardDetailsWithWallet: 'Card details are only accepted with the card payment method',
    paymentMethod: 'Choose a payment method: card or test-wallet',
    address: 'Complete shipping address required',
    emptyCart: 'Cart is empty',
    couponExpired: 'Coupon has expired',
    couponUnknown: 'Unknown coupon',
    idempotencyConflict: 'Idempotency key already used with different request',
    idempotencyKeyRequired: 'Idempotency-Key header required (max 100 characters)',
    saveCardLimit: 'You can save at most 5 cards. Untick "Save this card" or remove one',
    priceChanged: (totalCents: number) => `Price changed. Current total is ${totalCents} cents. Refresh your cart.`,
  },
  orders: {
    notFound: 'Order not found',
    outOfStock: 'Insufficient stock',
  },
} as const;

/** Card field errors: the same text on the checkout page and in the API. */
export const CARD_ERRORS = {
  holder: 'Enter the cardholder name as it appears on the card',
  number: 'Enter a valid card number',
  brand: 'We accept Visa, Mastercard and American Express',
  expiryFormat: 'Enter the expiry date as MM/YY',
  expiryMonth: 'Expiry month must be between 01 and 12',
  expired: 'This card has expired',
  expiryTooFar: 'Expiry date is too far in the future',
  cvc3: 'Enter the 3-digit security code',
  cvc4: 'Enter the 4-digit security code',
} as const;

export const AUTH_TEXT = {
  signInTitle: 'Welcome back',
  registerTitle: 'Create your account',
  signInButton: 'Sign in',
  createAccountButton: 'Create account',
  footerRegisterLink: 'Create an account',
  accountButton: (name: string) => `${name} ▾`,
  accountMenu: ['My orders', 'Wishlist', 'Sign out'],
  errors: {
    name: 'Enter your name',
    nameTooLong: 'Use at most 100 characters',
    email: 'Enter a valid email address, for example name@example.com',
    password: 'Enter a password',
    passwordTooShort: 'Use at least 8 characters',
    confirm: 'The passwords do not match',
    emailTakenField: 'This email is already registered',
    emailTakenForm: 'An account with this email already exists. Sign in instead.',
    invalidCredentials: 'Invalid email or password',
  },
  notifications: {
    accountCreated: { title: 'Account created', message: (name: string) => `Your account was created. Welcome, ${name}!` },
    signedIn: { title: 'Welcome back', message: (name: string) => `Signed in as ${name}.` },
    signedOut: { message: 'You have been signed out.' },
    sessionExpired: { title: 'Signed out', message: 'Your session has expired. Please sign in again.' },
    bagNeedsSignIn: { message: 'Sign in to see your bag.' },
    wishlistNeedsSignIn: { message: 'Sign in to save products to your wishlist.' },
  },
  signedOutPages: {
    orders: 'Your next good thing starts here.',
    wishlist: 'Your wishlist',
    checkout: 'Sign in to check out',
    order: 'Sign in to see this order',
  },
} as const;

export const TOTALS_TEXT = {
  subtotal: 'Subtotal',
  discount: 'Discount',
  coupon: (code: string) => `Coupon ${code}`,
  mastercard: 'Mastercard 10%',
  shipping: 'Shipping',
  total: 'Total',
  freeShipping: 'On us',
  /** A discount line, shown as a negative amount. */
  minus: (cents: number) => `−${formatUsd(cents)}`,
} as const;

export const CART_TEXT = {
  title: 'Your shopping bag',
  soldOut: 'Sold out',
  lastOne: 'Last one',
  available: (units: number) => `${units} available`,
  freeShippingMark: '✓ Free shipping',
  lineFreeShipping: (price: number) => `${formatUsd(price)} · Free shipping`,
  notifications: {
    added: { title: 'Added to your bag', message: (name: string) => `${name} was added to your bag.` },
    removed: { message: (name: string) => `${name} was removed from your bag.` },
    notAdded: { title: 'Could not add to bag' },
  },
} as const;

export const WISHLIST_TEXT = {
  heading: 'Your wishlist.',
  summary: (count: number) => (count === 1 ? '1 saved product.' : `${count} saved products`),
  filledHeart: '♥',
  emptyHeart: '♡',
  notifications: {
    saved: (name: string) => `${name} was saved to your wishlist.`,
    removed: (name: string) => `${name} was removed from your wishlist.`,
  },
} as const;

export const CHECKOUT_TEXT = {
  heading: 'Checkout',
  sections: ['1 Delivery address', '2 Payment', '3 Discount code', 'Order summary'],
  placeOrder: 'Place order →',
  placingOrder: 'Placing order…',
  emptyBag: 'Your bag is empty.',
  continueShopping: 'Continue shopping →',
  countries: ['Bosnia and Herzegovina', 'Germany', 'United States'],
  summaryLine: (quantity: number, unitPrice: number) => `${quantity} × ${formatUsd(unitPrice)}`,
  savedCardExpired: 'Expired',
  mastercardPerk: '−10%',
  brandHints: { visa: 'Visa', mastercard: 'Mastercard · 10% off', amex: 'American Express' },
  addressErrors: {
    name: 'Enter the recipient name',
    line1: 'Enter the street address',
    city: 'Enter the city',
    postalCode: 'Enter the postal code',
  },
  coupon: {
    applied: (code: string) => `✓ ${code} applied: 10% off your subtotal.`,
    expired: '✗ This code has expired. Remove it to place your order.',
    unknown: '✗ We do not recognise this code. Remove it to place your order.',
  },
  refreshHint: 'Refresh the page to see the current prices.',
  notifications: {
    invalidForm: { title: 'Order not placed', message: (fields: number) => `Please fix the ${fields} highlighted fields before placing your order.` },
    rejected: { title: 'Order was not placed' },
    placed: {
      title: 'Order placed',
      message: (orderId: string) => `Order ${shortOrderId(orderId)} was placed successfully. We are processing your payment now.`,
    },
  },
} as const;

export const PAYMENT_TEXT = {
  wallet: 'Test wallet',
  savedCardsHeading: 'Saved cards',
  /** A saved card as listed at checkout, e.g. "Visa•••• 4242 Alex Smith · expires 12/30". */
  savedCardLabel: (card: { brand: keyof typeof cardBrandNames; last4: string; expMonth: number; expYear: number; expired: boolean }, holder: string) =>
    `${cardBrandNames[card.brand]}•••• ${card.last4} ${holder} · expires ${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}${card.expired ? ' · Expired' : ''}`,
  card: (brand: keyof typeof cardBrandNames, last4: string) => `${cardBrandNames[brand]} •••• ${last4}`,
  savedCardRemoved: (brand: keyof typeof cardBrandNames, last4: string) =>
    `${cardBrandNames[brand]} •••• ${last4} was removed from your saved cards.`,
} as const;

export const ORDER_TEXT = {
  eyebrow: (orderId: string) => `Order ${shortOrderId(orderId)}`,
  headings: {
    inProgress: 'Almost there.',
    confirmed: 'Thank you for your order.',
    failed: 'About your order.',
  },
  banners: {
    received: 'Order received',
    processing: 'Processing your payment',
    confirmed: (total: number) => `Payment successfulThank you! Your payment of ${formatUsd(total)} went through and the order is confirmed.`,
    declined: 'Payment failedYour card was declined. The order was cancelled, the products went back into stock and you were not charged.',
    outOfStock: 'Order not completedA product in your order is out of stock. You were not charged.',
  },
  steps: {
    confirmed: ['Order received', 'Processing payment', 'Confirmed'],
    declined: ['Order received', 'Processing payment', 'Payment failed', 'Cancelled'],
  },
  facts: { payment: 'Payment', deliverTo: 'Deliver to', placed: 'Placed' },
  itemLine: (quantity: number, name: string, unitPrice: number) => `${quantity} × ${name} · ${formatUsd(unitPrice)}`,
  notFound: 'Order not found',
  backToOrders: 'Back to my orders',
  ordersHeading: 'Your orders.',
  noOrdersLink: 'Explore the collection →',
  listHint: (total: number, payment: string, saved?: number) =>
    `${formatUsd(total)} · ${payment}${saved ? ` · saved ${formatUsd(saved)}` : ''}`,
  /** Part of the list line that only orders with a discount have. */
  listSavedMarker: '· saved',
  listStatus: { payment_pending: 'payment pending', confirmed: 'confirmed' },
  notifications: {
    paid: {
      title: 'Payment successful',
      message: (total: number, orderId: string) => `Payment of ${formatUsd(total)} was successful. Order ${shortOrderId(orderId)} is confirmed.`,
    },
    declined: {
      title: 'Payment failed',
      message: (orderId: string) => `Your card was declined. Order ${shortOrderId(orderId)} was cancelled and you were not charged.`,
    },
    outOfStock: {
      title: 'Order not completed',
      message: (orderId: string) =>
        `A product in your order is out of stock. Order ${shortOrderId(orderId)} could not be completed and you were not charged.`,
    },
    bagRestored: { title: 'Bag restored', message: 'The products are back in your bag. Try another payment method.' },
    offline: { title: 'No connection' },
    online: { message: 'The connection is back.' },
  },
} as const;

export const LIST_TEXT = {
  allProducts: 'All products',
  blackFridayHeading: 'Black Friday deals',
  freeShippingHeading: 'Free shipping',
  resultCount: (count: number) => (count === 1 ? '1 product' : `${count} products`),
  searchHeading: (term: string) => `Results for “${term}”`,
  searchChip: (term: string) => `“${term}”`,
  chips: { blackFriday: 'Black Friday', freeShipping: 'Free shipping' },
  allSubcategoriesChip: (category: string) => `All ${category}`,
  pageIndicator: (page: number, pages: number) => `Page ${page} of ${pages}`,
  breadcrumb: (...trail: string[]) => ['Home', 'All categories', ...trail].join(' › '),
  sort: {
    featured: 'Featured',
    priceLowHigh: 'Price: low to high',
    priceHighLow: 'Price: high to low',
    popular: 'Most popular',
  },
  dealBadge: (percent: number) => `Black Friday −${percent}%`,
  dealBadgePattern: /^Black Friday −\d+%$/,
} as const;

export const CATEGORIES_TEXT = {
  heading: 'All categories',
  allCategoriesLink: 'All categories →',
  shopAll: (category: string) => `Shop all ${category} →`,
  entry: (name: string, count: number) => `${name} ${count}`,
  productCount: (count: number) => `${count} products`,
} as const;

export const HOME_TEXT = {
  shelves: {
    'black-friday': { title: 'Black Friday deals', subtitle: 'Up to 40% off, while stock lasts', seeAll: '#shop?deal=black-friday&sort=popular' },
    popular: { title: 'Most popular', subtitle: 'What everyone is adding to their bag', seeAll: '#shop?sort=popular' },
    'free-shipping': { title: 'Free shipping picks', subtitle: 'Fill a bag with these and shipping is on us', seeAll: '#shop?freeShipping=true&sort=popular' },
    workspace: { title: 'Better desk days', subtitle: 'Workspace essentials', seeAll: '#shop?category=Office+%26+School&subcategory=Workspace' },
  },
  position: (from: number, to: number, of: number) => `${from}-${to} of ${of}`,
  promoCounter: (index: number) => `${index}/${PROMOTIONS.length}`,
  promoPause: 'Pause',
  promoPlay: 'Play',
} as const;

/** Help pages: slug in the address (#help/<slug>) and title. */
export const HELP_PAGES = {
  notices: 'Platform notices',
  'delivery-and-payment': 'Delivery and payment methods',
  'test-cards': 'Test cards',
  returns: 'Complaints and returns',
  faq: 'Frequently asked questions',
  'how-to-shop': 'How to shop online',
} as const;

export const HELP_TEXT = {
  faqHeading: 'Frequently asked questions',
  returnsHeading: 'Complaints and returns',
  shippingTable: [
    ['Total after discounts is $150.00 or more', 'Free'],
    ['Every product in the bag is marked “Free shipping”', 'Free'],
    ['Anything else', '$7.00 flat'],
  ],
  testCardResult: 'Payment approved',
  footerSections: ['Shopping', 'Your account', 'Deals'],
  footerLinks: {
    myOrders: 'My orders',
    wishlist: 'Wishlist',
    blackFriday: 'Black Friday',
    freeShipping: 'Free shipping',
    mostPopular: 'Most popular',
    allCategories: 'All categories',
    lab: 'QA laboratory',
    apiSpecification: 'API specification',
  },
  labHeading: 'Curiosity, in control.',
  howToShopSteps: 5,
  /** Screenshots on How to shop online, served from /help/<name>.png. */
  screenshots: ['step-1-find', 'step-2-sign-in', 'step-3-bag', 'step-4-checkout', 'step-5-order'],
} as const;

/** OpenAPI version the shop's API document declares. */
export const OPENAPI_VERSION = '3.0.3';
