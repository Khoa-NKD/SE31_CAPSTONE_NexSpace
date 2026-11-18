# Workspace cancellation policy

The workspace wizard exposes the policy under **Hours & policies**. A policy is mandatory, editable, and can be restored to the defaults: 24 hours / 100%, 12 hours / 50%, 2 hours / 25%, and 0 hours / 0%.

Existing workspace create/update/detail contracts carry `cancellationRules`, with numeric `minHoursBeforeStart` and `refundPercent`. Hours are unique nonnegative integers; percentages range from 0 to 100 with at most two decimal places. Earlier cancellation cannot refund less than later cancellation. An explicit empty array is rejected. Omitting rules preserves an existing policy, or initializes defaults if none exists.

Updates lock the owned workspace and replace its rules in a transaction. Booking and resource-hold creation freeze the effective policy in `cancellationPolicySnapshot`. Customer cancellation and its preview use that snapshot and the highest satisfied hour threshold. Exact duration comparisons preserve threshold boundaries; cancellation at or after the start has a zero customer-cancellation refund. Host cancellation continues using the existing host rules.

An existing `[]` snapshot retains its original empty policy. A missing or malformed snapshot cannot silently adopt a new workspace policy. Changing a workspace policy never rewrites existing booking snapshots. Requesting cancellation is distinct from processing a refund or transferring money.

The authorized local FPT305 fixture is workspace 18, organizer 1. `spring-starter/scripts/db/seed_fpt305_cancellation_policy.mjs --apply` backs up its rule table, inserts only the approved defaults when absent, refuses to overwrite a custom policy, and checks existing booking snapshot hashes remain unchanged. Backup and verification artifacts are stored in `artifacts/fpt305-policy-20261119/`. This script makes no payment gateway calls.
