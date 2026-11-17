import { useSyncExternalStore } from 'react';
import { ContractPanel } from '@/features/organizer-contract/components/contract-panel';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OwnerLifecycleStatus } from '@/features/organizer-lifecycle/components/owner-lifecycle-status';
import {
  applicationStatusPresentation,
  applicationStatusQueryOptions,
  applicationTimestamp,
  permittedReviewFeedback
} from '../api/status';

const emptySubscribe = () => () => {};

export function ApplicationStatusView() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const eligible = !!user && !!token && ['USER', 'ORGANIZER'].includes(user.role ?? '');
  const query = useQuery({
    ...applicationStatusQueryOptions(user?.id ?? 0),
    enabled: mounted && eligible
  });

  if (!mounted) return <p role='status'>Loading your application status…</p>;
  if (!user || !token)
    return (
      <div className='space-y-3' role='alert'>
        <p>Sign in to view your organizer application status.</p>
        <Link to='/auth/sign-in' className='text-primary underline'>
          Sign in
        </Link>
      </div>
    );
  if (!eligible)
    return (
      <p role='alert'>
        Only the Customer or Organizer who owns the application can view its status.
      </p>
    );
  if (query.isPending) return <p role='status'>Loading your application status…</p>;
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : undefined;
    return (
      <div className='space-y-3' role='alert'>
        <p>{query.error.message || 'Could not load your application status.'}</p>
        {status === 401 ? (
          <Link to='/auth/sign-in' className='text-primary underline'>
            Sign in
          </Link>
        ) : status !== 403 ? (
          <Button onClick={() => void query.refetch()}>Try again</Button>
        ) : null}
      </div>
    );
  }
  const application = query.data;
  if (!application)
    return (
      <Card>
        <CardHeader>
          <CardTitle>No organizer application yet</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p>You have not started an organizer application with this account.</p>
          <Link to='/organizer/apply' className='text-primary underline'>
            Start an application
          </Link>
          <Button
            variant='outline'
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Refresh status
          </Button>
        </CardContent>
      </Card>
    );

  const presentation = applicationStatusPresentation(application.status);
  const feedback = permittedReviewFeedback(application);
  return (
    <Card aria-busy={query.isFetching}>
      <CardHeader className='gap-3'>
        <CardTitle>Application #{application.id}</CardTitle>
        <Badge
          variant={
            application.status === 'REJECTED'
              ? 'destructive'
              : application.status === 'APPROVED'
                ? 'default'
                : 'secondary'
          }
        >
          {presentation.label}
        </Badge>
      </CardHeader>
      <CardContent className='min-w-0 space-y-6'>
        <p>{presentation.description}</p>
        <OwnerLifecycleStatus key={user.id} actorId={user.id} />
        {['CONTRACT_PENDING', 'APPROVED'].includes(application.status) && (
          <ContractPanel key={`contract-${user.id}`} />
        )}
        <dl className='grid min-w-0 gap-4 text-sm sm:grid-cols-2'>
          <div>
            <dt className='text-muted-foreground'>Legal business name</dt>
            <dd className='break-words font-medium'>{application.legalName || 'Not provided'}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>Application state</dt>
            <dd>{presentation.label}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>Submitted at</dt>
            <dd>
              <time dateTime={application.submittedAt || undefined}>
                {applicationTimestamp(application.submittedAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>Reviewed at</dt>
            <dd>
              <time dateTime={application.reviewedAt || undefined}>
                {applicationTimestamp(application.reviewedAt)}
              </time>
            </dd>
          </div>
        </dl>
        {(application.status === 'REJECTED' || application.status === 'REVISION_REQUESTED') && (
          <section className='space-y-2 rounded-md border p-4' aria-label='Review feedback'>
            <h2 className='font-medium'>
              {application.status === 'REJECTED' ? 'Rejection feedback' : 'Requested corrections'}
            </h2>
            <p className='whitespace-pre-wrap break-words text-sm'>
              {feedback || 'No review feedback was provided.'}
            </p>
          </section>
        )}
        <div className='flex flex-wrap items-center gap-4'>
          <Button
            variant='outline'
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? 'Refreshing…' : 'Refresh status'}
          </Button>
          {application.status === 'DRAFT' && (
            <Link to='/organizer/apply' className='text-primary underline'>
              Continue draft application
            </Link>
          )}
          {application.status === 'REVISION_REQUESTED' && (
            <Link to='/organizer/apply' className='text-primary underline'>
              Review requested corrections
            </Link>
          )}
          {application.status === 'APPROVED' && user.role === 'ORGANIZER' && (
            <Link to='/dashboard/organizer/business-profile' className='text-primary underline'>
              View business profile
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
