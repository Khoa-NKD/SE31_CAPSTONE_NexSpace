import test from 'node:test';
import assert from 'node:assert/strict';
import { geometryDisplay, geometryInput, metresToPixels, pixelsToMetres } from './metric-units.ts';

test('real footprints use one scale on both axes', () => {
  assert.equal(metresToPixels(0.8), 48);
  assert.equal(pixelsToMetres(48), 0.8);
  assert.equal(geometryDisplay('48', true), '0.8');
  assert.equal(geometryInput('0.8', true), '48');
});
test('empty, legacy and angular inputs retain their meaning', () => {
  assert.equal(geometryInput('', true), '');
  assert.equal(geometryDisplay('48', false), '48');
  assert.equal(geometryDisplay('90', true, true), '90');
  assert.equal(geometryInput('90', true, true), '90');
});
