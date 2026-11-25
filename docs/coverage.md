# Coverage

Planned test cases per feature and how many are automated.

Status: every planned test case is automated. Each test title starts with its case ID, so a case can be found in the code and in the report by searching for it.

## By feature

| Feature | Tag | Risk | UI | API | Total | Smoke | P1 | Automated |
|---|---|---|---:|---:|---:|---:|---:|---:|
| Registration and sign-in | `@auth` | High | 26 | 10 | 36 | 5 | 16 | 36 |
| Search | `@search` | Medium | 14 | 7 | 21 | 2 | 2 | 21 |
| All categories dropdown | `@categories-menu` | Medium | 15 | 4 | 19 | 2 | 5 | 19 |
| Black Friday, Free shipping, popular links | `@navigation` | Medium | 12 | 4 | 16 | 3 | 7 | 16 |
| Promotion bar | `@promo` | Low | 10 | 0 | 10 | 1 | 0 | 10 |
| Home page product rows | `@home` | Low | 13 | 2 | 15 | 1 | 2 | 15 |
| All categories page | `@categories-page` | Low | 7 | 0 | 7 | 1 | 1 | 7 |
| Product list and product card | `@product-list` | Medium | 17 | 4 | 21 | 2 | 7 | 21 |
| Cart | `@cart` | Medium | 16 | 6 | 22 | 4 | 13 | 22 |
| Wishlist | `@wishlist` | Medium | 12 | 7 | 19 | 2 | 6 | 19 |
| Checkout and card payments | `@checkout` | High | 34 | 12 | 46 | 3 | 25 | 46 |
| Saved cards | `@saved-cards` | High | 8 | 6 | 14 | 2 | 9 | 14 |
| Pricing | `@pricing` | High | 5 | 18 | 23 | 2 | 10 | 23 |
| Orders, order page, payment messages | `@orders` | High | 21 | 11 | 32 | 4 | 18 | 32 |
| Help pages and footer | `@help` | Low | 15 | 2 | 17 | 1 | 1 | 17 |
| End-to-end flows | `@e2e` | High | 8 | – | 8 | 2 | 8 | 8 |
| **Total** | | | **233** | **93** | **326** | **37** | **130** | **326** |

Data-driven cases are counted once; they run once per data row (for example every category or every approved card).

## By business rule

Every rule in the shop's [business rules](https://github.com/TomasevicJovan/qa-commerce-lab/blob/main/docs/BUSINESS.md) and where it is tested.

| Rule | Covered by | UI | API |
|---|---|:---:|:---:|
| CF-01 Create an account, sign in, session timeout | Registration and sign-in, E2E-01, E2E-07 | ✓ | ✓ |
| CF-02 Browse products and fill the bag | Cart, Product list | ✓ | ✓ |
| CF-03 Successful purchase | Checkout, Orders, all E2E | ✓ | ✓ |
| CF-04 Two customers want the last item | Orders, E2E-06 | ✓ | ✓ |
| CF-05 Payment declined or timed out: order cancelled, stock returned | Checkout, Orders, E2E-03 | ✓ | ✓ |
| CF-06 Placing the same order twice creates only one | Checkout | ✓ | ✓ |
| CF-07 Price changed during checkout, shipping limits | Checkout, Pricing | ✓ | ✓ |
| CF-08 Order processing paused and resumed | Orders | ✓ | ✓ |
| CF-09 Customers see only their own orders | Orders, Registration and sign-in | ✓ | ✓ |
| CF-10 Wishlist | Wishlist, E2E-04 | ✓ | ✓ |
| CF-11 Black Friday deals | Navigation links, Home rows, Pricing, E2E-02 | ✓ | ✓ |
| CF-12 Free shipping products | Navigation links, Home rows, Pricing, E2E-05 | ✓ | ✓ |
| CF-13 Mastercard discount | Checkout, Pricing, E2E-02 | ✓ | ✓ |
| CF-14 Saved cards | Saved cards, Checkout, E2E-01 | ✓ | ✓ |
| CF-15 Card payments, card validation, test cards | Checkout, Help (test cards page), E2E-03, E2E-08 | ✓ | ✓ |
| Prices, discounts and shipping | Pricing, Cart | ✓ | ✓ |
| Categories | All categories dropdown, All categories page | ✓ | ✓ |
| SF-01 Header | Registration and sign-in | ✓ |  |
| SF-02 Navigation and categories menu | All categories dropdown, Navigation links | ✓ |  |
| SF-03 Promotion bar | Promotion bar | ✓ |  |
| SF-04 Home page product rows | Home page product rows | ✓ | ✓ |
| SF-05 Search and product list | Search, Product list, All categories dropdown | ✓ | ✓ |
| SF-06 Shopping help pages | Help pages and footer | ✓ | ✓ |
| SF-07 Footer | Help pages and footer | ✓ | ✓ |
| SF-08 Checkout page | Checkout | ✓ |  |
| SF-09 Notifications and the order page | Orders, Cart, Wishlist, Registration and sign-in | ✓ |  |
| SF-10 All categories page | All categories page | ✓ |  |

Rules without an API mark exist only in the browser, so they are tested only there.

## Known defects

| Defect | Case | Summary | Status |
|---|---|---|---|
| [#1](https://github.com/TomasevicJovan/qa-commerce-lab/issues/1) | CHK-012 | Country list is missing Germany | Open, test marked as expected to fail |
| [#2](https://github.com/TomasevicJovan/qa-commerce-lab/issues/2) | CART-033 | Unknown product in the cart returns 404 instead of 422 | Open, test marked as expected to fail |
| [#5](https://github.com/TomasevicJovan/qa-commerce-lab/issues/5) | CATM-015 | Category page opened by a direct link has no subcategory chips | Open, test marked as expected to fail |
| [#6](https://github.com/TomasevicJovan/qa-commerce-lab/issues/6) | CATP-003 | Garden card on the All categories page has no icon | Open, the Garden row is marked as expected to fail |
