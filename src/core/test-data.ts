/**
 * Fixed expected data, copied from qa-commerce-lab docs/BUSINESS.md.
 * Tests compare the shop against these values and never read expected values from the shop itself,
 * so a wrong number in the shop can never become the expected number.
 */
import type { CardBrand } from '@api/types';

export const CATALOG = {
  totalProducts: 89,
  blackFridayDeals: 21,
  freeShippingProducts: 29,
  pageSize: 8,
} as const;

export interface SubcategoryData {
  name: string;
  count: number;
}
export interface CategoryData {
  name: string;
  count: number;
  subcategories: SubcategoryData[];
}

const sub = (name: string, count: number): SubcategoryData => ({ name, count });

/** Category tree in menu order, with product counts. */
export const CATEGORY_TREE: CategoryData[] = [
  { name: 'Electronics', count: 20, subcategories: [sub('Audio', 4), sub('Gaming', 4), sub('Phones & Tablets', 4), sub('Smart Home', 4), sub('Computer Accessories', 4)] },
  { name: 'Home & Living', count: 17, subcategories: [sub('Kitchen', 5), sub('Lighting', 4), sub('Decor', 4), sub('Textiles', 4)] },
  { name: 'Office & School', count: 10, subcategories: [sub('Workspace', 5), sub('Stationery', 5)] },
  { name: 'Sports & Outdoors', count: 12, subcategories: [sub('Fitness', 4), sub('Outdoor & Camping', 4), sub('Cycling', 4)] },
  { name: 'Travel & Bags', count: 7, subcategories: [sub('Bags & Backpacks', 4), sub('Travel Accessories', 3)] },
  { name: 'Garden', count: 6, subcategories: [sub('Plants & Seeds', 3), sub('Garden Tools', 3)] },
  { name: 'Kids & Toys', count: 6, subcategories: [sub('Toys & Games', 3), sub('Learning', 3)] },
  { name: 'Beauty & Health', count: 5, subcategories: [sub('Personal Care', 3), sub('Wellness', 2)] },
  { name: 'Pets', count: 6, subcategories: [sub('Dogs', 3), sub('Cats', 3)] },
];

/** Every subcategory with its parent, in menu order. */
export const SUBCATEGORIES = CATEGORY_TREE.flatMap((c) => c.subcategories.map((s) => ({ category: c.name, ...s })));

/** Popular subcategories, in the order of the navigation row. */
export const POPULAR_SUBCATEGORIES = ['Audio', 'Gaming', 'Phones & Tablets', 'Smart Home', 'Fitness'] as const;

export interface ProductData {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  compareAtPrice?: number;
  freeShipping?: boolean;
  seedStock: number;
}

const p = (id: string, name: string, category: string, subcategory: string, price: number, seedStock: number, extra: Partial<ProductData> = {}): ProductData =>
  ({ id, name, category, subcategory, price, seedStock, ...extra });

