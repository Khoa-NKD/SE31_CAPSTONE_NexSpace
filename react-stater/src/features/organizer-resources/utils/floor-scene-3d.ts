import type { FloorLayout, AvailabilityState, FloorDecoration } from '../api/resources';
import { MODEL_PIXELS_PER_METRE } from './metric-units.ts';
import { availabilityColors } from './availability.ts';
import { roomWallSegments } from './room-door.ts';
import { furnishingModel3d, type FurnishingMeshBuilder } from './furnishing-models-3d.ts';
import { renderVisual3d, validVisual3d } from './visual-3d.ts';

export type Vec3 = [number, number, number];
export interface Footprint {
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
}
export interface SceneMesh {
  vertices: Float32Array;
  width: number;
  depth: number;
  maxHeight: number;
  scale: number;
}

/** Model Y becomes world Z. All footprints rotate around the same center as the 2D SVG. */
export function footprintPoint(
  item: Footprint,
  x: number,
  y: number,
  elevation: number,
  scale: number
): Vec3 {
  const angle = (item.rotation * Math.PI) / 180;
  const dx = x - item.width / 2,
    dy = y - item.height / 2;
  return [
    (item.posX + item.width / 2 + Math.cos(angle) * dx - Math.sin(angle) * dy) / scale,
    elevation,
    (item.posY + item.height / 2 + Math.sin(angle) * dx + Math.cos(angle) * dy) / scale
  ];
}

export function placed(item: {
  posX: number | null;
  posY: number | null;
  width: number | null;
  height: number | null;
  rotation: number;
}): item is Footprint {
  return (
    [item.posX, item.posY, item.width, item.height, item.rotation].every(
      (value) => typeof value === 'number' && Number.isFinite(value)
    ) &&
    item.width! > 0 &&
    item.height! > 0
  );
}

function rgb(hex: string): Vec3 {
  const normalized = hex.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return [0.48, 0.53, 0.65];
  return [0, 2, 4].map((i) => parseInt(expanded.slice(i, i + 2), 16) / 255) as Vec3;
}

