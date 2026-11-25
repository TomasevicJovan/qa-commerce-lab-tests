/**
 * Reference data of the catalog, copied from qa-commerce-lab docs/BUSINESS.md and the seed data.
 * Tests compare the shop against these values and never read expected values from the shop itself,
 * so a wrong number in the shop can never become the expected number.
 */

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

const categoryNamed = (name: string): CategoryData => {
  const found = CATEGORY_TREE.find((c) => c.name === name);
  if (!found) throw new Error(`Unknown category ${name}`);
  return found;
};
const subcategoryNamed = (name: string) => {
  const found = SUBCATEGORIES.find((s) => s.name === name);
  if (!found) throw new Error(`Unknown subcategory ${name}`);
  return found;
};

/** Categories by name, for tests that need one particular category. */
export const CATEGORY = {
  electronics: categoryNamed('Electronics'),
  homeLiving: categoryNamed('Home & Living'),
  officeSchool: categoryNamed('Office & School'),
  sportsOutdoors: categoryNamed('Sports & Outdoors'),
  travelBags: categoryNamed('Travel & Bags'),
  garden: categoryNamed('Garden'),
  kidsToys: categoryNamed('Kids & Toys'),
  beautyHealth: categoryNamed('Beauty & Health'),
  pets: categoryNamed('Pets'),
} as const;

/** Subcategories (with their parent category) that tests use by name. */
export const SUBCATEGORY = {
  audio: subcategoryNamed('Audio'),
  gaming: subcategoryNamed('Gaming'),
  kitchen: subcategoryNamed('Kitchen'),
  workspace: subcategoryNamed('Workspace'),
  cycling: subcategoryNamed('Cycling'),
  cats: subcategoryNamed('Cats'),
} as const;

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
  /** Popularity score, only for products whose rank a test checks. */
  popularity?: number;
  /** Black Friday badge percentage, worked out by hand, for the product that anchors the badge check. */
  dealPercent?: number;
  seedStock: number;
}

const p = (id: string, name: string, category: string, subcategory: string, price: number, seedStock: number, extra: Partial<ProductData> = {}): ProductData =>
  ({ id, name, category, subcategory, price, seedStock, ...extra });

