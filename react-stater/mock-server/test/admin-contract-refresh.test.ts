import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient, QueryObserver, focusManager } from '@tanstack/react-query';
import { adminApplicationDetailsQueryOptions } from '../../src/features/admin-organizers/api/application-details.ts';
import { adminApplicationsQueryOptions, adminApplicationSearchSchema } from '../../src/features/admin-organizers/api/applications.ts';
import { adminLifecycleQueryOptions } from '../../src/features/organizer-lifecycle/api/lifecycle.ts';
import { contractQueryOptions } from '../../src/features/organizer-contract/api/contract.ts';

test('returning to the admin tab refreshes all review records without interval polling', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const options = [
    adminApplicationDetailsQueryOptions(2, '1'),
    adminApplicationsQueryOptions(2, adminApplicationSearchSchema.parse({})),
    adminLifecycleQueryOptions(2, '1'),
    contractQueryOptions(2, '1')
  ];
  let signed = false;
  let reads = 0;
  const observers: QueryObserver<string>[] = [];
  const unsubscribers: (() => void)[] = [];
  focusManager.setFocused(false);
  client.mount();
  try {
    for (const option of options) {
      const observer = new QueryObserver<string>(client, {
        queryKey: option.queryKey,
        staleTime: typeof option.staleTime === 'number' ? option.staleTime : 0,
        refetchOnWindowFocus: option.refetchOnWindowFocus === true,
        queryFn: async () => { reads++; return signed ? 'SIGNED / APPROVED' : 'PENDING'; }
      });
      observers.push(observer);
      unsubscribers.push(observer.subscribe(() => {}));
      await observer.refetch();
    }
    assert.equal(reads, 4);
    signed = true;
    focusManager.setFocused(true);
    await new Promise<void>((resolve) => setImmediate(resolve));
    for (const observer of observers) assert.equal(observer.getCurrentResult().data, 'SIGNED / APPROVED');
    assert.equal(reads, 8);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(reads, 8);
  } finally {
    for (const unsubscribe of unsubscribers) unsubscribe();
    client.unmount(); client.clear(); focusManager.setFocused(undefined);
  }
});
