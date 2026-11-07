import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeArea } from '../../src/features/organizer-resources/utils/area-placement.ts';
import { allocationError } from '../../src/features/organizer-resources/utils/building-allocation.ts';

test('resizing and dragging can align two workspace areas without overlap', () => {
  const floor = {
    width: 2400,
    height: 1600,
    occupants: [{ workspaceId: 1, floorPlanId: 20, x: 0, y: 0, width: 1200, height: 1600 }]
  };
  const half = placeArea({ x: 0, y: 0, width: 2400, height: 1600 }, 'se', -1200, 0, floor, 10);
  assert.equal(half.width, 1200);
  assert.equal(allocationError(half, floor, 8), 'overlap');
  const next = placeArea(half, 'move', 5000, 100, floor, 10);
  assert.deepEqual(next, { x: 1200, y: 0, width: 1200, height: 1600 });
  assert.equal(allocationError(next, floor, 8), null);
});
