# Metric geometry UI

The organizer API retains pixel coordinate fields for compatibility. A version-2 floor declares
`geometryVersion: 2`, `coordinateUnit: "px"` and `pixelsPerMetre: 60`. Use `utils/metric-units.ts`
to display/edit measurements in metres. Never use browser pixel dimensions or zoom as a model scale.

New physical floors can be created with `widthM` and `lengthM`; their pixel canvas is a projection
using the fixed scale. Existing legacy canvases retain pixel labels until measurements are reviewed.
Workspace area fields, resource inspectors, grids and rulers show metres for version-2 geometry.

Both manual and AI measurement forms first request a shared-floor preview, display blocking issues
and before/after miniatures, then require a separate confirm-and-save action. Editing the input clears
the review. A successful legacy conversion refreshes the editor so stale pixel drafts are not reused.

Measurement forms always use RESIZE: only the physical floor boundary changes. Workspace areas
and resources retain their measured dimensions and positions. Previews compare the entire physical
floor with the unchanged workspace allocation. The allocation editor updates width, length, square
metres and the percentage of floor area immediately during dragging or resizing. Floor enlargement
reduces that percentage without enlarging the allocation; clipping on either axis blocks saving.

The floor actions menu provides workspace-area editing on the existing physical floor. Shrinking an
area never scales its contents; the backend rejects clipping. Real floor measurement edits use the
shared measurement workflow, not arbitrary canvas resizing in the building catalog.

AI proposals can be saved as design drafts before real scale is confirmed. Saved drafts do not
create resources or prices. The assistant offers continuation and the backend includes the retained
arrangement in the next generation request. Publication requires valid measured geometry. Chat image
history continues to use the existing browser history mechanism.

Deploy with the backend metric geometry update and Flyway V12. An older backend does not implement
the new measurement preview, allocation edit or saved AI draft endpoints. Type-check and run the
focused Node test `src/features/organizer-resources/utils/metric-units.test.ts` before deployment.

## Measurements during floor linking

The linking and allocation forms include PhysicalFloorMeasurements. Unmeasured floors cannot be
linked until real dimensions are saved. Empty floors use the existing building-floor update API;
occupied floors reuse design metrics from an owned occupant and review all shared allocations.
Open measurement editors block the parent link/copy submission, including Enter key submission.
Saving refreshes the building catalog and layout revisions before continuing. Legacy coordinate
conversion refreshes the existing allocation; metric boundary edits preserve in-progress area edits.
New floors default to horizontal length 20 m and vertical width 15 m across all UI creation paths.
The Vietnamese labels explicitly show horizontal length and vertical width; API coordinate keys do
not change. Metric dragging uses a 0.1 m grid with a 0.01 m minimum footprint. Percentages are derived
from area divided by the complete floor area, and are never used to scale existing allocations.
