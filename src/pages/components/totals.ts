import type { Locator } from '@playwright/test';

export type TotalsRow = 'Subtotal' | 'Discount' | 'Shipping' | 'Total';

/** Price summary block rendered in both the bag and the checkout dialog. */
export class Totals {
  constructor(private readonly scope: Locator) {}

  /** Value cell of a row, e.g. value('Shipping') -> "$7.00" or "On us". */
  value(row: TotalsRow): Locator {
    return this.scope
      .locator('.totals > div')
      .filter({ has: this.scope.page().getByText(row, { exact: true }) })
      .locator('span')
      .last();
  }
}
