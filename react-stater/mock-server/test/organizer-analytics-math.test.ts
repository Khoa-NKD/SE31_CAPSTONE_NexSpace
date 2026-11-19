import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cents,
  change,
  chartTrends,
  money
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
