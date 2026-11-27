import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cents,
  change,
  chartTrends,
  money,
  previousComparisonRange,
  resolveDatePreset
} from '../../src/features/organizer-analytics/format.ts';

test('money remains exact beyond JavaScript safe integer range', () => {
  assert.equal(cents('9999999999999999.99'), 999999999999999999n);
  assert.equal(money('9999999999999999.99', 'en-US'), '9,999,999,999,999,999.99 ₫');
  assert.equal(money('-10000.10', 'vi-VN'), '−10.000,10 ₫');
});

test('comparisons handle zero and negative baselines and fractional rental hours', () => {
  assert.equal(change('100', '0'), null);
  assert.equal(change('120', '100'), '+20.00%');
  assert.equal(change('-50', '-100'), '+50.00%');
  assert.equal(change('0.0050', '0.0025'), '+100.00%');
});

test('date presets match exact financial boundary specification for 2026-11-27', () => {
  const ref = '2026-11-27'; // Friday, 27/11/2026
  assert.deepEqual(resolveDatePreset('today', ref), { from: '2026-11-27', to: '2026-11-27' });
  assert.deepEqual(resolveDatePreset('yesterday', ref), { from: '2026-11-26', to: '2026-11-26' });
  assert.deepEqual(resolveDatePreset('last_7_days', ref), { from: '2026-11-21', to: '2026-11-27' });
  assert.deepEqual(resolveDatePreset('last_30_days', ref), { from: '2026-10-29', to: '2026-11-27' });
  assert.deepEqual(resolveDatePreset('this_month', ref), { from: '2026-11-01', to: '2026-11-27' });
  assert.deepEqual(resolveDatePreset('last_month', ref), { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(resolveDatePreset('this_quarter', ref), { from: '2026-10-01', to: '2026-11-27' });
  assert.deepEqual(resolveDatePreset('last_quarter', ref), { from: '2026-07-01', to: '2026-09-30' });
  assert.deepEqual(resolveDatePreset('this_year', ref), { from: '2026-01-01', to: '2026-11-27' });
  assert.deepEqual(resolveDatePreset('last_year', ref), { from: '2025-01-01', to: '2025-12-31' });
  // Week starts Monday (23/11/2026) and caps at today (27/11/2026); last week is Mon 16/11 to Sun 22/11
  assert.deepEqual(resolveDatePreset('this_week', ref), { from: '2026-11-23', to: '2026-11-27' });
  assert.deepEqual(resolveDatePreset('last_week', ref), { from: '2026-11-16', to: '2026-11-22' });
  assert.deepEqual( previousComparisonRange('2026-11-01', '2026-11-27'), {
    from: '2026-10-05',
    to: '2026-10-31'
  });
});

test('calendar grouping fills missing dates including leap days', () => {
  const rows = chartTrends({ from: '2024-02-28', to: '2024-03-01' }, [], 'day');
  assert.deepEqual(
    rows.map((r) => r.date),
    ['2024-02-28', '2024-02-29', '2024-03-01']
  );
  assert.equal(
    rows.every((r) => r.paidBookings === 0 && r.receivedAmount === '0'),
    true
  );
});

test('monthly totals add decimal text exactly and never include dates outside the range', () => {
  const result = chartTrends(
    { from: '2026-11-01', to: '2026-11-02' },
    [
      {
        date: '2026-11-01',
        paidBookings: 1,
        createdBookings: 2,
        receivedAmount: '0.10',
        refundedAmount: '0',
        netAmount: '0.10'
      },
      {
        date: '2026-11-02',
        paidBookings: 1,
        createdBookings: 1,
        receivedAmount: '0.20',
        refundedAmount: '0.10',
        netAmount: '0.10'
      },
      {
        date: '2026-11-03',
        paidBookings: 999,
        createdBookings: 999,
        receivedAmount: '999',
        refundedAmount: '0',
        netAmount: '999'
      }
    ],
    'month'
  );
  assert.equal(result[0].receivedAmount, '0.30');
  assert.equal(result[0].netAmount, '0.20');
  assert.equal(result[0].paidBookings, 2);
});
