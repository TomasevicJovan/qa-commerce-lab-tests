import { test, expect } from '@core/fixtures';
import { HomePage } from '@pages/index';

const SHELVES = [
  ['Black Friday deals', 'Up to 40% off, while stock lasts'],
  ['Most popular', 'What everyone is adding to their bag'],
  ['Free shipping picks', 'Fill a bag with these and shipping is on us'],
  ['Better desk days', 'Workspace essentials'],
];

test.describe('Home page product rows', { tag: '@home' }, () => {
  test('HOME-001 Home page shows the 4 rows in order with exact titles and subtitles', { tag: '@smoke' }, async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(home.shelves.locator('h2')).toHaveText(SHELVES.map(([title]) => title as string));
    await expect(home.shelves.locator('.shelf-head p')).toHaveText(SHELVES.map(([, subtitle]) => subtitle as string));
  });
});
