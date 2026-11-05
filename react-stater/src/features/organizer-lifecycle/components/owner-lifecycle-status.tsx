import { useOrganizerTranslation } from '@/features/organizer-application/hooks/use-organizer-translation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { currentUser } from '@/features/auth/api/session';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { ownerLifecycleQueryOptions } from '../api/lifecycle';

async function refreshPermissions(actorId: number, signal?: AbortSignal) {
  const account = await currentUser(signal);
  if (!signal?.aborted && useAuthStore.getState().user?.id === actorId)
    useAuthStore.getState().setUser(account);
}

export function OwnerLifecycleStatus({ actorId }: { actorId: number }) {
  const tr = useOrganizerTranslation();
  const query = useQuery(ownerLifecycleQueryOptions(actorId));
  const role = useAuthStore((state) => state.user?.role);
  const [roleError, setRoleError] = useState('');
  const approved = query.data?.status === 'APPROVED';
  useEffect(() => {
    if (!approved || role !== 'USER') return;
    const controller = new AbortController();
    void refreshPermissions(actorId, controller.signal).catch(() => {
      if (!controller.signal.aborted) setRoleError('Could not refresh account permissions.');
    });
    return () => controller.abort();
  }, [approved, role, actorId]);
  if (query.isPending) return <p role='status'>{tr('Loading operational status…')}</p>;
  if (query.isError)
    return (
      <div>
        <p role='alert'>{tr(query.error.message)}</p>
        <Button onClick={() => void query.refetch()}>{tr('Reload operational status')}</Button>
      </div>
    );
  return (
    <div className='space-y-3'>
      {query.data.suspended && (
        <section className='space-y-2 rounded border border-destructive p-4'>
          <h2 className='font-semibold'>{tr('Organizer operations suspended')}</h2>
          <p className='whitespace-pre-wrap break-words'>
            {query.data.suspensionReason || tr('Contact platform support for details.')}
          </p>
          <p>{tr('Approval and sign-in are retained. Organizer management is unavailable.')}</p>
        </section>
      )}
      {query.data.canCorrect && (
        <Link to='/organizer/apply' className='text-primary underline'>
          {tr('Correct and resubmit application')}{' '}
        </Link>
      )}
      {roleError && (
        <div>
          <p role='alert'>{tr(roleError)}</p>
          <Button
            onClick={() => {
              setRoleError('');
              void refreshPermissions(actorId).catch(() =>
                setRoleError('Could not refresh account permissions.')
              );
            }}
          >
            {tr('Refresh account permissions')}{' '}
          </Button>
        </div>
      )}
      <Button variant='outline' disabled={query.isFetching} onClick={() => void query.refetch()}>
        {tr('Refresh operational status')}{' '}
      </Button>
    </div>
  );
}
