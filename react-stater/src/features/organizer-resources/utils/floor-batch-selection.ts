import type { AllocationInput, PhysicalFloor } from '../api/buildings';
import type { FloorOption } from '../api/resources';
import { allocationError } from './building-allocation.ts';

export type AreaFields = { x: string; y: string; width: string; height: string };
export interface FloorSelection {
  buildingId: number;
  mode: 'single' | 'range' | 'multiple';
  single: number;
  from: string;
  to: string;
  ids: number[];
  overrides: Record<number, Partial<AreaFields> & { name?: string }>;
}
export const initialFloorSelection = (buildingId = 0): FloorSelection => ({
  buildingId,
  mode: 'single',
  single: 0,
  from: '',
  to: '',
  ids: [],
  overrides: {}
});
export function floorBatchSelection(
  state: FloorSelection,
  physical: PhysicalFloor[],
  existing: FloorOption[],
  workspaceId: number,
  baseName: string
) {
  let selected: PhysicalFloor[] = [];
  let error: 'range' | 'missing' | 'limit' | null = null;
  if (state.mode === 'single') selected = physical.filter((f) => f.id === state.single);
  else if (state.mode === 'multiple') selected = physical.filter((f) => state.ids.includes(f.id));
  else if (state.from !== '' || state.to !== '') {
    if (
      !/^-?\d+$/.test(state.from) ||
      !/^-?\d+$/.test(state.to) ||
      Number(state.from) > Number(state.to)
    )
      error = 'range';
    else {
      const start = Number(state.from),
        end = Number(state.to);
      if (end - start + 1 > 100) error = 'limit';
      else {
        selected = physical.filter((f) => f.floorNumber >= start && f.floorNumber <= end);
        if (selected.length !== end - start + 1) error = 'missing';
      }
    }
  }
  if (selected.length > 100) error = 'limit';
  // Sort a copy; never mutate cached building data.
  // oxlint-disable-next-line unicorn/no-array-sort
  selected = [...selected].sort((a, b) => a.floorNumber - b.floorNumber || a.id - b.id);
  const rows = selected.map((floor) => {
    const custom = state.overrides[floor.id] ?? {};
    const fields = { x: '0', y: '0', width: '', height: '', ...custom };
    const allocation: AllocationInput = {
      buildingFloorId: floor.id,
      x: Number(fields.x),
      y: Number(fields.y),
      width: fields.width.trim() ? Number(fields.width) : floor.width,
      height: fields.height.trim() ? Number(fields.height) : floor.height,
      name: custom.name ?? baseName.trim()
    };
    const problem = existing.some(
      (f) => f.location?.buildingFloorId === floor.id || f.floorNumber === floor.floorNumber
    )
      ? 'duplicate'
      : allocationError(allocation, floor, workspaceId);
    return {
      floor,
      allocation,
      problem: !allocation.name.trim() || allocation.name.length > 100 ? ('name' as const) : problem
    };
  });
  return { rows, error, valid: rows.length > 0 && !error && rows.every((row) => !row.problem) };
}