/** Products referenced by test cases. Prices in cents. */
export const PRODUCTS = {
  arcHeadphones: p('p1', 'Arc Wireless Headphones', 'Electronics', 'Audio', 12_900, 12),
  orbitLamp: p('p2', 'Orbit Desk Lamp', 'Office & School', 'Workspace', 7_900, 8),
  loopKeyboard: p('p3', 'Loop Mechanical Keyboard', 'Electronics', 'Computer Accessories', 14_900, 5),
  fieldBackpack: p('p4', 'Field Everyday Backpack', 'Travel & Bags', 'Bags & Backpacks', 8_900, 3),
  stillMug: p('p5', 'Still Ceramic Mug', 'Home & Living', 'Kitchen', 2_400, 20),
  pocketSpeaker: p('p6', 'Pocket Mini Speaker', 'Electronics', 'Audio', 5_900, 1),
  pebbleClock: p('p7', 'Pebble Desk Clock', 'Office & School', 'Workspace', 4_500, 7),
  foldOrganizer: p('p8', 'Fold Travel Organizer', 'Travel & Bags', 'Travel Accessories', 3_500, 9),
  brewKettle: p('p10', 'Brew Pour-Over Kettle', 'Home & Living', 'Kitchen', 6_900, 10, { compareAtPrice: 9_900 }),
  pulseController: p('p16', 'Pulse Wireless Controller', 'Electronics', 'Gaming', 5_900, 14, { compareAtPrice: 7_900 }),
  novaChair: p('p19', 'Nova Gaming Chair', 'Electronics', 'Gaming', 24_900, 3, { compareAtPrice: 34_900 }),
  eyeCamera: p('p22', 'Eye Indoor Camera', 'Electronics', 'Smart Home', 6_900, 8, { compareAtPrice: 11_500 }),
  trailBottle: p('p26', 'Trail Insulated Bottle', 'Sports & Outdoors', 'Outdoor & Camping', 2_900, 30, { freeShipping: true }),
  noteJournal: p('p29', 'Note Dotted Journal', 'Office & School', 'Stationery', 1_800, 40, { freeShipping: true }),
  pureToothbrush: p('p34', 'Pure Bamboo Toothbrush Set', 'Beauty & Health', 'Personal Care', 1_200, 50, { freeShipping: true }),
  pressGrinder: p('p57', 'Press Coffee Grinder', 'Home & Living', 'Kitchen', 6_400, 9),
  markHighlighter: p('p60', 'Mark Highlighter Set', 'Office & School', 'Stationery', 900, 60, { freeShipping: true }),
  jumpRope: p('p62', 'Jump Speed Rope', 'Sports & Outdoors', 'Fitness', 1_400, 40, { freeShipping: true }),
  pedalCage: p('p67', 'Pedal Bottle Cage', 'Sports & Outdoors', 'Cycling', 1_200, 30, { freeShipping: true }),
  bloomSeeds: p('p72', 'Bloom Wildflower Seed Pack', 'Garden', 'Plants & Seeds', 900, 50, { freeShipping: true }),
  featherWand: p('p84', 'Feather Wand Cat Toy', 'Pets', 'Cats', 900, 40, { freeShipping: true }),
  pocketNotebook: p('p87', 'Pocket Notebook 3-pack', 'Office & School', 'Stationery', 1_995, 30),
  twistGrip: p('p88', 'Twist Phone Grip', 'Electronics', 'Phones & Tablets', 1_295, 40),
  glowNightLight: p('p89', 'Glow Night Light', 'Home & Living', 'Lighting', 2_495, 15, { compareAtPrice: 3_495 }),
} as const;

export interface TestCard {
  brand: CardBrand;
  brandName: string;
  /** As printed on the card, with spaces. */
  number: string;
  digits: string;
  last4: string;
  cvc: string;
}

const card = (brand: CardBrand, number: string): TestCard => {
  const digits = number.replace(/\s/g, '');
  return {
    brand,
    brandName: { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' }[brand],
    number,
    digits,
    last4: digits.slice(-4),
    cvc: brand === 'amex' ? '1234' : '123',
  };
};

/** The ten published test cards that the shop approves. */
export const APPROVED_CARDS: TestCard[] = [
  card('visa', '4242 4242 4242 4242'),
  card('visa', '4111 1111 1111 1111'),
  card('visa', '4012 8888 8888 1881'),
  card('visa', '4000 0566 5566 5556'),
  card('mastercard', '5555 5555 5555 4444'),
  card('mastercard', '5105 1051 0510 5100'),
  card('mastercard', '2223 0031 2200 3222'),
  card('mastercard', '5200 8282 8282 8210'),
  card('amex', '3782 822463 10005'),
  card('amex', '3714 496353 98431'),
];

export const CARDS = {
  visa: APPROVED_CARDS[0] as TestCard,
  mastercard: APPROVED_CARDS[4] as TestCard,
  amex: APPROVED_CARDS[8] as TestCard,
  /** Valid number that the simulated bank declines. */
  declined: card('visa', '4000 0000 0000 0002'),
  /** Valid check digit, unsupported brand (Discover). */
  discover: '6011 1111 1111 1117',
  /** Fails the check digit. */
  invalidCheckDigit: '4242 4242 4242 4241',
} as const;

/** Saved cards of the demo account on fresh data. Only read, never changed, by tests. */
export const DEMO_CARDS = {
  visa: { id: 'card-demo-visa', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030, expired: false },
  mastercard: { id: 'card-demo-mastercard', brand: 'mastercard', last4: '4444', expMonth: 8, expYear: 2029, expired: false },
  declined: { id: 'card-demo-declined', brand: 'visa', last4: '0002', expMonth: 5, expYear: 2029, expired: false },
  expired: { id: 'card-demo-expired', brand: 'mastercard', last4: '5100', expMonth: 1, expYear: 2025, expired: true },
} as const;

export const DEMO_NAME = 'QA Engineer';

/** Promotion bar messages, in order. */
export const PROMOTIONS = [
  'Pay with a Mastercard and save 10% on every order, even on top of SAVE10.',
  'Black Friday: up to 40% off selected products →',
  'Free shipping from $150, or when every item in your bag ships free.',
  'Use code SAVE10 at checkout for 10% off.',
] as const;
