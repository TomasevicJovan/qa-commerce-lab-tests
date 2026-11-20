# qa-commerce-lab-tests

Playwright + TypeScript test automation for [qa-commerce-lab](https://github.com/TomasevicJovan/qa-commerce-lab), a local e-commerce app with independent services and an event-driven checkout.

> Work in progress. The full README with architecture, coverage and CI details comes with the final phase.

## Run locally

1. Start the lab (see its README), so it answers on http://localhost:3000.
2. In this repository:

```sh
npm ci
npx playwright install chromium
npm test
npm run report
```

Requires Node.js 24. Optional settings live in `.env.example`.

Tests that flip the lab's global scenario switches live in `tests/scenarios` and run alone, after the API and UI tests. To run a single file without them, add `--no-deps`:

```sh
npx playwright test tests/ui/catalog.spec.ts --no-deps
```
