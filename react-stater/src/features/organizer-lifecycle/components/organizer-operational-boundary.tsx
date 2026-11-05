import { useSyncExternalStore, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ownerLifecycleQueryOptions } from '../api/lifecycle';
const emptySubscribe = () => () => {};

/** Keep customer routes available while blocking suspended Organizer management screens. */
export function OrganizerOperationalBoundary({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const actor = useAuthStore((state) => state.user);
  const { pathname } = useLocation();
  const protectedRoute =
    actor?.role === 'ORGANIZER' &&
    pathname !== '/dashboard/organizer/application' &&
    pathname !== '/dashboard/organizer/application/' &&
    (pathname === '/dashboard/organizer' || pathname.startsWith('/dashboard/organizer/'));
  if (!protectedRoute) return children;
  if (!mounted) return <p role='status'>Checking Organizer operational access…</p>;
  return (
    <OwnedOperationalBoundary key={actor.id} actorId={actor.id}>
      {children}
    </OwnedOperationalBoundary>
  );
}
function OwnedOperationalBoundary({ actorId, children }: { actorId: number; children: ReactNode }) {
  const query = useQuery(ownerLifecycleQueryOptions(actorId));
  if (query.isPending)
    return (
      <p role='status' className='p-6'>
        Checking Organizer operational access…
      </p>
    );
  // Legacy Organizer accounts without an onboarding profile retain their existing access policy.
  if (query.isError && query.error instanceof ApiError && query.error.status === 404)
    return children;
  if (query.isError)
    return (
      <div className='space-y-3 p-6'>
        <p role='alert'>{query.error.message}</p>
        <Button onClick={() => void query.refetch()}>Retry access check</Button>
      </div>
    );
  if (!query.data.suspended) return children;
  return (
    <section className='space-y-4 p-6'>
      <h1 className='text-2xl font-semibold'>Organizer operations suspended</h1>
      <p className='whitespace-pre-wrap break-words'>
        {query.data.suspensionReason || 'Contact platform support for details.'}
      </p>
      <p>You can still sign in, view your application status and use customer features.</p>
      <Link to='/dashboard/organizer/application' className='text-primary underline'>
        View application status
      </Link>
      <Button variant='outline' onClick={() => void query.refetch()}>
        Refresh access status
      </Button>
    </section>
  );
}
