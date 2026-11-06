import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canvasResourceForm } from '../../src/features/organizer-resources/utils/canvas-resource-form.ts';
import type { ResourceDetail } from '../../src/features/organizer-resources/api/resources';

test('canvas geometry uses the same resource identity, room and prices as resource management', () => {
  const resource = {
    id: 7,
    floorPlanId: 3,
    resourceTypeId: 2,
    parentRoomId: 4,
    code: 'SEAT-07',
    name: 'Window seat',
    zoneName: 'East',
    noiseLevel: 'QUIET',
    capacityOverride: 1,
    pricePerHour: '35000.00',
    description: 'Window-facing seat'
  } as ResourceDetail;
  const position = { posX: '240', posY: '120', width: '40', height: '40', rotation: '90' };
  const form = canvasResourceForm(resource, position);
  assert.equal(form.floorPlanId, 3);
  assert.equal(form.resourceTypeId, 2);
  assert.equal(form.parentRoomId, '4');
  assert.equal(form.pricePerHour, '35000.00');
  assert.equal(form.code, 'SEAT-07');
  assert.deepEqual(
    {
      posX: form.posX,
      posY: form.posY,
      width: form.width,
      height: form.height,
      rotation: form.rotation
    },
    position
  );
  assert.equal(resource.parentRoomId, 4);
});
test('open-area seats retain their empty parent without inventing a room', () => {
  const resource = {
    floorPlanId: 3,
    resourceTypeId: 2,
    parentRoomId: null,
    code: 'OPEN-01',
    name: 'Open seat',
    zoneName: null,
    noiseLevel: null,
    capacityOverride: null,
    pricePerHour: null,
    description: null
  } as ResourceDetail;
  const form = canvasResourceForm(resource, {
    posX: '10',
    posY: '20',
    width: '40',
    height: '40',
    rotation: '0'
  });
  assert.equal(form.parentRoomId, '');
  assert.equal(form.pricePerHour, '');
  assert.equal(form.capacityOverride, '');
  assert.equal(form.noiseLevel, '');
});
