# Test strategy: FORMA online shop

FORMA ([qa-commerce-lab](https://github.com/TomasevicJovan/qa-commerce-lab)) is a practice e-commerce website. Customers browse and search products, save favourites, add them to a bag, pay by card and follow their orders. Expected behaviour is defined in the shop's [business rules](https://github.com/TomasevicJovan/qa-commerce-lab/blob/main/docs/BUSINESS.md) and its API specification.

## 1. Testing approach

The goal is to confirm before every release that customers can find products, buy them, pay the correct amount and see the correct result, and that one customer can never see another customer's data.

- **Risk-based:** the features that handle money and orders get the most tests.
- **Automated first:** every test case is written so it can be automated and runs in this repository with Playwright.
- **Small test cases:** each case checks one customer action and its result, prepares its own data and can run in any order.
- **Customer journeys:** end-to-end tests chain small cases into real shopping paths and check that data stays consistent from the bag to the order.
- **Test design:** techniques used to choose test cases (decision tables, boundary values and others) are described in [test-design.md](test-design.md).

Test data:
- **Expected values** (products, prices, test cards, coupons, limits, message texts) are kept in one place in the repository (`src/data/`) and taken from the shop's business rules, so a changed rule is updated once.
- **Values that only need to be valid** (names, emails, passwords, addresses) are generated at random with Faker, so tests do not rely on one lucky value. The data is seeded and every run can be repeated with the same values.
- **Boundary and invalid values** are chosen on purpose by the test design and do not change.
- **Accounts and secrets** come from environment variables (repository secrets in CI) and are never written in the code.
- **Every test prepares its own state** through the API (its own customer, bag, cards and orders), so tests run in parallel and in any order.

Testing levels:
- **API testing:** shop rules, prices, error responses and access to data, with every response checked against the API specification.
- **UI testing:** what the customer sees and does in the browser, including every form field and message.
- **End-to-end testing:** complete purchases from search to the confirmed order.
- **Unit testing:** not part of this repository; it belongs to the shop's own code.

## 2. Types of testing

Functional:
- **UI testing:** forms, validation messages, menus, product rows, notifications, links.
- **API testing:** business rules, status codes, contract checks.
- **End-to-end testing:** registration, bag, checkout, payment and order result in one flow.
- **Regression testing:** the full suite runs before every release.
- **Smoke testing:** the critical path of every feature runs on every change.
- **Negative testing:** wrong inputs, declined cards, expired sessions, out-of-stock products.
- **Payment testing:** 10 approved test cards, declined cards, saved cards, Mastercard discount.

Non-functional:
- **Reliability:** two customers buying the last item, double-clicking "Place order", paused order processing.
- **Security (access only):** customers cannot see each other's orders or cards; signed-out users cannot use the bag or checkout; full card numbers are never shown.
- **Compatibility:** Chromium in a desktop browser window (1280 × 900).

## 3. Test coverage

In scope:
- Account: create an account, sign in, sign out, session timeout
- Finding products: search, categories menu and page, Black Friday and Free shipping links, home page rows, product list, promotion bar
- Buying: bag, wishlist, checkout, card details, saved cards
- Prices: coupons, Mastercard discount, Black Friday prices, shipping rules, rounding
- After buying: payment successful or failed, out of stock, order page, messages, My orders
- Help pages and footer

Out of scope:
- Phones and tablets (planned for later)
- Other browsers than Chromium
- Performance and load testing
- Security testing beyond access control
- Accessibility audits
- The QA lab page (a testing tool, not part of the shop)
- Password reset and email confirmation (not part of the shop)

Detailed numbers per feature: [coverage.md](coverage.md).

## 4. Tools and technologies

- **Playwright + TypeScript:** UI and API test automation
- **Ajv:** checks API responses against the OpenAPI specification
- **Faker:** seeded random test data (names, emails, addresses)
- **GitHub Actions:** starts the shop in Docker and runs the tests on every push
- **GitHub Pages:** publishes the HTML test report after every run
- **GitHub Issues:** bug tracking in the shop repository
- **QA lab (part of the shop):** creates hard-to-reproduce situations: declined payments, slow processing, short sessions, changed prices

## 5. Risk management

Risks:
- Wrong amount charged when coupon, card discount, Black Friday price and shipping combine
- Customer cannot pay because of card validation errors
- Customer is charged, or not charged, without seeing the right result
- Two customers buy the same last item
- One customer sees another customer's orders or saved cards
- Tests fail randomly and stop being trusted

Mitigation:
- Every combination of discounts and shipping is tested on the API, and checkout totals are compared with the charged total
- Every card field and message has its own test; all 10 test cards are tested
- Every payment outcome (approved, declined, out of stock) is tested together with the message the customer sees
- A dedicated test makes two customers buy the last item at the same time
- Access tests use a second customer for every order, payment and card endpoint
- Tests wait for results instead of fixed times, retries are visible in the report, and tests that change shop settings run alone

## 6. Acceptance and exit criteria

Testing starts when:
- the shop is running and all its services respond
- the QA lab is on default settings (checked automatically before the tests)

A release is ready when:
- all smoke tests pass
- all P1 tests pass
- every other failing test has an open bug report
- there is no open critical bug

## 7. Metrics and reporting

- **Execution:** tests passed, failed, skipped and retried per run
- **Coverage:** planned and automated test cases per feature, and where each business rule is tested ([coverage.md](coverage.md))
- **Defects:** open bugs by severity and priority; known bugs keep their tests, marked as expected to fail and linked to the issue
- **Reporting:** the HTML report with screenshots, videos and traces of failures is published after every run on GitHub

## 8. Roles and responsibilities

- **QA Engineer (Jovan Tomašević):** test strategy, test cases, automation framework, test runs, bug reports, release recommendation
- **Developer (shop owner):** fixes bugs, keeps the business rules and API specification up to date
