import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBookingMoney,
  snapshotCurrency
} from '../../src/features/workspaces/utils/booking-money.ts';

test('small VND amounts retain their recorded currency instead of being treated as USD', () => {
  assert.equal(
    formatBookingMoney(100, 'VND'),
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(100)
  );
  assert.equal(
    formatBookingMoney(0, 'VND'),
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(0)
  );
});

test('uses the immutable booking currency and rejects missing or malformed snapshots', () => {
  assert.equal(snapshotCurrency('{"currency":"VND"}'), 'VND');
  assert.equal(snapshotCurrency('{"currency":"USD"}'), 'USD');
  assert.equal(snapshotCurrency('{"currency":"EUR"}'), null);
  assert.equal(snapshotCurrency('not-json'), null);
  assert.equal(snapshotCurrency(undefined), null);
});

test('USD amounts do not switch to VND just because the amount is large', () => {
  assert.equal(formatBookingMoney(1000, 'USD'), '$1,000.00');
});
