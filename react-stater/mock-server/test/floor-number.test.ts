import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextFloorNumber,
  isDuplicateFloorNumber
} from '../../src/features/organizer-resources/utils/floor-number.ts';

test('suggest the next number above the highest existing floor without mutating input', () => {
  const floors = [{ floorNumber: 5 }, { floorNumber: 1 }, { floorNumber: 2 }];
  assert.equal(nextFloorNumber(floors), 6);
  assert.equal(floors[0].floorNumber, 5);
  assert.equal(nextFloorNumber([{ floorNumber: 1 }, { floorNumber: 2 }]), 3);
});
test('empty and basement-only workspaces start at one and respect the server limit', () => {
  assert.equal(nextFloorNumber([]), 1);
  assert.equal(nextFloorNumber([{ floorNumber: -1 }, { floorNumber: 0 }]), 1);
  assert.equal(nextFloorNumber([{ floorNumber: 500 }]), null);
});
test('reject duplicate floor numbers including zero and negative floors', () => {
  const floors = [{ floorNumber: 1 }, { floorNumber: 0 }, { floorNumber: -1 }];
  for (const value of ['1', '01', '0', '-1'])
    assert.equal(isDuplicateFloorNumber(floors, value), true);
  for (const value of ['', 'invalid', '2'])
    assert.equal(isDuplicateFloorNumber(floors, value), false);
});
