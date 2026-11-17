# Organizer resource management

This task implements Spring-backed desks/rooms in `bookable_resource`, with `resource_type` pricing and `floor_plan` ownership. Existing mocked floor-plan drawing tools, photos, RFID, import, pricing rules and booking checkout are not presented as implemented resource features.

## Schema rollout

Review `docs/sql/organizer-resource-management.sql` before execution. It adds nullable `bookable_resource.name` and nullable `resource_type.currency` (`VND`/`USD`). Existing resource labels remain the display fallback; no names are backfilled and no existing prices are assigned a guessed currency. Run the backend with Hibernate `validate`, never `update`, during rollout. Shared database DDL requires separate explicit approval. The Local schema was first inspected read-only (MariaDB 10.11; both columns absent). On 2026-11-06 the user explicitly approved applying exactly the two nullable columns and the currency CHECK; they were applied without modifying existing prices, bookings, roles or states.

## Lifecycle and ownership

All endpoints require an active, email-verified ORGANIZER with an APPROVED profile. The authenticated principal must own the workspace through `resource.floorPlan.workspace.organizer`; actor/owner IDs cannot be mass-assigned. Floor, resource type and resource configuration writes are allowed only in DRAFT, ACTIVE and INACTIVE workspaces. PENDING_REVIEW, REJECTED, SUSPENDED and ARCHIVED workspaces remain readable but all configuration writes, publishing and status changes are rejected. Publishing a validated canvas is allowed during preparation (DRAFT/INACTIVE), but activating resources still requires an ACTIVE workspace. No workspace transition automatically rewrites child statuses or cancels bookings. Resource creation always yields DRAFT. Only ACTIVE and DISABLED can be requested through the status endpoint; archived resources cannot be edited/reactivated.

Activation requires an ACTIVE workspace, PUBLISHED floor with a validated resource canvas, active resource type, confirmed currency, positive effective base price and complete geometry within the canvas. Disabling does not cancel bookings or alter financial snapshots. The future booking write path must lock the same resource and revalidate workspace/profile/floor/type/resource eligibility before inserting; there is currently no implemented Spring booking-write API in this checkout, so this task does not claim an end-to-end checkout guarantee.

Create/update/status/delete serialize on workspace then resource locks and re-read locked rows. Updates/status/deletion require the response revision token derived from the persisted `updatedAt`; stale actions return 409. The database floor-label unique constraint backs up case-insensitive code checks. Cross-floor movement is deliberately unsupported. Code/name/notes/pricing changes do not rewrite booking amounts; type/capacity/geometry changes are blocked by pending, confirmed future bookings or any CHECKED_IN booking. A resource with any booking history cannot change currency. All historical bookings, including cancelled/expired bookings, block hard deletion. Pricing, blocked slots, media, amenities and inventory links also block deletion; use DISABLED instead. No linked data is cascaded or silently removed.

## Money

Currency belongs to the resource type. Hourly resource overrides inherit that currency; blank overrides inherit the type's hourly price. Day/month prices remain on the type. Monetary API values are serialized as decimal strings to preserve precision and use at most two decimal places. The FE displays the saved currency and never changes amounts when the global currency selector changes. Creating a separate type is required for another currency. Existing null currencies require explicit owner confirmation, preserve numeric amounts and cannot be assigned when historical bookings need a reviewed currency migration. Used type categories/capacity are immutable; type price changes affect inheriting resources but never recalculate past booking totals. Payment FX, settlement and booking currency snapshots are separate integration work.

## Floor canvas publishing

New floors start DRAFT. The Resource page includes a canvas preview and explicit publish confirmation. Coordinates use top-left pixels and rotation around the rectangle center. The backend validates X/Y/width/height, rotated rectangle bounds and the exact reviewed set of resource IDs/revisions under the workspace lock before publishing. Publishing increments floor version and sets the UTC publication time, without activating resources or changing bookings. Empty canvases may be explicitly published. Resource creation/updates on a known canvas are bounds-checked; activation requires complete geometry. Rotated resource rectangles cannot overlap except an explicitly assigned desk inside its containing room. Touching edges are permitted. Publishing and activation repeat placement checks; old data is not automatically moved or assigned to rooms.

The stored canvas has schema `nexspace.resource-canvas.v1` and explicit dimensions/unit/origin/rotation origin. Existing nonempty layouts with another schema, or editor drafts, are preserved and cannot be overwritten here. Advanced walls/doors/zone editing remains outside this task.

## Open-area desks and desks inside rooms

The optional self-reference `bookable_resource.parent_room_id` distinguishes open-area desks (NULL) from desks physically inside a ROOM. A room cannot itself have a parent, contain another room, or contain itself. The owner must explicitly assign the relationship; geometry does not infer ownership or parentage. Desk and room must belong to the same floor and workspace, and the room must not be archived. Complete floor-absolute desk and room geometry is required for assignment, including rotated-corner containment. Non-archived desk count cannot exceed the room's effective capacity. Resizing a room must preserve containment of its desks; a room containing desks cannot be converted into a desk or deleted. The database FK restricts deletion and never cascades child removal.

