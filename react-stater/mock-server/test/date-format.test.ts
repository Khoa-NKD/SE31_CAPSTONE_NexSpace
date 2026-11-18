import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  formatDate,
  formatDateTime,
  formatDateLabel,
  parseDisplayDate
} from '../../src/lib/format.ts';

test('day-first calendar dates round trip without changing API values', () => {
  for (const iso of ['2026-11-03', '2026-01-12', '2024-02-29', '2026-12-31']) {
    assert.equal(parseDisplayDate(formatDate(iso)), iso);
  }
  assert.equal(formatDate('2026-11-03'), '03/11/2026');
  assert.equal(parseDisplayDate('03/11/2026 09:05', true), '2026-11-03T09:05');
  assert.equal(parseDisplayDate(''), '');
});

test('invalid dates, incomplete input and invalid times cannot become valid form values', () => {
  for (const value of [
    '31/02/2026',
    '29/02/2025',
    '00/11/2026',
    '12/13/2026',
    '03/11/26',
    '3/11/2026'
  ]) {
    assert.equal(parseDisplayDate(value), undefined);
  }
  assert.equal(parseDisplayDate('03/11/2026 24:00', true), undefined);
  assert.equal(parseDisplayDate('03/11/2026 09:60', true), undefined);
  assert.equal(formatDate('2026-02-31'), '');
  assert.equal(formatDate('invalid'), '');
  assert.equal(formatDate(undefined), '');
});

test('timestamp formatting honors an explicit timezone and uses a 24-hour clock', () => {
  assert.equal(formatDateTime('2026-11-03T00:05:00Z', { timeZone: 'UTC' }), '03/11/2026 00:05');
  assert.equal(
    formatDateTime('2026-11-03T23:05:00Z', { timeZone: 'Asia/Bangkok' }),
    '04/11/2026 06:05'
  );
});

test('recorded display labels keep their timezone and do not invent missing years', () => {
  assert.equal(formatDateLabel('2026-11-03T09:05:00'), '03/11/2026 09:05');
  assert.equal(formatDateLabel('2026-11-03T09:05:00Z'), '03/11/2026 09:05 UTC');
  assert.equal(formatDateLabel('2026-11-03T09:05:00+07:00'), '03/11/2026 09:05 +07:00');
  assert.equal(formatDateLabel('2026-11'), '11/2026');
  assert.equal(formatDateLabel('Nov 3, 2026'), '03/11/2026');
  assert.equal(formatDateLabel('2h ago'), '2h ago');
  assert.equal(formatDateLabel('Nov 3'), 'Nov 3');
});

test('plain calendar dates stay the same on both sides of UTC', () => {
  const url = new URL('../../src/lib/format.ts', import.meta.url).href;
  for (const zone of ['America/Los_Angeles', 'Asia/Bangkok', 'Pacific/Kiritimati']) {
    const child = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        '--input-type=module',
        '-e',
        `import {formatDate} from ${JSON.stringify(url)}; process.stdout.write(formatDate('2026-01-01'));`
      ],
      { env: { ...process.env, TZ: zone }, encoding: 'utf8' }
    );
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout, '01/01/2026');
  }
});
