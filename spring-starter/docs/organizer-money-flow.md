# Organizer money flow

- NexSpace collects rental payments on behalf of organizers. New bookings never charge a customer platform service fee, even if a legacy `payment.service_fee_percent` setting exists.
- Rental VAT uses the configured rate and is recorded on the immutable booking snapshot. Do not assume every rental has a 10% VAT rate.
- The organizer commission is calculated on base rental excluding rental VAT. The recorded commission is the total deduction, inclusive of any applicable tax on the platform fee; do not add another fee-tax deduction. Invoice preparation and tax filing are separate responsibilities and are not automated here.
- Organizer earnings include retained rental VAT: retained rental plus retained VAT minus retained commission. Rental VAT remains the organizer's tax responsibility and is not rental profit.
- Processed principal refunds reverse rental VAT and commission proportionally; a full principal refund reverses the entire commission. Workspace cancellation rules determine the refund amount, not this allocation rule.
- Recorded earnings are neither withdrawable balance nor proof of bank transfer. Actual transfers require a `PAID` payout record with a transfer reference and date. Automatic organizer payouts are not implemented.
- Historical payments, held totals and pricing snapshots are never retroactively repriced. Legacy bookings with customer service fees continue to require reconciliation rather than silently assigning those fees to an organizer.
- Surcharges, promotions and purchased add-ons are outside this policy change. Existing recorded amounts are preserved; the checkout no longer invents client-only promotions or add-on totals.

For a rental of VND 1,000,000, configured rental VAT of 10%, and commission of 10% of base rental: the customer pays VND 1,100,000, the platform charge is VND 100,000, and organizer earnings are VND 1,000,000 (VND 900,000 rental after commission plus VND 100,000 rental VAT). A 50% principal refund returns VND 550,000 to the customer and leaves VND 500,000 organizer earnings and VND 50,000 commission. Actual organizer transfers are reported separately.
