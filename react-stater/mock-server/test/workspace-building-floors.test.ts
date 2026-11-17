import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workspaceBuildingFloors } from '../../src/features/organizer-resources/utils/workspace-building-floors.ts';
import type {
  Building,
  FloorOccupant,
  PhysicalFloor
} from '../../src/features/organizer-resources/api/buildings.ts';
import type { FloorOption } from '../../src/features/organizer-resources/api/resources.ts';

const occupant = (workspaceId: number, floorPlanId: number, layoutName: string): FloorOccupant => ({
  workspaceId,
  floorPlanId,
  layoutName,
  workspaceName: `Workspace ${workspaceId}`,
  status: 'PUBLISHED',
  x: 0,
  y: 0,
  width: 600,
  height: 600
});
const physicalFloor = (id: number, occupants: FloorOccupant[]): PhysicalFloor => ({
  id,
  name: `Floor ${id}`,
  floorNumber: id,
  width: 1200,
  height: 900,
  revision: 'floor-v1',
  occupants
});
const building = (floors: PhysicalFloor[]): Building => ({
  id: 10,
  name: 'Building',
  address: 'Test address',
  revision: 'building-v1',
  floors
});

test('keeps other workspace floors and empty floors visible but non-interactive', () => {
  const source = building([
    physicalFloor(1, [occupant(7, 101, 'Own layout')]),
    physicalFloor(2, [occupant(8, 202, 'Other layout')]),
    physicalFloor(3, [])
  ]);
  const original = structuredClone(source);
  const result = workspaceBuildingFloors(source, [], 7);
  assert.deepEqual(
    result.map(({ id, linked, workspaceId }) => ({ id, linked, workspaceId })),
    [
      { id: 101, linked: true, workspaceId: 7 },
      { id: -2, linked: false, workspaceId: undefined },
      { id: -3, linked: false, workspaceId: undefined }
    ]
  );
  assert.equal(result[1].displayName, 'Floor 2');
  assert.deepEqual(source, original);
});

test('a shared physical floor uses the selected workspace even when another occupant is listed first', () => {
  const source = building([
    physicalFloor(1, [occupant(8, 202, 'Other layout'), occupant(7, 101, 'Own layout')])
  ]);
  const [own] = workspaceBuildingFloors(source, [], 7);
  assert.equal(own.id, 101);
  assert.equal(own.linked, true);
  assert.equal(own.workspaceId, 7);
  assert.equal(own.displayName, 'Floor 1 (Own layout)');
  assert.equal(own.displayName.includes('Other layout'), false);

  const [other] = workspaceBuildingFloors(source, [], 8);
  assert.equal(other.id, 202);
  assert.equal(other.workspaceId, 8);
});

test('own workspace options preserve current layout metadata while the building catalog refreshes', () => {
  const own: FloorOption = {
    id: 101,
    name: 'Own layout',
    floorNumber: 1,
    status: 'PUBLISHED',
    revision: 'current-revision',
    location: {
      buildingId: 10,
      buildingName: 'Building',
      buildingAddress: 'Test address',
      buildingFloorId: 1,
      physicalFloorName: 'Floor 1',
      floorNumber: 1,
      x: 0,
      y: 0,
      width: 600,
      height: 600
    }
  };
  const [entry] = workspaceBuildingFloors(building([physicalFloor(1, [])]), [own], 7);
  assert.equal(entry.linked, true);
  assert.equal(entry.id, own.id);
  assert.equal(entry.revision, own.revision);
  assert.equal(entry.workspaceId, 7);
});

test('switching workspace changes which physical floors are enabled', () => {
  const source = building([
    physicalFloor(1, [occupant(7, 101, 'A')]),
    physicalFloor(2, [occupant(8, 202, 'B')])
  ]);
  assert.deepEqual(
    workspaceBuildingFloors(source, [], 7).map((floor) => floor.linked),
    [true, false]
  );
  assert.deepEqual(
    workspaceBuildingFloors(source, [], 8).map((floor) => floor.linked),
    [false, true]
  );
});

test('legacy workspace floors remain accessible without a mapped building', () => {
  const floors: FloorOption[] = [
    { id: 101, name: 'Legacy', floorNumber: 1, status: 'DRAFT', revision: 'v1' }
  ];
  const [entry] = workspaceBuildingFloors(undefined, floors, 7);
  assert.equal(entry.id, 101);
  assert.equal(entry.linked, true);
  assert.equal(entry.workspaceId, 7);
});
