import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stageLayoutObject,
  changedLayoutResources
} from '../../src/features/organizer-resources/utils/manual-layout-draft.ts';
import type { FloorLayout } from '../../src/features/organizer-resources/api/resources.ts';

const base: FloorLayout = {
  floor: { id: 1, name: 'Area', floorNumber: 1, status: 'DRAFT', revision: 'v1' },
  width: 1000,
  height: 800,
  editableLayout: true,
  resources: [
    {
      id: 1,
      name: 'Room',
      code: 'R1',
      category: 'ROOM',
      posX: 100,
      posY: 100,
      width: 300,
      height: 250,
      rotation: 0,
      status: 'DRAFT',
      revision: 'r1'
    },
    {
      id: 2,
      name: 'Seat',
      code: 'S1',
      category: 'DESK',
      parentRoomId: 1,
      posX: 120,
      posY: 120,
      width: 40,
      height: 40,
      rotation: 0,
      status: 'DRAFT',
      revision: 's1'
    },
    {
      id: 3,
      name: 'Open seat',
      code: 'S2',
      category: 'DESK',
      posX: 500,
      posY: 100,
      width: 40,
      height: 40,
      rotation: 0,
      status: 'DRAFT',
      revision: 's2'
    }
  ],
  decorations: [
    {
      id: 'locker',
      kind: 'OTHER',
      icon: 'LOCKER',
      label: 'Locker',
      posX: 200,
      posY: 200,
      width: 40,
      height: 40,
      rotation: 0,
      color: '#64748B'
    }
  ]
};
const fields = (x: number, y: number, width = 40, height = 40) => ({
  posX: String(x),
  posY: String(y),
  width: String(width),
  height: String(height),
  rotation: '0'
});

test('multiple independent edits remain staged and retain persisted IDs and revisions', () => {
  const first = stageLayoutObject(base, 'resource:2', fields(150, 140));
  const second = stageLayoutObject(first, 'resource:3', fields(600, 150));
  assert.equal(second.resources[1].posX, 150);
  assert.equal(second.resources[2].posX, 600);
  assert.deepEqual(
    changedLayoutResources(base, second).map((item) => item.id),
    [2, 3]
  );
  assert.equal(second.resources[1].revision, 's1');
  assert.equal(base.resources[1].posX, 120);
});
test('moving a room carries previously edited children and furnishings once; reverting keeps other edits', () => {
  const first = stageLayoutObject(base, 'resource:2', fields(150, 140));
  const moved = stageLayoutObject(first, 'resource:1', fields(200, 200, 300, 250));
  assert.equal(moved.resources[1].posX, 250);
  assert.equal(moved.decorations?.[0].posX, 300);
  assert.equal(moved.decorations?.[0].icon, 'LOCKER');
  const reverted = stageLayoutObject(moved, 'resource:1', fields(100, 100, 300, 250));
  assert.equal(reverted.resources[1].posX, 150);
  assert.deepEqual(
    changedLayoutResources(base, reverted).map((item) => item.id),
    [2]
  );
});