/** Vertices are position, normal and RGB; no scene builder ever writes back to layout data. */
export function buildFloorScene(
  layout: FloorLayout,
  width: number,
  height: number,
  radiusPx: number,
  walls: boolean,
  states?: Record<number, AvailabilityState>
): SceneMesh {
  const scale =
    layout.pixelsPerMetre && Number.isFinite(layout.pixelsPerMetre) && layout.pixelsPerMetre > 0
      ? layout.pixelsPerMetre
      : MODEL_PIXELS_PER_METRE;
  const vertices: number[] = [];
  let maxHeight = 0;
  function triangle(a: Vec3, b: Vec3, c: Vec3, color: Vec3) {
    const u = b.map((v, i) => v - a[i]),
      v = c.map((n, i) => n - a[i]);
    const normal = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0]
    ];
    const length = Math.hypot(...normal) || 1;
    for (const p of [a, b, c]) {
      vertices.push(...p, ...normal.map((n) => n / length), ...color);
      maxHeight = Math.max(maxHeight, p[1]);
    }
  }
  function prism(points: Vec3[], bottom: number, top: number, color: string) {
    const paint = rgb(color);
    const lower = points.map(([x, , z]): Vec3 => [x, bottom, z]);
    const upper = points.map(([x, , z]): Vec3 => [x, top, z]);
    for (let i = 1; i < points.length - 1; i++) triangle(upper[0], upper[i + 1], upper[i], paint);
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      triangle(lower[j], lower[i], upper[i], paint);
      triangle(lower[j], upper[i], upper[j], paint);
    }
  }
  function box(
    item: Footprint,
    x: number,
    y: number,
    w: number,
    d: number,
    bottom: number,
    top: number,
    color: string
  ) {
    prism(
      [
        [x, y],
        [x + w, y],
        [x + w, y + d],
        [x, y + d]
      ].map(([px, py]) => footprintPoint(item, px, py, 0, scale)),
      bottom,
      top,
      color
    );
  }
  function cylinder(
    item: Footprint,
    x: number,
    y: number,
    rx: number,
    ry: number,
    bottom: number,
    top: number,
    color: string
  ) {
    const points = Array.from({ length: 16 }, (_, i) =>
      footprintPoint(
        item,
        x + Math.cos((i * Math.PI) / 8) * rx,
        y + Math.sin((i * Math.PI) / 8) * ry,
        0,
        scale
      )
    );
    prism(points, bottom, top, color);
  }
  const floor: Footprint = { posX: 0, posY: 0, width, height, rotation: 0 };
  const r = Math.max(0, Math.min(radiusPx, width / 2, height / 2));
  const outline =
    r === 0
      ? [
          [0, 0],
          [width, 0],
          [width, height],
          [0, height]
        ]
      : [
          [width - r, r, -90],
          [width - r, height - r, 0],
          [r, height - r, 90],
          [r, r, 180]
        ].flatMap(([cx, cy, start]) =>
          Array.from({ length: 17 }, (_, i) => {
            const a = ((start + (i * 90) / 16) * Math.PI) / 180;
            return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
          })
        );
  prism(
    outline.map(([x, y]) => footprintPoint(floor, x, y, 0, scale)),
    -0.16,
    0,
    '#e5e9f2'
  );
  const tone = (id: number, fallback: string) => {
    const state = states?.[id];
    return state ? availabilityColors[state] : fallback;
  };
  for (const item of layout.resources) {
    if (!placed(item)) continue;
    if (item.category === 'ROOM') {
      const visual = validVisual3d(item.visual3d) ? item.visual3d : null;
      const color = tone(item.id, visual?.floorColor ?? '#c4bfe9');
      const wallHeight =
        typeof visual?.wallHeightM === 'number' &&
        visual.wallHeightM >= 2.12 &&
        visual.wallHeightM <= 6
          ? visual.wallHeightM
          : 2.7;
      box(item, 0, 0, item.width, item.height, 0.006, 0.022, color);
      if (walls) {
        // Walls stay inside the saved footprint; door openings use the same room-local rule as 2D.
        const t = Math.min(scale * 0.08, item.width / 12, item.height / 12);
        for (const segment of roomWallSegments(
          {
            x: item.posX,
            y: item.posY,
            width: item.width,
            height: item.height,
            rotation: item.rotation
          },
          layout.decorations ?? []
        )) {
          const horizontal = segment.side === 'top' || segment.side === 'bottom';
          const fixed =
            segment.side === 'top' || segment.side === 'left'
              ? 0
              : (horizontal ? item.height : item.width) - t;
          box(
            item,
            horizontal ? segment.start : fixed,
            horizontal ? fixed : segment.start,
            horizontal ? segment.end - segment.start : t,
            horizontal ? t : segment.end - segment.start,
            segment.opening ? 2.12 : 0.022,
            wallHeight,
            visual?.wallColor ?? '#e6e4e1'
          );
        }
      }
      renderVisual3d(item.visual3d, meshBuilder(item));
    } else {
      if (
        renderVisual3d(
          item.visual3d,
          meshBuilder(item, states?.[item.id] ? tone(item.id, '#8175d3') : undefined)
        )
      )
        continue;
      const color = tone(item.id, '#8175d3');
      box(
        item,
        item.width * 0.1,
        item.height * 0.18,
        item.width * 0.8,
        item.height * 0.72,
        0.43,
        0.53,
        color
      );
      box(item, item.width * 0.1, 0, item.width * 0.8, item.height * 0.14, 0.45, 1.0, color);
      cylinder(
        item,
        item.width / 2,
        item.height / 2,
        item.width * 0.035,
        item.height * 0.035,
        0.05,
        0.43,
        '#7b8596'
      );
      box(item, 0, item.height * 0.46, item.width, item.height * 0.08, 0.04, 0.09, '#7b8596');
      box(
        item,
        item.width * 0.46,
        item.height * 0.07,
        item.width * 0.08,
        item.height * 0.93,
        0.04,
        0.09,
        '#7b8596'
      );
      box(item, 0, item.height * 0.2, item.width * 0.08, item.height * 0.55, 0.57, 0.64, color);
      box(
        item,
        item.width * 0.92,
        item.height * 0.2,
        item.width * 0.08,
        item.height * 0.55,
        0.57,
        0.64,
        color
      );
    }
  }
  function meshBuilder(item: Footprint, tint?: string): FurnishingMeshBuilder {
    const w = item.width,
      d = item.height;
    return {
      box: (x, z, width, depth, bottom, top, color) =>
        box(item, x * w, z * d, width * w, depth * d, bottom, top, tint ?? color),
      cylinder: (x, z, rx, rz, bottom, top, color) =>
        cylinder(item, x * w, z * d, rx * w, rz * d, bottom, top, tint ?? color),
      ellipsoid: (x, z, rx, rz, centerY, radiusY, color) => {
        const paint = rgb(tint ?? color);
        const point = (latitude: number, longitude: number): Vec3 =>
          footprintPoint(
            item,
            (x + Math.cos(latitude) * Math.cos(longitude) * rx) * w,
            (z + Math.cos(latitude) * Math.sin(longitude) * rz) * d,
            centerY + Math.sin(latitude) * radiusY,
            scale
          );
        for (let ring = 0; ring < 8; ring++)
          for (let slice = 0; slice < 12; slice++) {
            const a = -Math.PI / 2 + (ring * Math.PI) / 8,
              b = a + Math.PI / 8;
            const c = (slice * Math.PI) / 6,
              next = c + Math.PI / 6;
            triangle(point(a, c), point(b, c), point(b, next), paint);
            triangle(point(a, c), point(b, next), point(a, next), paint);
          }
      }
    };
  }
  function decoration(item: FloorDecoration) {
    if (!placed(item)) return;
    const mesh = meshBuilder(item);
    if (!renderVisual3d(item.visual3d, mesh)) furnishingModel3d(item, scale, mesh);
  }
  (layout.decorations ?? []).forEach(decoration);
  return {
    vertices: new Float32Array(vertices),
    width: width / scale,
    depth: height / scale,
    maxHeight,
    scale
  };
}

/** An orthographic camera uses one scale on all axes; orbiting never changes model coordinates. */
export function cameraAxes(yaw: number, elevation: number): { right: Vec3; up: Vec3; eye: Vec3 } {
  const sy = Math.sin(yaw),
    cy = Math.cos(yaw),
    se = Math.sin(elevation),
    ce = Math.cos(elevation);
  return { right: [cy, 0, -sy], up: [-sy * se, ce, -cy * se], eye: [sy * ce, se, cy * ce] };
}
