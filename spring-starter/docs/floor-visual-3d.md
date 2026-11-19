# Reusable floor visuals

The optional `visual3d` object belongs to a resource type or a furnishing template. Placed furnishings retain a copy in the draft/published layout JSON. Resource layout responses resolve the visual from their type; they do not create another bookable resource or change its availability or price.

Version 1 supports `BOX`, `CYLINDER` and `ELLIPSOID` parts, up to 48 per model. A part's `x`, `z`, `width` and `depth` are fractions of the existing 2D footprint. `x` and `z` are the minimum corner for every shape. `yM` and `heightM` are vertical metres. Every part must fit inside `[0,1]` on the floor axes and `[0,6]` vertically. Colors are six-digit hexadecimal strings. No URLs, scripts, arbitrary meshes or external assets are accepted.

Rooms may supply `floorColor`, `wallColor` and `wallHeightM` (2.12–6 m). Their perimeter and door openings remain derived from the saved room/door geometry. Furnishings and seats stay separate objects; room visuals must not duplicate them. Heights inferred by AI are illustrative, not verified measurements.

The renderer applies the existing 2D center rotation exactly once and uses the existing uniform model scale. Camera movement never modifies placement. Invalid/missing historical visuals fall back to built-in models. The calendar may tint custom seats with their effective availability color.

Flyway V16 adds nullable JSON columns to `resource_type` and `organizer_layout_template`. Existing rows are retained with null visuals. Current role, ownership, revision and confirmation checks continue to govern writes. Updating ordinary type/template fields without a visual preserves the saved design.

New AI proposals can describe visual differences with new types and custom furnishing parts. Already retained proposals are not regenerated automatically. Reusable templates and placed copies with the same name/kind share their supplied visual during proposal normalization.
