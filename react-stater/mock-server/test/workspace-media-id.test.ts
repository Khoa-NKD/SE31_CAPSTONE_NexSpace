import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workspaceMediaId } from '../../src/features/organizer-onboarding/utils/workspace-media-id.ts';

test('gallery accepts numeric backend IDs and stored string IDs', () => {
  assert.equal(workspaceMediaId(6), 6);
  assert.equal(workspaceMediaId('6'), 6);
  assert.equal(workspaceMediaId(' 6 '), 6);
});

test('gallery rejects invalid IDs without extracting a different workspace from arbitrary text', () => {
  for (const value of [undefined, null, '', 0, -1, 1.5, NaN, 'WS-6', '6abc', {}, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(workspaceMediaId(value), null);
  }
});
