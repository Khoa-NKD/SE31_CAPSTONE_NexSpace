import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  floorBatchSelection,
  initialFloorSelection
} from '../../src/features/organizer-resources/utils/floor-batch-selection.ts';
const floors = [1, 2, 3, 4].map((n) => ({
  id: n,
  name: `Tầng ${n}`,
  floorNumber: n,
  width: 2400,
  height: 1600,
  revision: 'initial',
  occupants: []
}));
test('range selection preserves the layout name and numeric floor order', () => {
  const state = { ...initialFloorSelection(1), mode: 'range' as const, from: '2', to: '4' };
  const result = floorBatchSelection(state, floors, [], 8, 'FPT');
  assert.equal(result.valid, true);
  assert.deepEqual(
    result.rows.map((r) => r.allocation.name),
    ['FPT', 'FPT', 'FPT']
  );
  assert.deepEqual(
    result.rows.map((r) => r.allocation.buildingFloorId),
    [2, 3, 4]
  );
  assert.equal(
    floorBatchSelection(
      state,
      floors.filter((f) => f.id !== 3),
      [],
      8,
      'FPT'
    ).error,
    'missing'
  );
});
test('individual selection keeps independent geometry, per-floor overrides and duplicate allocation checks', () => {
  const state = {
    ...initialFloorSelection(1),
    mode: 'multiple' as const,
    ids: [4, 1],
    overrides: { 4: { width: '1200', name: 'FPT East' } }
  };
  const result = floorBatchSelection(state, floors, [], 8, 'FPT');
  assert.equal(result.valid, true);
  assert.equal(result.rows[0].allocation.width, 2400);
  assert.equal(result.rows[1].allocation.width, 1200);
  assert.equal(result.rows[1].allocation.name, 'FPT East');
  const occupied = floors.map((f) =>
    f.id === 4
      ? {
          ...f,
          occupants: [
            {
              floorPlanId: 19,
              workspaceId: 8,
              workspaceName: 'FPT',
              layoutName: 'East',
              status: 'DRAFT' as const,
              x: 0,
              y: 0,
              width: 1200,
              height: 1600
            }
          ]
        }
      : f
  );
  assert.equal(floorBatchSelection(state, occupied, [], 8, 'FPT').valid, false);
});

test('suggests a free area beside another workspace and rejects a completely occupied floor', () => {
  const state = { ...initialFloorSelection(1), single: 1 };
  const occupant = {
    floorPlanId: 19,
    workspaceId: 9,
    workspaceName: 'Other workspace',
    layoutName: 'West',
    status: 'DRAFT' as const,
    x: 0,
    y: 0,
    width: 1200,
    height: 1600
  };
  const halfOccupied = { ...floors[0], occupants: [occupant] };
  const result = floorBatchSelection(state, [halfOccupied], [], 8, 'FPT');
  assert.equal(result.valid, true);
  assert.deepEqual(result.rows[0].allocation, {
    buildingFloorId: 1,
    x: 1200,
    y: 0,
    width: 1200,
    height: 1600,
    name: 'FPT'
  });
  const occupied = { ...halfOccupied, occupants: [{ ...occupant, width: 2400 }] };
  assert.equal(floorBatchSelection(state, [occupied], [], 8, 'FPT').rows[0].problem, 'overlap');
});
