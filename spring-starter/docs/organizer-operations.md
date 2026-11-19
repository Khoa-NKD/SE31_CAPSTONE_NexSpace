# Organizer operations screens

The Pricing, Blockouts, Gantt and Organizer Overview screens use authenticated backend data. They do not substitute demo bookings, prices, occupancy, access-pass notifications or successful exports when a request fails.

## API

All paths below are under `/api/organizer/workspaces/{workspaceId}` and require the `ORGANIZER` role plus ownership of the workspace.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/pricing` | Resource-type rates, actual seat/room inventory and surcharge rules. Monetary values are decimal strings and retain their recorded currency. |
| POST | `/pricing-rules` | Create a scoped surcharge rule. |
| PUT | `/pricing-rules/{id}` | Update an owned rule. |
| DELETE | `/pricing-rules/{id}` | Delete an owned rule. Existing booking pricing snapshots are unchanged. |
| GET | `/blocked-slots?from=...&to=...` | Slots overlapping the half-open local date/time interval; range must be valid and at most 366 days. |
| POST | `/blocked-slots` | Atomically block the selected resources after ordered room/desk locks and conflict checks. |
| DELETE | `/blocked-slots/{id}` | Remove an owned blockout. No booking is cancelled or refunded by this action. |

Rule input: `name`, optional `resourceTypeId` or `resourceId` (mutually exclusive), `modifierType`, optional paired `startDate`/`endDate`, optional paired `startTime`/`endTime`, `multiplier`, `fixedAmount`, `priority`, `active`. Date boundaries are inclusive; time boundaries are half-open within the same day. Peak rules require times; holiday rules require explicit dates. Weekend means Saturday/Sunday. A rule without scope targets the workspace. Workspace-wide fixed monetary surcharges are rejected when active types have different currencies.

Rules are not stacked. Each time segment selects the most specific matching rule (resource, type, workspace), then the highest priority, then the oldest ID. The multiplier modifies only the segment's share of base price; fixed amounts are added per matching hour. Final surcharge rounds once with `HALF_UP` to two decimal places. Both booking entry points use the same rule evaluator.

Block input: 1–200 positive `resourceIds`, future `startTime`, later `endTime`, `blockType` (`BLOCKED` or `MAINTENANCE`) and a required reason up to 255 characters. Ownership is checked before acquiring resource locks. Repeated IDs are collapsed; when a room and its seats are selected together, the room's block is sufficient. The existing checkout lock service protects room/desk relationships and rejects overlapping bookings, active holds and blockouts. Adjacent intervals are allowed. No schema migration is needed.

Base rates are edited through the existing resource-type endpoint and revision contract, preserving dimensions, capacity, currency and photos. A resource's explicit hourly override remains intact. No currency conversion is performed.

The approved daily billing unit is 24 continuous hours: any positive duration up to 24h costs one day; 24h plus any remainder costs two days, and so on. Both booking entry points and price previews share `BookingBaseRates`. Missing/nonpositive rates are rejected, not treated as free bookings. Hourly base amounts round once from the actual duration. Monthly rates remain configurable, but monthly price previews, new bookings and holds are rejected until a monthly billing policy is approved. Reusing a hold with another price type is rejected so its original price/payment snapshot is never silently replaced. Existing booking amounts are unchanged.

## Display and navigation

Gantt loads actual inventory even when no bookings exist. Events map by `resourceId`, are clipped to the visible day/week/month, and use separate lanes when they overlap. Room events appear on their seats; seat events affect their room but not sibling seats. Cancelled bookings, expired bookings and expired payment holds do not occupy the timeline. Calendar queries include bookings that began before the visible period and still overlap it. CSV exports contain the currently visible data and escape spreadsheet formulas.

Overview is at `/dashboard/organizer/`, linked from the Organizer navigation. It uses existing analytics and booking APIs with loading/error/empty states. The monetary card includes VAT and follows the selected cash-event period; it is not a bank balance or a payout claim. Today counts booking records, not unique occupied resources, and pending approval uses the server's total count. No automatic payments or refunds are introduced.

## Verification scope

Tests cover owner boundaries, controller roles and validation, explicit rule scopes, partial-hour surcharges, priorities, weekends and midnight, atomic block checks, room/desk inheritance, active holds, adjacent intervals, deletion and calendar overlap. Integration tests use a disposable H2 database. They do not mutate the local MySQL database or call payment gateways. Frontend helper tests cover inherited events, lanes, midnight clipping and expired holds. Browser interaction testing requires a separately available browser automation runtime.
