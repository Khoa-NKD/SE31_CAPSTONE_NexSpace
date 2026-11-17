# Metric floor geometry

## Source of truth and compatibility

New measured floors use geometry version 2. Physical dimensions, workspace allocation geometry, and
resource placement are persisted in metres. Existing pixel columns are retained as compatibility
projections. `MetricGeometry` defines 60 model pixels per metre on both axes; these are not screen
pixels. Browser zoom and viewport fitting never change geometry.

Resource dimensions come from the selected type. Types already in use retain their configuration.
Round-trip tolerance is derived from two-decimal pixel serialization, rather than permitting a fixed
one-centimetre size difference. All spatial operations use the same uniform coordinate system.

The existing wire fields remain pixels. Layout responses explicitly identify `coordinateUnit`,
`geometryVersion`, and, for version 2, `pixelsPerMetre`. Do not reinterpret old wire fields as metres.

## Migration and retained data

Flyway V12 is additive for data: it adds metric columns, geometry metadata, immutable publication
snapshots, an AI draft, and a retained legacy geometry backup. It expands the canvas CHECK constraint
to accommodate the existing real-floor limit of 10,000 metres at 60 model pixels per metre.
Do not edit earlier applied migrations or enable Hibernate schema updates.

V12 does not invent missing measurements or bulk-convert legacy rows. An owner must review and
confirm each shared physical floor. Conversion checks **all** allocations and resources on that
physical floor in one transaction. The original allocation, layouts, physical scale, and placed
resource geometry are retained before conversion. IDs, parent relationships and booking rows remain
unchanged. Archived resource geometry is included in the retained backup.

Rotated legacy rectangles with unequal axis scales cannot be converted exactly into another
rectangle. Lossless resize-mode conversion reports these cases and blocks conversion. Catalog footprint mismatches and
unsupported layout formats also require explicit correction, never silent stretching. Measured
legacy floors whose axes already have the same scale remain compatible with normal placement and
publish validation until explicitly converted.

Back up the target database before deploying V12. Validate the migration on a copy first. Restoring
an older application against converted data is not an automatic rollback strategy: review publication
snapshots and use the database backup or retained original geometry with a reviewed recovery process.

## Owner APIs

Under `/api/organizer/workspaces/{workspaceId}/resource-floors/{floorId}`:

- `GET /design-metrics`: physical and allocation measurements and `geometryVersion`.
- `POST /design-metrics/preview`: the same measurement input as save; returns affected-area counts,
  blocking issues, and before/after scene previews. It performs no writes.
- `PUT /design-metrics`: repeats validation under locks. Legacy conversion requires
  `confirmGeometryConversion: true`. Real-size edits preserve allocation/resource metres.
- `PUT /allocation`: moves/resizes an allocation on its existing physical floor. Includes the floor
  `expectedRevision`. Resources retain their local placement and size. Content clipping, allocation
  overlap, and edits with live bookings are rejected.
- `GET /ai/draft`, `PUT /ai/draft`: retain an AI design without creating bookable resources or types.
  PUT accepts the existing AI apply input and checks ownership, proposal scope and scene freshness.
  A subsequent AI request includes the saved draft as context.

Measurement revisions include the shared physical floor, all its allocations, resource placements,
and used type revisions. Saving rechecks the complete scene; an outdated preview cannot overwrite
a changed shared floor. Workspace, physical floor and resource locks protect writes.

Measurement edits only resize the physical floor boundary. Allocation dimensions, offsets, resource
placements, footprints and rotations remain fixed. The public service rejects legacy CALIBRATE
requests rather than remapping existing contents. Each overflowing axis is reported separately.
Preview scenes show the entire physical floor and the unchanged allocation with area percentages.

## Publication and booking

Published geometry and allocation location are independent snapshots. A resource edit changes only
the organizer draft. Public maps retain published positions while prices and operational status
remain live. New resources are absent from public snapshots until publish. Geometry changes pending
publication cannot accept new bookings; existing booking records and processing are preserved.

Publish checks configured footprints, containment, overlap, rotated bounds and the caller's resource
revision snapshot. Activation checks the complete scene and the current published placement. A room
continues to control its contained seats; contained seats cannot be booked individually.

## Verification

Focused tests include `MetricGeometryTest`, `MetricFloorGeometryTest`, `FloorAiDatabaseTest`,
`OrganizerResourceDatabaseTest`, and `PublicFloorMapControllerTest`. The first two are pure geometry
tests; database tests use isolated in-memory H2 and do not verify MySQL DDL. Run Flyway migrations on
an isolated MySQL 8.4 instance as a separate check. No SMTP, image-provider fidelity or real payment
delivery is implied by these tests.

## Linking and initial floor dimensions

Automatically created building floors use a measured 20 by 15 metre default (1,200 by 900 model
pixels), matching both frontend creation paths. Legacy API callers may still create an unmeasured
empty floor for compatibility; linking rejects missing real dimensions or unequal axis scales.
Empty floors can receive real dimensions through the existing physical-floor update API under a
floor lock and READ_COMMITTED transaction. Linked floors must use the shared preview/save workflow.
The latter rejects missing legacy baselines with placed objects and unequal historical axis scales,
instead of silently stretching the drawing. No existing floor data is bulk-repaired or overwritten.
The Vietnamese UI calls the horizontal axis length and the vertical axis width; wire widthM remains
horizontal and lengthM remains vertical for compatibility. The keys are never swapped.

## Clearing legacy layouts

A deletion-only AI proposal may be applied without metric conversion. It may remove existing
resources and decorations, but cannot introduce types/templates, modify resources, add decorations,
or change any retained decoration. Ownership, scope, revision, dependency and booking checks still
apply. An empty draft can be published without real measurements when it contains no active
resources, decorations or background. This clears the published scene without introducing geometry.
Removing the workspace area still requires both draft and published scenes to be empty; the error
now identifies objects remaining in the published scene. AI apply failures explicitly remain previews.
