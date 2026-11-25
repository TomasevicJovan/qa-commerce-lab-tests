/**
 * Defects found in qa-commerce-lab. Tests covering them are marked with test.fail() and link
 * the issue, so the report shows a tracked defect instead of a red build. When a defect is
 * fixed the test starts passing, Playwright reports it as "expected to fail", and the marker
 * is removed.
 */
const LAB_ISSUES = 'https://github.com/TomasevicJovan/qa-commerce-lab/issues';

export const KNOWN_ISSUES = {
  checkoutCountryMissingGermany: `${LAB_ISSUES}/1`,
  cartUnknownProductReturns404: `${LAB_ISSUES}/2`,
  categoryPageDirectLinkHasNoSubcategoryChips: `${LAB_ISSUES}/5`,
  categoryIconMissingForGarden: `${LAB_ISSUES}/6`,
} as const;

export const issue = (url: string) => ({ type: 'issue', description: url });
