# Organizer analytics contract

## Scope and routes

The new UI is `/dashboard/organizer/analytics`. Read APIs are available at
`/api/organizer/analytics` (also `/api/v1/organizer/analytics`):

- `GET /`: report with current/previous summaries, daily series, rankings,
  booking-status distribution, reserved-hour heatmap and data-quality notices.
- `GET /options`: the authenticated organizer's workspaces, floors and resource types.
- `GET /ledger`: financial events; `page` starts at 1, `size` is 1–100.
- `GET /export`: UTF-8 CSV of all matching financial events, in one consistent
  snapshot. More than 50,000 events returns 400 instead of silently truncating.

Every route requires `ORGANIZER`. The actor comes from the authenticated principal,
never a query parameter. Every query scopes through `workspace.organizer_id`.
Explicit workspace IDs belonging to another actor return 404. Other filters can
only narrow that actor's own data. No new dependencies or production schema changes
are introduced; test DDL is confined to disposable databases.

## Filters and timestamps

`from` and `to` are required ISO calendar dates, inclusive. At most 366 days are
allowed. SQL uses `[from 00:00, to + 1 day 00:00)`. The comparison period has exactly
the same number of days immediately before `from`, including leap days.

Optional filters: `workspaceId`, `floorNumber` (requires workspace),
`resourceTypeId`, `category=DESK|ROOM`. Ledger/export accept `kind=PAYMENT|REFUND`.

Existing timestamps are `LocalDateTime` without an offset. Reports preserve these
stored wall-clock values; they do not reinterpret historical data as UTC. The
response exposes the current server's zone as metadata, not proof that every
legacy writer used that zone. A future timezone migration requires an explicit
data audit. Workspace/floor/type grouping uses current resource assignments;
legacy snapshots do not consistently preserve historical classification.

## Metric definitions

Money is returned as decimal strings in VND and calculated with database DECIMAL
and Java BigDecimal. The browser uses BigInt cents to group and format money.
Only plot coordinates use floating-point numbers.

| Metric | Source and date basis |
| --- | --- |
| Created bookings | Booking rows created in the period, including unpaid holds |
| Paid bookings | Distinct bookings whose first successful payment covering a positive requested settlement amount occurred in the period, even if subsequently cancelled/refunded. A SUCCESS row with underpayment still contributes recorded cash but cannot establish a fully paid booking |
| Paying customers | Distinct customers of those first-paid bookings |
| Returning customers | Paying customers with another successful receipt before the period, within the selected scope |
| Cash received | Sum of positive `received_amount` on SUCCESS transactions with `paid_at` in the period; includes reconciliation exceptions, which are flagged |
| Cash refunded | Sum of nonnegative `approved_amount` on PROCESSED refunds with `processed_at` in the period, a matching booking/payment link and a VND booking snapshot |
| Cash after refunds | Received minus refunded events in the period; may be negative when refunding older bookings |
| Average first-paid booking value | Settlement amount requested on the first successful transaction per booking, divided by that booking count; ties use transaction ID. Retries and overpayment do not inflate the average |
| Current status counts | Current statuses of bookings created in the period; not counts of status transitions |
| Reserved resource-hours | Overlap of paid CONFIRMED/CHECKED_IN/COMPLETED/NO_SHOW bookings with the period; microseconds are summed before conversion to hours, rounded to four decimals; excludes cancellations and expirations |

Payments and refunds are separate UNION ALL event streams, not a raw many-to-many
join. Retries with no successful payment contribute no money. Multiple real
successful transaction rows contribute their recorded cash but only one paid
booking. An unresolved duplicate produces a warning; a duplicate whose excess has
been refunded by the period end is informational. Resolution requires matching,
consistent expected amounts, no receipt discrepancies and no over-refunded individual
transaction. Future receipts or refunds cannot resolve an earlier period. Notices
are scoped to periods containing payment/refund activity for that duplicated booking.
Repeated webhooks do not introduce
additional analytics events for the same payment row.

The heatmap sums overlap with each weekday/hour bucket. It measures reserved
resource-hours, including future reservations, not attendance or occupancy.
A room booking is one bookable resource; its contained desks are not expanded
into additional bookings, sales or hours.

## Financial limitations and validation

Refund amounts for USD or unknown booking currencies cannot be assumed to be VND:
the existing refund schema lacks an immutable settlement-currency/rate field.
Those processed refunds are excluded and visibly flagged rather than converted
using today's rate. Missing event dates/amounts, nonpositive SUCCESS receipts,
and received funds on unsuccessful payments also produce an exclusion notice.
Since invalid records may have no date, this notice covers the entire selected
resource scope, not only the requested period. Money totals remain totals of the
valid recorded events, not a certification that incomplete source data is complete.

Processed refunds exceeding the known recorded received amount are flagged without
clamping the cash ledger. An unknown received amount is flagged as missing data,
not treated as zero to assert an over-refund.

Included receipts with amount differences, non-MATCHED reconciliation, pending
booking status despite successful payment, or payment
at/after cancellation or expiration are separately flagged. A normal payment before
a later cancellation is not a late-payment warning. A missing cancellation timestamp
on a cancelled/expired booking requires review. Cash after refunds is neither profit nor
an organizer payout. The current code does not provide verified complete payout,
operating-cost or historical sellable-inventory workflows, so those measures are
explicitly unavailable. No business policies or payout status transitions are invented.

Cards, trends, rankings and export use the same event definitions. A report is read
under REPEATABLE_READ; ledger requests occur later and may see newly arrived events.
The UI instructs users to refresh before reconciling those separate requests. Refresh
invalidates both report and ledger queries; pagination adjusts if the refreshed total shrinks.

The payment checkout fix reads currency from the booking's saved pricing snapshot.
It no longer guesses currency from whether a price is below 1,000. Existing USD
gateway rounding is preserved. Missing/unsupported snapshot currency rejects checkout
with a clear error instead of charging in a guessed currency.

## Verification

- `OrganizerAnalyticsRepositoryTest`: real SQL, default disposable H2 in MySQL mode.
- Optional MySQL 8.4 run: create a disposable container/database ONLY at
  `127.0.0.1:3371/analytics_test` with an empty root password, then run
  `mvn -Dtest=OrganizerAnalyticsRepositoryTest -Danalytics.test.mysql=true test`.
  The integration target is fixed to avoid accidentally dropping production tables.
- `AnalyticsFilterTest`, `OrganizerAnalyticsControllerTest`,
  `BookingPaymentAmountTest`, existing `PaymentServiceImplTest`.
- Frontend: `node --experimental-strip-types --test mock-server/test/organizer-analytics-math.test.ts`,
  existing TypeScript, oxlint, oxfmt and Vite build tools.

No sample metrics are substituted when the API fails or returns an empty dataset.
The existing organizer booking KPI ribbon also removes fabricated growth, amounts,
dates and mock booking fallbacks; its counters are clearly labelled all-time.