Activation is mutually exclusive: an ACTIVE whole room prevents child-desk activation; any ACTIVE child desk prevents whole-room activation. Related live bookings also prevent changing the sale arrangement even after disabling the previously active resource. Disabling a room controls whole-room sales; it does not automatically change its desks or cancel any bookings. Existing history and totals remain untouched. Structural room changes are blocked by live desk bookings; reassignment checks the desk and both room sides. Workspace locks serialize these configuration operations. A future booking writer must use the same workspace/family locking and revalidate eligibility before inserting; this checkout still has no Spring booking-write API, so these checks establish configuration safety, not an implemented reservation engine.

The write DTO adds nullable positive `parentRoomId`; PUT callers must retain the current value when updating an assigned desk. Resource detail adds `parentRoomId`/`parentRoomName`, options add same-workspace `rooms`, and layout items add `category`/`parentRoomId`. FE exposes the choice only for DESK, lists rooms on the selected floor, labels open/room placement in the table and draws rooms below their desks in the canvas preview. No new dependencies or separate booking endpoints are introduced.

The additive SQL is `docs/sql/organizer-resource-room-desks.sql`: nullable BIGINT parent ID, index and self-referencing FK with RESTRICT. On 2026-11-06, the operator explicitly approved and applied this exact SQL to Local; column/index/FK verification and backend startup with schema validation succeeded. No DML or automatic room assignment was executed. Other target databases still require explicit rollout approval. Existing rows remain NULL; do not guess parent rooms from names or positions. Tests use independent H2 storage.

### Room-group transforms and visual editing

Editing a room's position or rotation now also moves its non-archived assigned desks in the same resource-update transaction. The server preserves each desk's position in the room's unrotated local coordinate frame and adds the room's rotation delta to the desk angle. Resizing never scales desks; they retain their size and local position and must still fit inside the resized room. Open-area desks and other rooms are not moved. Archived desk geometry is retained as historical data. Type, price, currency, capacity and sale statuses of child desks are not changed by a room transform.

The workspace lock precedes the room and child locks. Live bookings on either the room or its children block structural group changes. The server validates the transformed children against the canvas, room boundary and neighboring resources before committing; any failure rolls back the whole group. Creating, editing, changing status or deleting an assigned desk touches the containing room's existing revision, so a stale room form cannot overwrite a newer child arrangement. No new schema or request fields are required. Tests include a real rollback across a separately committed fixture transaction in isolated H2 storage.

The resource form includes a controlled SVG editor: move, resize from the square handle, rotate from the round handle or 15-degree buttons, zoom 50–400%, pan, fit view, expand preview, room focus and centering. Optional grid snapping supports 1/5/10/20 px; rotation snapping uses 15 degrees. Keyboard arrows move 1 px (Shift: 10 px), and focused canvas controls support undo/redo. Position history also includes manual geometry edits; resetting restores the position present when the form opened. Children preview the same transform as the server, and bounds/overlap warnings appear before save. All changes remain local to the form until Save; backend validation remains authoritative.

## API

All paths start `/api/organizer`; responses retain the existing `statusCode/errors` envelope and 1-based page contract.

| Method/path | Purpose |
| --- | --- |
| GET `/resource-workspaces` | Owned workspace selector |
| GET `/workspaces/{workspaceId}/resource-options` | Real floors/types/base prices |
| GET/POST `/workspaces/{workspaceId}/resources` | Search/filter/page or create draft |
| GET/PUT/DELETE `/resources/{id}` | Detail, update or safe delete |
| PATCH `/resources/{id}/status` | Explicit ACTIVE/DISABLED |
| POST `/workspaces/{workspaceId}/resource-floors` | Create draft floor |
| PUT `/workspaces/{workspaceId}/resource-floors/{floorId}` | Update draft floor metadata |
| GET `/workspaces/{workspaceId}/resource-floors/{floorId}/layout` | Canvas/resource review snapshot |
| POST `/workspaces/{workspaceId}/resource-floors/{floorId}/publish` | Validate and publish reviewed canvas |
| POST `/workspaces/{workspaceId}/resource-types` | Create priced VND/USD type |
| PUT `/workspaces/{workspaceId}/resource-types/{typeId}` | Update/confirm type with revision |

Resource list filters: `floorPlanId`, `category` (DESK/ROOM), `status`, `search`, `page`, `size` (1–100). Unknown write fields are rejected. DELETE supplies `expectedRevision` in the query string; resource updates/status and type updates supply it in JSON. Floor metadata updates use the query parameter. Publish supplies floor revision, dimensions, explicit confirmation and the complete resource-revision snapshot.

## Verification

Database tests explicitly configure isolated H2 memory storage and never load Local, seed shared data or send mail. They cover CRUD/state transitions, stale revisions, ownership, unique codes, bookings, safe deletion, currency and canvas publishing. MockMvc tests cover role gates, input validation and mass assignment. FE contract tests cover real endpoints/Bearer identity, revision payloads, exact money display and coordinate validation. Shared DB writes and real deployment checks are separate approved rollout steps.
