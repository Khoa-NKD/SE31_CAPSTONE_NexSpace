import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import {
  businessTypeLabel,
  businessTypesQueryOptions
} from '../../src/features/organizer-application/api/business-types.ts';
import { applicationDraftSchema } from '../../src/features/organizer-application/api/application.ts';

const originalFetch = globalThis.fetch;
const clients: QueryClient[] = [];
const options = [
  {
    code: 'LIMITED_LIABILITY' as const,
    nameVi: 'Công ty trách nhiệm hữu hạn',
    nameEn: 'Limited liability company',
    sortOrder: 20
  }
];
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const client of clients.splice(0)) client.clear();
});
test('loads bilingual master data from the real public Spring route without a login', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/public/business-types');
    assert.equal(init?.method, 'GET');
    return Response.json({ success: true, statusCode: 200, data: options });
  };
  const client = new QueryClient();
  clients.push(client);
  assert.deepEqual(await client.fetchQuery(businessTypesQueryOptions()), options);
});
test('language changes only the displayed label and retains the submitted stable code', () => {
  assert.equal(
    businessTypeLabel(options, 'LIMITED_LIABILITY', 'vi'),
    'Công ty trách nhiệm hữu hạn'
  );
  assert.equal(businessTypeLabel(options, 'LIMITED_LIABILITY', 'en'), 'Limited liability company');
  assert.equal(options[0].code, 'LIMITED_LIABILITY');
  assert.equal(businessTypeLabel([], 'LIMITED_LIABILITY', 'vi'), 'LIMITED_LIABILITY');
});
test('invalid or empty master responses fail instead of silently supplying invented options', async () => {
  for (const data of [
    [],
    [{ ...options[0], code: 'INDIVIDUAL' }],
    [{ ...options[0], nameVi: '' }]
  ]) {
    globalThis.fetch = async () => Response.json({ success: true, data });
    const client = new QueryClient();
    clients.push(client);
    await assert.rejects(client.fetchQuery(businessTypesQueryOptions()));
  }
  assert.equal(applicationDraftSchema.shape.businessType.safeParse('INDIVIDUAL').success, false);
});
