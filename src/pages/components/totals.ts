import type { Locator } from '@playwright/test';

/** Row label, e.g. TOTALS_TEXT.shipping. The labels live in src/data/messages.ts. */
export type TotalsRow = string;

/** Price summary block rendered in the bag, at checkout and on the order page. */
export class Totals {
  readonly root: Locator;

  constructor(scope: Locator) {
    this.root = scope.locator('.totals');
  }

  row(name: TotalsRow): Locator {
    return this.root.locator(':scope > div').filter({ has: this.root.page().locator('span:first-child', { hasText: new RegExp(`^${name.replace(/[%]/g, '\\$&')}$`) }) });
  }

  /** Value cell of a row, e.g. value('Shipping') -> "$7.00" or "On us". */
  value(name: TotalsRow): Locator {
    return this.row(name).locator('span').last();
  }
}
