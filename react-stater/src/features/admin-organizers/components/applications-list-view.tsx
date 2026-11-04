import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { BUSINESS_TYPES } from '@/features/organizer-application/api/application';
import {
  applicationStatusPresentation,
  applicationTimestamp
} from '@/features/organizer-application-status/api/status';
import { adminApplicationsQueryOptions } from '../api/applications';
import type { AdminApplicationFilters } from '../api/applications';

const emptySubscribe = () => () => {};

export function ApplicationsListView({
  filters,
  onChange
}: {
  filters: AdminApplicationFilters;
  onChange: (patch: Partial<AdminApplicationFilters>) => void;
}) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const actor = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const allowed = !!actor && !!token && actor.role === 'ADMIN';
  const query = useQuery({
    ...adminApplicationsQueryOptions(actor?.id ?? 0, filters),
    enabled: mounted && allowed
  });

  if (!mounted) return <p role='status'>Loading applications…</p>;
  if (!allowed)
    return <p role='alert'>Administrator access is required to view organizer applications.</p>;

  return (
    <div className='min-w-0 space-y-5'>
      <p className='text-sm text-muted-foreground'>
        Only submitted organizer applications are listed. Review outcomes show the current result; a
        complete decision history is not available.
      </p>
      <div className='grid min-w-0 gap-3 rounded-lg border bg-card p-4 md:grid-cols-2 xl:grid-cols-4'>
        <form
          className='min-w-0 space-y-2 md:col-span-2'
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get('search');
            onChange({ search: typeof value === 'string' ? value.trim() : '' });
          }}
        >
          <label htmlFor='application-search' className='text-sm font-medium'>
            Search applications
          </label>
          <div className='flex gap-2'>
            <Input
              key={filters.search}
              id='application-search'
              name='search'
              defaultValue={filters.search}
              maxLength={255}
              placeholder='Business name, applicant username or email'
            />
            <Button type='submit'>Search</Button>
          </div>
        </form>
        <div className='space-y-2'>
          <label htmlFor='application-status-filter' className='text-sm font-medium'>
            Application status
          </label>
          <select
            id='application-status-filter'
            value={filters.status}
            onChange={(event) =>
              onChange({ status: event.target.value as AdminApplicationFilters['status'] })
            }
            className='h-9 w-full rounded-md border bg-background px-2 text-sm'
          >
            <option value='all'>All submitted applications</option>
            <option value='PENDING_REVIEW'>Pending review</option>
            <option value='APPROVED'>Approved</option>
            <option value='REJECTED'>Rejected</option>
            <option value='REVISION_REQUESTED'>Changes requested</option>
          </select>
        </div>
        <div className='space-y-2'>
          <label htmlFor='application-sort' className='text-sm font-medium'>
            Sort by
          </label>
          <select
            id='application-sort'
            value={filters.sortBy}
            onChange={(event) =>
              onChange({ sortBy: event.target.value as AdminApplicationFilters['sortBy'] })
            }
            className='h-9 w-full rounded-md border bg-background px-2 text-sm'
          >
            <option value='submittedAt'>Submission time</option>
            <option value='reviewedAt'>Review time</option>
            <option value='legalName'>Business name</option>
            <option value='status'>Status</option>
            <option value='id'>Application ID</option>
          </select>
        </div>
        <div className='space-y-2'>
          <label htmlFor='application-sort-direction' className='text-sm font-medium'>
            Sort direction
          </label>
          <select
            id='application-sort-direction'
            value={filters.sortDir}
            onChange={(event) =>
              onChange({ sortDir: event.target.value as AdminApplicationFilters['sortDir'] })
            }
            className='h-9 w-full rounded-md border bg-background px-2 text-sm'
          >
            <option value='desc'>Descending</option>
            <option value='asc'>Ascending</option>
          </select>
        </div>
        <div className='space-y-2'>
          <label htmlFor='application-page-size' className='text-sm font-medium'>
            Rows per page
          </label>
          <select
            id='application-page-size'
            value={filters.size}
            onChange={(event) => onChange({ size: Number(event.target.value) })}
            className='h-9 w-full rounded-md border bg-background px-2 text-sm'
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className='flex flex-wrap items-end gap-2 md:col-span-2'>
          <Button
            variant='outline'
            onClick={() =>
              onChange({
                search: '',
                status: 'PENDING_REVIEW',
                size: 20,
                sortBy: 'submittedAt',
                sortDir: 'desc'
              })
            }
          >
            Reset filters
          </Button>
          <Button
            variant='outline'
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Refresh applications
          </Button>
        </div>
      </div>

      {query.isPending ? (
        <p role='status'>Loading applications…</p>
      ) : query.isError ? (
        <div role='alert' className='space-y-3'>
          <p>{query.error.message || 'Could not load organizer applications.'}</p>
          {!(query.error instanceof ApiError && [401, 403].includes(query.error.status)) && (
            <Button onClick={() => void query.refetch()}>Try again</Button>
          )}
        </div>
      ) : (
        <>
          <p role='status' className='text-sm'>
            Matching applications: {query.data.totalRecords}
          </p>
          {!query.data.listObjects.length ? (
            <div className='rounded-lg border p-6 text-center'>
              <p>No submitted applications match these filters.</p>
              {filters.page > 1 && (
                <Button className='mt-3' variant='outline' onClick={() => onChange({ page: 1 })}>
                  Return to first page
                </Button>
              )}
            </div>
          ) : (
            <div className='min-w-0 rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application ID</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Submitted at</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed at</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.data.listObjects.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className='font-mono'>#{application.id}</TableCell>
                      <TableCell>
                        <p className='max-w-64 whitespace-normal break-words font-medium'>
                          {application.legalName || 'Not provided'}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {BUSINESS_TYPES.find(
                            ([type]) => type === application.businessType
                          )?.[1] ??
                            application.businessType ??
                            'Not provided'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p>{application.applicantUserName}</p>
                        <p className='text-xs text-muted-foreground'>
                          {application.applicantEmail}
                        </p>
                      </TableCell>
                      <TableCell>
                        <time dateTime={application.submittedAt}>
                          {applicationTimestamp(application.submittedAt)}
                        </time>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            application.status === 'REJECTED'
                              ? 'destructive'
                              : application.status === 'APPROVED'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {applicationStatusPresentation(application.status).label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <time dateTime={application.reviewedAt || undefined}>
                          {applicationTimestamp(application.reviewedAt)}
                        </time>
                      </TableCell>
                      <TableCell>
                        <Button variant='outline' size='sm' asChild>
                          <Link
                            to='/dashboard/admin/organizers/$applicationId'
                            params={{ applicationId: String(application.id) }}
                            search={{ ...filters, appId: undefined }}
                            aria-label={`View application #${application.id}`}
                          >
                            View details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className='flex flex-wrap items-center justify-between gap-3 text-sm'>
            <span>
              Page {query.data.pageNumber} of {Math.max(1, query.data.totalPages)}
            </span>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                disabled={!query.data.hasPrevious || query.isFetching}
                onClick={() => onChange({ page: filters.page - 1 })}
              >
                Previous page
              </Button>
              <Button
                variant='outline'
                disabled={!query.data.hasNext || query.isFetching}
                onClick={() => onChange({ page: filters.page + 1 })}
              >
                Next page
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
