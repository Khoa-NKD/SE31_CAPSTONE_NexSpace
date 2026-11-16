import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestAllocation, allocationError } from '../../src/features/organizer-resources/utils/building-allocation.ts';

const floor = {
  width: 2400,
  height: 800,
  occupants: [{ floorPlanId: 10, workspaceId: 1, x: 0, y: 0, width: 1200, height: 800 }]
};
test('separate workspaces may share one physical floor with touching but non-overlapping areas', () => {
  assert.equal(allocationError({ x: 1200, y: 0, width: 1200, height: 800 }, floor, 2), null);
  assert.equal(allocationError({ x: 1199, y: 0, width: 1200, height: 800 }, floor, 2), 'overlap');
  assert.equal(allocationError({ x: 1201, y: 0, width: 1200, height: 800 }, floor, 2), 'bounds');
});
test('workspace cannot attach the same physical floor twice; explicitly mapping its existing layout preserves identity', () => {
  const area = { x: 0, y: 0, width: 1200, height: 800 };
  assert.equal(allocationError(area, floor, 1), 'duplicate');
  assert.equal(allocationError(area, floor, 1, 10), null);
  assert.equal(allocationError({ ...area, x: NaN }, floor, 2), 'bounds');
});

test('metric gaps preserve the one-centimetre allocation minimum', () => {
  const floor = { geometryVersion: 2, width: 1.2, height: 0.6,
    occupants: [{ workspaceId: 1, floorPlanId: 1, x: 0, y: 0, width: 0.6, height: 0.6 }] };
  const next = suggestAllocation(floor);
  assert.deepEqual(next, { x: 0.6, y: 0, width: 0.6, height: 0.6 });
  assert.equal(allocationError(next, floor, 2), null);
});
