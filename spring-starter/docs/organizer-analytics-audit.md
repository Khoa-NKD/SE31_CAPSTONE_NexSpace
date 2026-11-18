# Organizer analytics audit — 18 November 2026

Scope: the organizer analytics report, financial ledger/export, shared chart
formatters and refresh behavior. No production schema, booking/payment lifecycle,
sample booking amounts, or resource layout was changed by this audit.

## Corrected behavior

1. Duplicate-payment warnings are based on payment/refund events before the selected
   period's end. A future second payment cannot create a duplicate in an earlier period.
2. A matching duplicate whose excess has been refunded is informational, not a warning.
   Confirmation requires consistent expected amounts, matched receipts, enough processed
   VND refunds, and no individual over-refunded payment. Pending/approved/failed refunds
   and refunds processed after the report end cannot resolve the warning.
3. Average booking value uses the requested VND settlement amount on the first complete
   successful payment, once per booking. Ties use payment ID. Duplicate receipts and
   overpayments do not increase that average; cash totals still retain all recorded receipts.
4. A SUCCESS row that received less than its positive requested amount contributes actual
   known cash but does not establish a completely paid booking. A later complete payment
   establishes the paid-booking date. Mismatches remain visible for reconciliation.
5. Nonzero received amounts on unsuccessful transactions, including negative values, are
   flagged as incomplete financial source data. Their missing/uncertain cash-event dates
   are never guessed. Known over-refunds are flagged without clamping the ledger; unknown
   received amounts are missing data, not proof that the received amount was zero.
6. Rental overlap uses microseconds, aggregated before conversion to hours. API hours are
   rounded to four decimals and dashboard cards to two; independently rounded heatmap
   cells need not sum to the last displayed decimal of the separately rounded grand total.
7. The earliest supported comparison boundary is validated without rejecting a valid prior
   year. Ranges remain inclusive calendar dates implemented as half-open SQL intervals.
8. Refresh updates both report and ledger queries; pagination adjusts when a refreshed
   server total shrinks. Report and ledger remain separate database snapshots.

## Verified case matrix

The focused run includes **43 SQL cases on MySQL 8.4**, **6 service cases**,
**4 date-range cases**, **6 HTTP/controller and method-security cases**, and
**1 read-only local-data scenario** that reconciles eight calendar ranges.

| Area | Cases |
| --- | --- |
| Booking state | All 8 current booking statuses; paid booking count vs reserved hours; current status cohorts |
| Payment | Unpaid/failed/zero/negative/missing amounts; missing dates; underpayment; overpayment; retries; equal payment timestamps |
| Duplicates | Unresolved, partially refunded, fully refunded, unprocessed refund, refund in a later period, future second receipt |
| Refund | All 5 refund statuses; multiple partial refunds; older booking refunded in the current period; negative net cash; over-refund |
| Invalid refund data | Negative/missing approved amount, missing processing date, wrong booking/payment link, USD/unknown currency |
| Time | Midnight boundaries at microsecond precision, clipped intervals, partial hours, subsecond duration, leap year, equal-length comparison, invalid/oversized ranges |
| Ownership | Multiple workspaces of one organizer; another organizer's data excluded; explicit foreign workspace rejected; customer/admin/anonymous access rejected |
| Resources | Workspace/floor/type/category filtering; a room does not expand into child-desk sales or hours; historical booking rows retained |
| Reconciliation | Cards, daily trends, rankings, paginated ledger and CSV share signed cash totals |
| Export | CSV quoting/formula protection; event-kind validation; page bounds; explicit refusal above 50,000 rows rather than truncation |
| Frontend | Exact decimal formatting, large amounts, negative/zero comparison baselines, leap-day zero filling and period-limited chart grouping |

MySQL tests use a disposable database at port 3371; their fixture timestamps are
DATETIME(6), matching the application's schema. H2 also runs in the regular suite.
Local-data checks use Spring's test principal and the real database-backed service;
they do not read or mint the user's JWT and do not mutate sample rows.

Artifacts under `artifacts/analytics-demo-20261118/` contain expected fixtures,
the updated live expectation (accounting for the sample hold's legitimate expiry),
API results, CSV and frontend formatter/grouping results. They are local artifacts,
not files to publish with the application.

## Final verification results

- Complete backend regression suite: **1,006 tests, zero failures/errors/skips**.
- Focused MySQL/local-data/controller/service run: **60 cases, zero failures/errors/skips**.
- Frontend TypeScript, oxlint, format check and Vite build passed.
- All eight live-data ranges and 24 chart groupings retained the expected cash totals.
- Backend packaging succeeded using the classes from the completed regression run.

## Limits that remain explicit

- The browser's pixel layout and real click interactions are not certified: Computer Use
  previously stopped because it could not establish the current URL safely. Source,
  TypeScript/build checks and calculation checks are not described as browser verification.
- Historical inventory availability, actual attendance, organizer payouts and profit lack
  verified complete source workflows and are not fabricated.
- Existing timestamps have no offset. Historical timezone provenance cannot be reconstructed
  from LocalDateTime alone. Grouping uses current resource assignments, not an immutable
  historical classification snapshot.
- A processed refund without a verified VND basis is visibly excluded rather than converted
  with today's rate. Incomplete source data prevents financial certification of the whole
  dataset even when all supported calculation tests pass.
- Separate report, ledger and export requests can observe newly arrived events at different
  times; each individual report/export uses a consistent read-only database snapshot.

These boundaries are intentional disclosures, not a claim that every possible future
business state or corrupt database can produce complete financial reporting.
