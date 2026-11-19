import type { FurnishingMeshBuilder } from './furnishing-models-3d';

export interface Visual3d {
  version: 1;
  label: string;
  floorColor?: string | null;
  wallColor?: string | null;
  wallHeightM?: number | null;
  parts: Array<{
    shape: 'BOX' | 'CYLINDER' | 'ELLIPSOID';
    x: number;
    z: number;
    yM: number;
    width: number;
    depth: number;
    heightM: number;
    color: string;
  }>;
}

/** Invalid historical or untrusted geometry falls back to a known model; never execute generated code. */
export function validVisual3d(value: Visual3d | null | undefined): value is Visual3d {
  return (
    !!value &&
    value.version === 1 &&
    Array.isArray(value.parts) &&
    value.parts.length <= 48 &&
    value.parts.every(
      (part) =>
        !!part &&
        ['BOX', 'CYLINDER', 'ELLIPSOID'].includes(part.shape) &&
        [part.x, part.z, part.yM, part.width, part.depth, part.heightM].every(Number.isFinite) &&
        part.x >= 0 &&
        part.z >= 0 &&
        part.yM >= 0 &&
        part.width >= 0.001 &&
        part.depth >= 0.001 &&
        part.heightM >= 0.001 &&
        part.x + part.width <= 1.000001 &&
        part.z + part.depth <= 1.000001 &&
        part.yM + part.heightM <= 6 &&
        /^#[0-9a-f]{6}$/i.test(part.color)
    )
  );
}

export function renderVisual3d(
  value: Visual3d | null | undefined,
  mesh: FurnishingMeshBuilder
): boolean {
  if (!validVisual3d(value) || !value.parts.length) return false;
  for (const p of value.parts) {
    if (p.shape === 'BOX') mesh.box(p.x, p.z, p.width, p.depth, p.yM, p.yM + p.heightM, p.color);
    else if (p.shape === 'CYLINDER')
      mesh.cylinder(
        p.x + p.width / 2,
        p.z + p.depth / 2,
        p.width / 2,
        p.depth / 2,
        p.yM,
        p.yM + p.heightM,
        p.color
      );
    else
      mesh.ellipsoid(
        p.x + p.width / 2,
        p.z + p.depth / 2,
        p.width / 2,
        p.depth / 2,
        p.yM + p.heightM / 2,
        p.heightM / 2,
        p.color
      );
  }
  return true;
}