/** Products referenced by test cases. Prices in cents. */
export const PRODUCTS = {
  arcHeadphones: p('p1', 'Arc Wireless Headphones', 'Electronics', 'Audio', 12_900, 12, { popularity: 95 }),
  orbitLamp: p('p2', 'Orbit Desk Lamp', 'Office & School', 'Workspace', 7_900, 8),
  loopKeyboard: p('p3', 'Loop Mechanical Keyboard', 'Electronics', 'Computer Accessories', 14_900, 5),
  fieldBackpack: p('p4', 'Field Everyday Backpack', 'Travel & Bags', 'Bags & Backpacks', 8_900, 3),
  stillMug: p('p5', 'Still Ceramic Mug', 'Home & Living', 'Kitchen', 2_400, 20),
  pocketSpeaker: p('p6', 'Pocket Mini Speaker', 'Electronics', 'Audio', 5_900, 1),
  pebbleClock: p('p7', 'Pebble Desk Clock', 'Office & School', 'Workspace', 4_500, 7),
  foldOrganizer: p('p8', 'Fold Travel Organizer', 'Travel & Bags', 'Travel Accessories', 3_500, 9),
  brewKettle: p('p10', 'Brew Pour-Over Kettle', 'Home & Living', 'Kitchen', 6_900, 10, { compareAtPrice: 9_900 }),
  pulseController: p('p16', 'Pulse Wireless Controller', 'Electronics', 'Gaming', 5_900, 14, { compareAtPrice: 7_900, popularity: 92 }),
  novaChair: p('p19', 'Nova Gaming Chair', 'Electronics', 'Gaming', 24_900, 3, { compareAtPrice: 34_900 }),
  eyeCamera: p('p22', 'Eye Indoor Camera', 'Electronics', 'Smart Home', 6_900, 8, { compareAtPrice: 11_500, dealPercent: 40 }),
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
  haloVase: p('p9', 'Halo Glass Vase', 'Home & Living', 'Decor', 6_200, 4),
  domeLamp: p('p15', 'Dome Pendant Lamp', 'Home & Living', 'Lighting', 11_900, 4),
  arenaMouse: p('p17', 'Arena Gaming Mouse', 'Electronics', 'Gaming', 4_900, 11),
  deckStand: p('p18', 'Deck Headset Stand', 'Electronics', 'Gaming', 2_500, 20, { freeShipping: true }),
  senseSmartPlug: p('p20', 'Sense Smart Plug (2-pack)', 'Electronics', 'Smart Home', 2_900, 25, { compareAtPrice: 3_900, freeShipping: true }),
  coreDumbbells: p('p24', 'Core Adjustable Dumbbells', 'Sports & Outdoors', 'Fitness', 17_900, 4),
  ridgeTent: p('p28', 'Ridge Two-Person Tent', 'Sports & Outdoors', 'Outdoor & Camping', 15_900, 3),
  chargeStand: p('p39', 'Charge 3-in-1 Stand', 'Electronics', 'Phones & Tablets', 6_400, 10, { compareAtPrice: 8_900 }),
  studioSpeakers: p('p42', 'Studio Bookshelf Speakers', 'Electronics', 'Audio', 21_900, 4, { compareAtPrice: 27_900 }),
  riseLaptopStand: p('p43', 'Rise Laptop Stand', 'Office & School', 'Workspace', 4_900, 12, { freeShipping: true }),
  budEarbuds: p('p49', 'Bud True Wireless Earbuds', 'Electronics', 'Audio', 7_900, 15, { compareAtPrice: 9_900 }),
} as const;

/** An id that no product has. */
export const UNKNOWN_PRODUCT_ID = 'does-not-exist';

/** Catalog product ids are p1 … p89; `productId(n)` builds one, for tests that need many different products. */
export const productId = (n: number): string => `p${n}`;

/** Values the product list API accepts (docs/API.md). */
export const QUERY = {
  deal: { blackFriday: 'black-friday' },
  sort: { priceLowHigh: 'price', priceHighLow: 'price-desc', popular: 'popular' },
  freeShipping: { yes: 'true', no: 'false' },
} as const;

/** First products of the list in catalog order, and the cheapest and most expensive products. */
export const LIST_ORDER = {
  firstThree: [PRODUCTS.arcHeadphones, PRODUCTS.orbitLamp, PRODUCTS.loopKeyboard],
  mostPopularThree: [PRODUCTS.arcHeadphones, PRODUCTS.pulseController, PRODUCTS.senseSmartPlug],
  lowestPrice: PRODUCTS.markHighlighter.price,
  mostExpensive: PRODUCTS.novaChair,
  /** The only product on the last page (89 products, 8 per page). */
  last: PRODUCTS.glowNightLight,
} as const;

/** Product rows on the home page: how many products each holds and what comes first. */
export const HOME_ROWS = {
  'black-friday': { size: 12, first: PRODUCTS.pulseController },
  popular: { size: 12, firstFour: [PRODUCTS.arcHeadphones, PRODUCTS.pulseController, PRODUCTS.senseSmartPlug, PRODUCTS.budEarbuds] },
  'free-shipping': { size: 12 },
  workspace: { size: 5, subcategory: 'Workspace' },
} as const;

/** Products per page on each page of a list of `total` products, e.g. 21 → [8, 8, 5]. */
export const pageSizes = (total: number, pageSize: number = CATALOG.pageSize): number[] =>
  Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => Math.min(pageSize, total - i * pageSize));

/** Products shown side by side on the home page and in lists. */
export const VISIBLE_IN_ROW = 4;
