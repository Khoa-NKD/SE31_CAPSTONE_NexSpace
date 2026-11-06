import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeDecorationKind } from '../../src/features/organizer-resources/utils/decoration-presets.ts';

const untouched = { label: false, dimensions: false, color: false };
const table = {
  kind: 'TABLE' as const,
  label: 'Bàn',
  width: '120',
  height: '80',
  color: '#94a3b8'
};
test('switching a default table to partition uses its proper name and slender footprint', () => {
  const value = changeDecorationKind(table, 'PARTITION', true, untouched);
  assert.equal(value.kind, 'PARTITION');
  assert.equal(value.label, 'Vách ngăn');
  assert.equal(value.width, '160');
  assert.equal(value.height, '12');
});
test('other furnishings use their own preset rather than retaining the table template', () => {
  const value = changeDecorationKind(table, 'OTHER', false, untouched);
  assert.equal(value.label, 'Other furnishing');
  assert.equal(value.width, '60');
  assert.equal(value.height, '60');
});
test('user-edited names, sizes and colors survive a kind change', () => {
  const value = changeDecorationKind(table, 'PLANT', true, {
    label: true,
    dimensions: true,
    color: true
  });
  assert.equal(value.label, table.label);
  assert.equal(value.width, table.width);
  assert.equal(value.height, table.height);
  assert.equal(value.color, table.color);
  const custom = { ...table, label: 'Bàn lễ tân', width: '200', height: '90', color: '#123456' };
  const next = changeDecorationKind(custom, 'PARTITION', true, untouched);
  assert.equal(next.label, custom.label);
  assert.equal(next.width, custom.width);
  assert.equal(next.color, custom.color);
});
