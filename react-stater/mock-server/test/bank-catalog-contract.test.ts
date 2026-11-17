import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { bankCatalogSchema, bankCatalogQueryOptions, bankSearchText, findSelectedBank } from '../../src/features/organizer-business-profile/api/banks.ts';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const bank = { code: 'VCB', bin: '970436', name: 'Ngân hàng Ngoại thương Việt Nam', shortName: 'Vietcombank', logo: 'https://cdn.vietqr.io/img/VCB.png' };

test('loads the bank directory from the public BE contract and caches it', async () => {
  const client = new QueryClient();
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, '/api/public/banks');
    assert.equal(options?.method, 'GET');
    assert.equal((options?.headers as Record<string, string>).Authorization, undefined);
    return Response.json({ success: true, statusCode: 200, data: [bank] });
  };
  try {
    assert.deepEqual(await client.fetchQuery(bankCatalogQueryOptions()), [bank]);
    assert.deepEqual(await client.fetchQuery(bankCatalogQueryOptions()), [bank]);
    assert.equal(calls, 1);
  } finally { client.clear(); }
});

test('finds saved bank names without altering existing values and searches Vietnamese accents', () => {
  for (const name of [bank.shortName, bank.code, bank.name]) assert.equal(findSelectedBank([bank], name), bank);
  assert.equal(findSelectedBank([bank], 'Legacy bank'), undefined);
  assert.equal(bankSearchText('Ngân hàng Đầu tư'), 'ngan hang dau tu');
});

test('rejects invalid metadata and untrusted logos while allowing the icon fallback', () => {
  assert.equal(bankCatalogSchema.safeParse([{ ...bank, logo: null }]).success, true);
  for (const invalid of [[], [{ ...bank, bin: 'bad' }], [{ ...bank, logo: 'https://untrusted.example/a.png' }], [{ ...bank, logo: 'javascript:alert(1)' }]]) assert.equal(bankCatalogSchema.safeParse(invalid).success, false);
});
