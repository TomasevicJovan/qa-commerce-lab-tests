import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

/** WCAG 2.0 and 2.1, levels A and AA: the usual legal and contractual baseline. */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
type Violation = AxeResults['violations'][number];

export interface KnownViolation {
  /** axe rule id, e.g. "color-contrast". */
  rule: string;
  /** Link to the tracked defect. */
  issue: string;
  /** CSS targets as axe reports them (e.g. "#cart-open"). Omit to tolerate the rule on every element. */
  targets?: string[];
}

export interface ScanOptions {
  /** Limit the scan to one region, e.g. an open dialog. */
  include?: string;
  /** Violations already tracked as defects. Anything not listed here still fails the test. */
  knownViolations?: KnownViolation[];
}

const targetOf = (node: Violation['nodes'][number]) => node.target.join(' ');

/**
 * Runs axe-core on the current page state. Every rule is evaluated; the raw violations are
 * attached to the report, then tracked defects are filtered out so the test fails only on new ones.
 * A tracked defect that no longer reproduces is annotated, as a hint that its issue may be fixed.
 */
export async function scanAccessibility(page: Page, testInfo: TestInfo, options: ScanOptions = {}): Promise<Violation[]> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (options.include) builder = builder.include(options.include);
  const { violations } = await builder.analyze();

  await testInfo.attach('axe-violations.json', {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  });

  const known = options.knownViolations ?? [];
  for (const k of known) {
    const found = violations.some((v) => v.id === k.rule && v.nodes.some((n) => !k.targets || k.targets.includes(targetOf(n))));
    testInfo.annotations.push({
      type: 'issue',
      description: `${k.rule}${k.targets ? ` on ${k.targets.join(', ')}` : ''} ${found ? 'tolerated' : 'NOT reproduced, check if fixed'}: ${k.issue}`,
    });
  }

  return violations
    .map((v) => {
      const tolerated = known.filter((k) => k.rule === v.id);
      if (!tolerated.length) return v;
      const nodes = v.nodes.filter((n) => !tolerated.some((k) => !k.targets || k.targets.includes(targetOf(n))));
      return { ...v, nodes };
    })
    .filter((v) => v.nodes.length > 0);
}

function describe(violation: Violation): string {
  const targets = violation.nodes.map((node) => `    ${targetOf(node)}`).join('\n');
  return `[${violation.impact}] ${violation.id}: ${violation.help}\n  ${violation.helpUrl}\n${targets}`;
}

/** Fails on serious and critical violations; moderate and minor ones are only reported. */
export function expectNoSeriousViolations(violations: Violation[]): void {
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking.map((v) => v.id), `Accessibility violations:\n${blocking.map(describe).join('\n')}`).toEqual([]);
}
