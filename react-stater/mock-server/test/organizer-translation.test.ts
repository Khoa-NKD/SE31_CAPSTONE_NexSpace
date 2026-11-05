import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  organizerVietnamese,
  translateOrganizer
} from '../../src/features/organizer-application/i18n.ts';

test('organizer messages support both languages without modifying source labels', () => {
  for (const [english, vietnamese] of Object.entries(organizerVietnamese)) {
    assert.ok(vietnamese.trim());
    assert.equal(translateOrganizer(english, 'vi'), vietnamese);
    assert.equal(translateOrganizer(english, 'en'), english);
  }
  assert.equal(translateOrganizer('Save draft', 'vi'), 'Lưu bản nháp');
  assert.equal(translateOrganizer('Business license', 'vi'), 'Giấy phép kinh doanh');
});
test('unknown messages are preserved and empty messages are safe', () => {
  assert.equal(translateOrganizer('Provider-specific error', 'vi'), 'Provider-specific error');
  assert.equal(translateOrganizer(undefined, 'vi'), '');
});
