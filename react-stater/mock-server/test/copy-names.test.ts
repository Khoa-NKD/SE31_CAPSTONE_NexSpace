import assert from 'node:assert/strict';
import test from 'node:test';
import {
  copyDisplayName,
  copyResourceCode
} from '../../src/features/organizer-resources/utils/copy-names.ts';

test('repeated copies keep one short suffix and preserve meaningful room numbers', () => {
  const names = ['Phòng 201'];
  const codes = ['ROOM-201'];
  for (let i = 1; i <= 100; i++) {
    const name = copyDisplayName(names.at(-1)!, names, 'vi');
    const code = copyResourceCode(codes.at(-1)!, codes);
    assert.equal(name, `Phòng 201 (bản sao ${i})`);
    assert.equal(code, `ROOM-201-C${i}`);
    names.push(name);
    codes.push(code);
  }
});

test('legacy repeated name suffixes collapse and both languages share a copy sequence', () => {
  assert.equal(
    copyDisplayName('Ghế A (bản sao) (copy)', ['Ghế A (copy 4)'], 'vi'),
    'Ghế A (bản sao 5)'
  );
  assert.equal(copyDisplayName('Ghế A (bản sao 5)', ['Ghế A (copy 6)'], 'en'), 'Ghế A (copy 7)');
});

test('codes check case-insensitive collisions without stripping domain numbers', () => {
  assert.equal(copyResourceCode('d-1-01', ['D-1-01-C1', 'd-1-01-c3']), 'D-1-01-C4');
  assert.equal(copyResourceCode('D-1-01-C4', []), 'D-1-01-C5');
});

test('several children with the same source name get distinct sequential names', () => {
  const names = ['Seat'];
  names.push(copyDisplayName('Seat', names, 'en'));
  names.push(copyDisplayName('Seat', names, 'en'));
  assert.deepEqual(names, ['Seat', 'Seat (copy 1)', 'Seat (copy 2)']);
});

test('long names and codes retain suffixes within API length limits', () => {
  const name = copyDisplayName('A'.repeat(150), [], 'vi');
  const nextName = copyDisplayName(name, [name], 'vi');
  const code = copyResourceCode('A'.repeat(50), []);
  assert.ok(name.length <= 150 && nextName.length <= 150 && code.length <= 50);
  assert.ok(nextName.endsWith('(bản sao 2)'));
  assert.ok(code.endsWith('-C1'));
  assert.ok(copyDisplayName('A'.repeat(100), [], 'vi', 100).length <= 100);
});

test('non-copy parentheses and existing meaningful labels remain intact', () => {
  assert.equal(copyDisplayName('Phòng A (VIP)', [], 'vi'), 'Phòng A (VIP) (bản sao 1)');
  assert.equal(copyResourceCode('F2-R201', []), 'F2-R201-C1');
});

test('untrusted huge suffixes cannot freeze the copy counter', () => {
  const suffix = '9'.repeat(100);
  assert.equal(copyDisplayName(`Seat (copy ${suffix})`, [], 'en'), 'Seat (copy 1)');
  assert.equal(copyResourceCode(`SEAT-C${suffix}`, []), 'SEAT-C1');
});
