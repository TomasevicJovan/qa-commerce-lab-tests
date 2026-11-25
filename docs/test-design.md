# Test design

How the test cases for the FORMA online shop were designed. The overall approach is in the [test strategy](test-strategy.md); the numbers per feature are in [coverage.md](coverage.md).

## How test cases are written

- **One case, one customer action.** A case checks one thing a customer does and everything they should see as a result (for example: the dialog closes, the name appears in the header, a success message shows).
- **Independent.** Every case prepares its own data, so cases run in any order and in parallel.
- **Exact expected results.** Messages, counts and amounts are written exactly as the shop should show them, so a failure points straight to the difference.
- **Fixed expected data.** Counts and prices are taken from the business rules, never read from the shop under test.
- **One case, many inputs.** When the rule is the same, one case runs for every category, every test card or every wrong input instead of being copied.
- **Customer journeys from small cases.** End-to-end tests chain small cases in shopping order and add the checks no single case can make: the bag total equals the checkout total equals the charged total, and stock goes down exactly once.

## Techniques

| Technique | Where it is used | Example |
|---|---|---|
| Decision table | Prices | Every combination of SAVE10, Mastercard discount, free shipping products and order amount, each with its exact total |
| Boundary values | Limits | Password 7/8 and 128/129 characters · quantity 10/11 · shipping at $149.00/$150.00 · card expiring last month/this month · wishlist 50/51 products · saved cards 5/6 |
| Equivalence partitioning | Inputs | Email: valid, missing @, missing domain, with spaces · Card number: wrong check digit, unsupported brand, approved test card, other valid card |
| State transition | Sessions and orders | Signed out → signed in → session expired · Order received → processing payment → confirmed, or → payment failed → cancelled, or → not completed |
| Rounding checks | Money | Products priced $19.95 and $12.95, where 10% ends in half a cent |
| Concurrency | Stock | Two customers buying the last item at the same time: exactly one succeeds, stock never goes below zero |
| Error guessing | Robustness | Double-clicking "Place order" (only one order is created *(idempotency)*), price changing during checkout, HTML typed into search |
| Fault injection | Failures | QA lab switches: declined payments, paused order processing, short sessions, duplicate messages between services |

## Choosing between API and browser tests

- **API tests** cover shop rules and long lists of inputs: all price combinations, all 10 test cards, every error response, customers seeing only their own data.
- **Browser tests** cover what the page itself does: each field's error message, card number formatting, menus, product rows, notifications.
- Every form field has its own browser test, because the page validates fields with its own code, and that code can break even when the API is correct.
