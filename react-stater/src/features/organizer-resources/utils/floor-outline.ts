import type { FloorLocation, FloorOutline } from '../api/buildings';

/** Four equal circular corner cuts. The area is evaluated before display rounding. */
export function floorArea(widthM: number, lengthM: number, radiusM: number) {
  return widthM * lengthM - (4 - Math.PI) * radiusM * radiusM;
}

export function floorCornerRadius(
  location: FloorLocation | null | undefined,
  width: number,
  height: number
) {
  if (location?.outline !== 'ROUNDED') return 0;
  return location.cornerRadiusM == null
    ? Math.min(width, height) * 0.12
    : location.cornerRadiusM * 60;
}

export interface FloorShapeDraft {
  floorNumber: number;
  widthM: string;
  lengthM: string;
  outline: FloorOutline;
  cornerRadiusM: string;
}

const isMeasurement = (value: number) =>
  Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;

export function validFloorShape(floor: FloorShapeDraft) {
  const width = Number(floor.widthM),
    length = Number(floor.lengthM),
    radius = Number(floor.cornerRadiusM);
  return (
    !!floor.widthM &&
    !!floor.lengthM &&
    !!floor.cornerRadiusM &&
    [width, length].every((value) => isMeasurement(value) && value >= 0.01 && value <= 10000) &&
    isMeasurement(radius) &&
    radius >= 0 &&
    radius * 2 <= Math.min(width, length) &&
    (floor.outline === 'ROUNDED' || radius === 0)
  );
}
