# qa-commerce-lab-tests

[![Tests](https://github.com/TomasevicJovan/qa-commerce-lab-tests/actions/workflows/tests.yml/badge.svg)](https://github.com/TomasevicJovan/qa-commerce-lab-tests/actions/workflows/tests.yml)
[![Report](https://img.shields.io/badge/report-GitHub%20Pages-2ea44f)](https://tomasevicjovan.github.io/qa-commerce-lab-tests/)

Test automation with **Playwright and TypeScript** for [qa-commerce-lab](https://github.com/TomasevicJovan/qa-commerce-lab), a web shop called FORMA that was built to be tested. The shop has a header with search and an All categories menu, Black Friday deals, free shipping, a wishlist, a bag, a checkout page with saved and new cards, an order page that follows the payment, and help pages. Behind it run six small services, and orders are processed in the background through Apache Kafka.

Every push to `main`, every pull request, every night and every change in the shop starts the shop in Docker with fresh data, runs the whole suite and publishes the [HTML report](https://tomasevicjovan.github.io/qa-commerce-lab-tests/).

## Same shop, three test suites

| Repository | Stack | What it is for |
|---|---|---|
| **qa-commerce-lab-tests** (this one) | TypeScript, Playwright | The detailed suite: 456 tests, every field and message, OpenAPI contract checks |
| [qa-commerce-lab-tests-dotnet](https://github.com/TomasevicJovan/qa-commerce-lab-tests-dotnet) | C#, Selenium, Reqnroll | Business rules and shopping journeys in Gherkin |
| [qa-commerce-lab-tests-java](https://github.com/TomasevicJovan/qa-commerce-lab-tests-java) | Java, Selenium, Cucumber | The same feature files as the C# repository, implemented in Java |

This repository goes into detail: every field, every message and the API contract. The other two cover the business rules and the main shopping journeys in Gherkin. They share the same feature files, so one specification runs on two stacks.

## In numbers

| | |
|---|---:|
| Planned test cases | 326 |
| Automated | 326 (100%) |
| Test runs in one full run (data-driven cases run once per data row) | 456 |
| Browser tests / API tests / tests that change lab settings | 316 / 120 / 18 |
| Smoke run | 44 tests, about a minute |
| Real defects found and reported | 4 |

Every test title starts with its case ID, for example `CHK-061 Pay with each approved test card as a new card`. Search the report or the code for an ID and you find the test.

## Documentation

- [Test strategy](docs/test-strategy.md): what is tested, how, with which tools, the risks, and when testing is done.
- [Test design](docs/test-design.md): how the test cases were written (decision tables, boundary values, equivalence partitioning, state transitions, concurrency, error guessing, fault injection).
- [Coverage](docs/coverage.md): cases per feature, which business rule each feature covers, and the known defects.
- Business rules of the shop: [BUSINESS.md](https://github.com/TomasevicJovan/qa-commerce-lab/blob/main/docs/BUSINESS.md) in the shop repository.

## What is tested

| Feature | Tag | Risk | Cases |
|---|---|---|---:|
| Registration and sign-in | `@auth` | High | 36 |
| Checkout and card payments | `@checkout` | High | 46 |
| Orders, order page and payment messages | `@orders` | High | 32 |
| Prices, discounts and shipping | `@pricing` | High | 23 |
| Saved cards | `@saved-cards` | High | 14 |
| End-to-end flows | `@e2e` | High | 8 |
| Cart | `@cart` | Medium | 22 |
| Product list and product card | `@product-list` | Medium | 21 |
| Search | `@search` | Medium | 21 |
| Wishlist | `@wishlist` | Medium | 19 |
| All categories menu | `@categories-menu` | Medium | 19 |
| Black Friday, Free shipping and popular links | `@navigation` | Medium | 16 |
| Help pages and footer | `@help` | Low | 17 |
| Home page product rows | `@home` | Low | 15 |
| Promotion bar | `@promo` | Low | 10 |
| All categories page | `@categories-page` | Low | 7 |

High-risk features (money, orders, accounts) have the most cases and are tested in the browser **and** through the API. A browser test catches a broken card field that an API test would never see. An API test checks rules the browser stops earlier, such as a request with both a saved card and a new card.

Other tags: `@smoke` (the critical path), `@regression` (everything else), `@api`.

## Defects found

The tests found four real defects in the shop. Each one is reported as an issue in the shop repository, and the test that found it is marked with `test.fail()` and a link to the issue. The report shows a known defect instead of a red build. When the defect is fixed, the test starts passing and Playwright flags it, so the marker is removed.

| Issue | Test | Defect |
|---|---|---|
| [#1](https://github.com/TomasevicJovan/qa-commerce-lab/issues/1) | CHK-012 | The checkout country list is missing Germany |
| [#2](https://github.com/TomasevicJovan/qa-commerce-lab/issues/2) | CART-033 | Saving a cart with an unknown product returns 404 instead of 422 |
| [#5](https://github.com/TomasevicJovan/qa-commerce-lab/issues/5) | CATM-015 | A category page opened by a direct link has no subcategory chips |
| [#6](https://github.com/TomasevicJovan/qa-commerce-lab/issues/6) | CATP-003 | The Garden card on the All categories page has no icon |

## How the tests are built

- **Test data is created through the API.** Every test gets its own new customer. The bag, the wishlist and saved cards are prepared through the API, and the browser is used only for what the test checks. Tests do not depend on each other and run in parallel.
- **No test data is written inside the tests.** Data comes from four places, each with its own rule:

  | Kind | Where | Example |
  |---|---|---|
  | Secrets and environment | `.env` locally, repository secrets in CI; `.env.example` lists the names | Demo account email and password |
  | Expected values (what the shop is supposed to do) | `src/data/`, in git, one file per area; tables for data-driven tests in `src/data/cases/` | Products and prices, test cards, coupons, limits, every message text |
  | Values that only have to be valid | `src/core/random-data.ts` (Faker) | Customer names, emails, passwords, addresses, cardholders |
  | State a test needs | Factories and fixtures, through the API | A new customer, a bag, saved cards, a placed order |

  Random data is seeded. The run seed is printed at the start of every run and stored in the report; each test's seed is the run seed plus its title, so a test gets the same data no matter which worker runs it. `TEST_SEED=<seed> npm test` repeats a run with the same data. Boundary and invalid values (a 7-character password, a 13th month, a name of 101 characters) are part of the test design and stay fixed in `src/data/cases/`.
- **An order accepted is not an order paid.** The shop answers `202 Accepted` and processes the payment in the background. Tests wait for the order to reach its final state (confirmed, cancelled or not completed) and check the payment, the stock and the events, including the case where a failed payment releases the reserved products.
- **Prices are checked against our own calculation.** The pricing rules (SAVE10, 10% off for Mastercard, free shipping from $150 or when every product ships free) are written again in the tests and compared with the shop, on both sides of every limit.
- **Every message is checked word for word.** Field errors, notifications and banners are compared with the exact text, as part of the test for the action, not as separate tests.
- **API responses are checked against the contract.** Responses are validated against the OpenAPI document served by the running shop.
- **Settings that affect everyone run alone.** The shop has switches for testing: declined payments, slow responses, paused order processing, stale prices, a short session, changing element IDs. A switch changes the whole shop, so those tests live in `tests/scenarios` and run one at a time after everything else. The settings are restored after each test.
- **Waiting for a state, not for time.** Assertions retry until the expected state appears. The promotion bar's 5-second rotation is tested with Playwright's fake clock, so those tests take a second instead of half a minute.
- **Stock is limited.** The shop cannot restock, so tests that buy the last unit or sell a product out each use their own product. When stock runs out locally, the test says which product and how to reset the shop.

## Project structure

```text
src/
  api/          One client per area (auth, catalog, cart, wishlist, cards, orders, payments, inventory, lab) and response types
  pages/        Page objects (home, product list, categories, checkout, order, orders, wishlist, help)
    components/ Header, categories menu, promotion bar, sign-in dialog, bag, notifications, product cards, totals
  data/         Expected values, in git: catalog, cards, promotions, limits, messages, lab timings
    cases/      Tables for data-driven tests: invalid inputs, boundaries, price combinations
  core/
    fixtures.ts         New customer per test, API clients, signed-in page, lab settings with automatic reset
    random-data.ts      Seeded random values (Faker): names, emails, passwords, addresses
    pricing.ts          Our own calculation of discounts, shipping and totals
    factories/          Customers, addresses, cards, checkout requests
    flows/              Placing an order, waiting for its final state, stock checks
    schema-validator.ts OpenAPI response validation (Ajv)
    known-issues.ts     Links to the reported defects
tests/
  preflight/    Runs first: the shop is up and on its default settings
  api/          API tests, in parallel
  ui/           Browser tests (Chromium), in parallel, including the end-to-end flows
  scenarios/    Tests that change lab settings: one at a time, after everything else
```

## Run locally

You need Node.js 24 and the [shop](https://github.com/TomasevicJovan/qa-commerce-lab) running on http://localhost:3000 (with Docker, or with `npm start`).

```sh
npm ci
npx playwright install chromium
cp .env.example .env    # then fill in the demo account (DEMO_EMAIL, DEMO_PASSWORD)
npm test
npm run report
```

| Command | Runs |
|---|---|
| `npm test` | Everything: preflight, API and browser tests in parallel, then the scenarios |
| `npm run test:smoke` | The critical path |
| `npm run test:regression` | Everything tagged `@regression` |
| `npm run test:api` | API tests |
| `npm run test:e2e` | End-to-end flows |
| `npm run test:headed` | Everything, in a visible browser window |
| `npm run typecheck` | TypeScript check |

One feature: `npx playwright test --grep @checkout`. One file without preflight and scenarios: `npx playwright test tests/ui/cart.spec.ts --no-deps`. The demo account is required; the other settings in `.env.example` (address, order timeout, `TEST_SEED`) are optional.

**Reset the shop between full runs.** A full run buys products, and the shop cannot restock. Before running everything again, reset the shop's data:

```sh
# in the qa-commerce-lab folder
docker compose down --volumes && docker compose up -d --wait   # with Docker
npm run reset                                                  # without Docker, with the shop stopped
```

CI always starts from fresh data.

## Continuous integration

[`.github/workflows/tests.yml`](.github/workflows/tests.yml) runs on every push to `main`, on pull requests, nightly, manually, and every time the shop's `main` branch changes. The workflow:

1. picks the shop version: the exact commit when the shop triggered the run, the shop branch with the same name when one exists, otherwise `main`;
2. starts the shop with Docker Compose and Kafka, with fresh data;
3. installs Node.js and Chromium, checks the types and runs the suite;
4. prints the shop's logs if anything failed;
5. uploads the HTML report and publishes it to [GitHub Pages](https://tomasevicjovan.github.io/qa-commerce-lab-tests/), also when tests fail.

**One-time setup for the shop trigger.** The shop's workflow (`trigger-tests.yml`) starts this suite with a `repository_dispatch` event. It needs a fine-grained personal access token with access to this repository and **Contents: Read and write**, saved in the shop repository as the Actions secret `TESTS_REPO_TOKEN`. Without the secret, the trigger fails with a message pointing here.

## Limitations

- Lab settings are global, so the scenario tests cannot run in parallel against one shop. That would need one shop per worker.
- Browser tests run in desktop Chromium only. Mobile and other browsers are out of scope for now.
- Accessibility and screen-reader checks are not part of this suite.

## Tech stack

Playwright · TypeScript · Ajv (OpenAPI validation) · GitHub Actions · GitHub Pages · Docker Compose · Apache Kafka (in the shop)
