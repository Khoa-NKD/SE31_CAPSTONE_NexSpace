import test from 'node:test';
import assert from 'node:assert/strict';
import { agreementReadComplete } from './agreement-reading.ts';

test('long agreements remain locked until their last visible line', () => {
  assert.equal(
    agreementReadComplete({ scrollTop: 0, clientHeight: 440, scrollHeight: 2400 }),
    false
  );
  assert.equal(
    agreementReadComplete({ scrollTop: 1500, clientHeight: 440, scrollHeight: 2400 }),
    false
  );
  assert.equal(
    agreementReadComplete({ scrollTop: 1960, clientHeight: 440, scrollHeight: 2400 }),
    true
  );
});

test('fully visible short documents need no artificial scrolling', () => {
  assert.equal(agreementReadComplete({ scrollTop: 0, clientHeight: 400, scrollHeight: 400 }), true);
});

test('hidden or invalid measurements cannot unlock consent', () => {
  assert.equal(agreementReadComplete({ scrollTop: 0, clientHeight: 0, scrollHeight: 0 }), false);
  assert.equal(
    agreementReadComplete({ scrollTop: Number.NaN, clientHeight: 440, scrollHeight: 2400 }),
    false
  );
  assert.equal(agreementReadComplete({ scrollTop: 0, clientHeight: 0, scrollHeight: 2400 }), false);
});
