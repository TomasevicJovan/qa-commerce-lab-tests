/** Search terms and the products each one must find, from the catalog seed data. */
import { PRODUCTS } from '@data/catalog';

const p = PRODUCTS;

export const SEARCHES = {
  /** Matches one product name. */
  byName: { term: 'headphones', results: [p.arcHeadphones] },
  /** Matches two product names. */
  twoNames: { term: 'speaker', results: [p.pocketSpeaker, p.studioSpeakers] },
  /** Matches a subcategory name, so every product in it. */
  bySubcategory: { term: 'gaming', subcategory: 'Gaming', results: [p.pulseController, p.arenaMouse, p.deckStand, p.novaChair] },
  /** Matches a category name, so every product in it. */
  byCategory: { term: 'pets', category: 'Pets', count: 6 },
  /** Two lamps with different prices, for sorting results. */
  lamps: { term: 'lamp', resultsByPrice: [p.orbitLamp, p.domeLamp] },
  /** A short term with a single match. */
  mug: { term: 'mug', result: p.stillMug },
  vase: { term: 'vase' },
  /** "stand" inside Electronics finds two products; Rise Laptop Stand is in Office & School. */
  withinCategory: { term: 'stand', category: 'Electronics', results: [p.chargeStand, p.deckStand], outside: p.riseLaptopStand },
  /** A term that matches many products, for paging. */
  manyResults: 'a',
  noMatch: 'teleporter',
  /** HTML that must be shown as text. */
  html: '<b>test</b>',
} as const;

/** The same term with upper case and surrounding spaces: search ignores both. */
export const messy = (term: string): string => `  ${term.toUpperCase()}  `;
