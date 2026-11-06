import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  constrainPlacement,
  placementFits,
  moveWithRoom,
  placementsOverlap
} from '../../src/features/organizer-resources/utils/placement.ts';

const canvas = { width: 1200, height: 800 };
const desk = { x: 120, y: 120, width: 40, height: 40, rotation: 0 };
const room = { x: 100, y: 100, width: 240, height: 180, rotation: 0 };

test('moving a room translates child desks without scaling or moving unrelated resources', () => {
  assert.deepEqual(moveWithRoom(desk, room, { ...room, x: 420, y: 70 }), {
    ...desk,
    x: 440,
    y: 90
  });
  assert.deepEqual(moveWithRoom(desk, room, { ...room, width: 300 }), desk);
});
test('rotating a room preserves desk-local position and rotates the desk angle', () => {
  const moved = moveWithRoom(desk, room, { ...room, rotation: 90 });
  assert.deepEqual(moved, { ...desk, x: 250, y: 90, rotation: 90 });
  assert.ok(placementFits(moved, canvas, { ...room, rotation: 90 }));
  assert.deepEqual(moveWithRoom(moved, { ...room, rotation: 90 }, room), desk);
});
test('collision feedback distinguishes touching edges from real rotated overlap', () => {
  assert.equal(placementsOverlap(desk, { ...desk, x: 160 }), false);
  assert.equal(placementsOverlap(desk, { ...desk, x: 150 }), true);
  assert.equal(placementsOverlap(desk, { ...desk, rotation: 45 }), true);
  assert.equal(placementsOverlap(desk, { ...desk, x: 500, rotation: 45 }), false);
});

test('floor dragging clamps a resource to canvas boundaries and retains dimensions', () => {
  assert.deepEqual(constrainPlacement({ ...desk, x: -50, y: 2000 }, canvas), {
    ...desk,
    x: 0,
    y: 760
  });
});
test('desk dragging stays in floor coordinates while constrained to the selected room', () => {
  const result = constrainPlacement({ ...desk, x: 500, y: 600 }, canvas, room);
  assert.ok(result);
  assert.ok(result.x >= 100 && result.x <= 300);
  assert.ok(result.y >= 100 && result.y <= 240);
  assert.ok(placementFits(result, canvas, room));
  assert.equal(placementFits({ ...desk, x: 400 }, canvas, room), false);
});
test('clamping accounts for both room and desk rotations at two-decimal precision', () => {
  const rotatedRoom = { ...room, rotation: 45 };
  const result = constrainPlacement({ ...desk, x: 800, y: 800, rotation: 30 }, canvas, rotatedRoom);
  assert.ok(result);
  assert.ok(placementFits(result, canvas, rotatedRoom));
  assert.equal(result.x * 100, Math.round(result.x * 100));
});
test('oversized and invalid geometry cannot be dragged into a misleading valid position', () => {
  assert.equal(constrainPlacement({ ...desk, width: 400 }, canvas, room), null);
  assert.equal(constrainPlacement({ ...desk, height: 900 }, canvas), null);
  assert.equal(constrainPlacement({ ...desk, x: Number.NaN }, canvas), null);
});
