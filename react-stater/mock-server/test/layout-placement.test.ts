import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewLayout } from '../../src/features/organizer-resources/utils/layout-placement.ts';
import type {
  FloorLayout,
  FloorDecoration
} from '../../src/features/organizer-resources/api/resources';

const room = {
  id: 1,
  code: 'ROOM',
  name: 'Room',
  category: 'ROOM' as const,
  parentRoomId: null,
  posX: 100,
  posY: 100,
  width: 240,
  height: 180,
  rotation: 0,
  status: 'DRAFT' as const,
  revision: 'r1'
};
const table: FloorDecoration = {
  id: 'table',
  kind: 'TABLE',
  label: 'Table',
  posX: 180,
  posY: 100,
  width: 120,
  height: 60,
  rotation: 0,
  color: '#aaaaaa'
};
const layout = {
  width: 1200,
  height: 800,
  editableLayout: true,
  resources: [room],
  decorations: [table]
} as FloorLayout;

test('room translation and rotation carry contained decorations without scaling', () => {
  const result = previewLayout(
    layout,
    { x: 420, y: 70, width: 240, height: 180, rotation: 90 },
    { resourceId: 1, category: 'ROOM' }
  );
  assert.equal(result.valid, true);
  assert.deepEqual(result.decorations[0], { ...table, posX: 540, posY: 150, rotation: 90 });
});
test('furniture overlaps are blocked while touching edges and containing rooms are allowed', () => {
  const plant = { ...table, id: 'plant', kind: 'PLANT' as const, width: 40, height: 40 };
  const shape = { x: 290, y: 100, width: 40, height: 40, rotation: 0 };
  assert.equal(previewLayout(layout, shape, { decoration: plant }).valid, false);
  assert.equal(previewLayout(layout, { ...shape, x: 300 }, { decoration: plant }).valid, true);
});
test('moving furniture never moves seats and furniture cannot overlap seats', () => {
  const seat = {
    ...room,
    id: 2,
    code: 'SEAT',
    category: 'DESK' as const,
    parentRoomId: 1,
    posX: 120,
    posY: 120,
    width: 40,
    height: 40
  };
  const before = structuredClone(seat);
  const result = previewLayout(
    { ...layout, resources: [room, seat] },
    { x: 120, y: 120, width: 120, height: 60, rotation: 0 },
    { decoration: table }
  );
  assert.equal(result.valid, false);
  assert.deepEqual(seat, before);
});
