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
import { useBusinessTypes } from '@/features/organizer-application/hooks/use-business-types';
import {
  applicationStatusPresentation,
  applicationTimestamp
} from '@/features/organizer-application-status/api/status';
import { adminApplicationsQueryOptions } from '../api/applications';
import type { AdminApplicationFilters } from '../api/applications';
import { ApplicationsPagination } from './applications-pagination';
import { useAdminReviewFocusRefresh } from '../hooks/use-admin-review-focus-refresh';
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  RefreshCw,
  Building2,
  ArrowUpRight,
  Inbox
} from 'lucide-react';

const emptySubscribe = () => () => {};

export function ApplicationsListView({
  filters,
  onChange
}: {
  filters: AdminApplicationFilters;
  onChange: (patch: Partial<AdminApplicationFilters>) => void;
}) {
  const businessTypes = useBusinessTypes();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const actor = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const allowed = !!actor && !!token && actor.role === 'ADMIN';
  useAdminReviewFocusRefresh(mounted && allowed);
  const query = useQuery({
    ...adminApplicationsQueryOptions(actor?.id ?? 0, filters),
    enabled: mounted && allowed
  });

  if (!mounted) return <p role='status'>Loading applications…</p>;
  if (!allowed)
    return <p role='alert'>Administrator access is required to view organizer applications.</p>;

  return (
    <div className='min-w-0 space-y-5 [&_select]:h-10 [&_select]:rounded-xl [&_select]:border-input [&_select]:px-3 [&_select]:text-xs [&_select]:outline-none [&_select]:focus-visible:ring-2 [&_select]:focus-visible:ring-ring/30'>
      <p className='text-xs leading-5 text-muted-foreground'>
        Only submitted organizer applications are listed. Review outcomes show the current result; a
        complete decision history is not available.
      </p>
      <section
        className='overflow-hidden rounded-2xl border bg-card shadow-sm'
        aria-label='Application filters'
      >
        <div className='flex items-center gap-2 border-b bg-muted/20 px-5 py-3.5 text-sm font-semibold'>
          <SlidersHorizontal className='size-4 text-primary' aria-hidden='true' /> Filter
          applications
        </div>
        <div className='grid min-w-0 gap-4 p-5 md:grid-cols-2 xl:grid-cols-4'>
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
              <div className='relative min-w-0 flex-1'>
                <Search
                  className='pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground'
                  aria-hidden='true'
                />
                <Input
                  className='h-10 rounded-xl pl-9 text-xs shadow-none'
                  key={filters.search}
                  id='application-search'
                  name='search'
                  defaultValue={filters.search}
                  maxLength={255}
                  placeholder='Business name, applicant username or email'
                />
              </div>
              <Button type='submit' className='h-10 rounded-xl px-5 text-xs shadow-none'>
                Search
              </Button>
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
              <option value='CONTRACT_PENDING'>Awaiting agreement</option>
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
          <div className='flex flex-wrap items-end justify-end gap-2 md:col-span-2 xl:col-span-3'>
            <Button
              variant='outline'
              className='h-10 rounded-xl text-xs shadow-none'
              onClick={() =>
                onChange({
                  search: '',
                  status: 'all',
                  size: 20,
                  sortBy: 'submittedAt',
                  sortDir: 'desc'
                })
              }
            >
              <RotateCcw className='size-3.5' aria-hidden='true' /> Reset filters
            </Button>
            <Button
              variant='outline'
              disabled={query.isFetching}
              className='h-10 rounded-xl text-xs shadow-none'
              onClick={() => void query.refetch()}
            >
              <RefreshCw
                className={`size-3.5 ${query.isFetching ? 'animate-spin' : ''}`}
                aria-hidden='true'
              />{' '}
              Refresh applications
            </Button>
          </div>
        </div>
      </section>

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
          <div className='overflow-hidden rounded-2xl border bg-card shadow-sm'>
            <div className='flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4'>
              <h2 className='flex items-center gap-2 text-sm font-semibold'>
                <Building2 className='size-4 text-primary' aria-hidden='true' /> Organizer
                Applications{' '}
                <span
                  role='status'
                  className='rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary'
                >
                  {query.data.totalRecords.toLocaleString()}
                </span>
              </h2>
              <span className='text-xs text-muted-foreground'>Latest submitted applications</span>
            </div>
            {!query.data.listObjects.length ? (
              <div className='space-y-3 p-10 text-center text-sm text-muted-foreground'>
                <Inbox className='mx-auto size-9 text-muted-foreground/40' aria-hidden='true' />
                <p>No submitted applications match these filters.</p>
                {filters.page > 1 && (
                  <Button className='mt-3' variant='outline' onClick={() => onChange({ page: 1 })}>
                    Return to first page
                  </Button>
                )}
              </div>
            ) : (
              <div className='min-w-0'>
                <Table className='text-xs [&_td]:px-5 [&_td]:py-5 [&_th]:px-5 [&_th]:py-3'>
                  <TableHeader className='bg-muted/30 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted-foreground'>
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
                      <TableRow
                        key={application.id}
                        className='transition-colors hover:bg-primary/[0.025]'
                      >
                        <TableCell className='font-mono text-muted-foreground'>
                          #{application.id}
                        </TableCell>
                        <TableCell>
                          <p className='max-w-64 whitespace-normal break-words font-medium'>
                            {application.legalName || 'Not provided'}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {businessTypes.label(application.businessType)}
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
                            className={`gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${application.status === 'PENDING_REVIEW' ? 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300' : application.status === 'CONTRACT_PENDING' ? 'border-primary/20 bg-primary/10 text-primary' : application.status === 'APPROVED' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : application.status === 'REVISION_REQUESTED' ? 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'border-destructive/20 bg-destructive/10 text-destructive'}`}
                            variant={
                              application.status === 'REJECTED'
                                ? 'destructive'
                                : application.status === 'APPROVED'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            <span className='size-1.5 rounded-full bg-current' aria-hidden='true' />
                            {applicationStatusPresentation(application.status).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <time dateTime={application.reviewedAt || undefined}>
                            {applicationTimestamp(application.reviewedAt)}
                          </time>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant='outline'
                            size='sm'
                            className='rounded-full border-primary/20 text-xs text-primary shadow-none hover:bg-primary/5'
                            asChild
                          >
                            <Link
                              to='/dashboard/admin/organizers/$applicationId'
                              params={{ applicationId: String(application.id) }}
                              search={{ ...filters, appId: undefined }}
                              aria-label={`View application #${application.id}`}
                            >
                              View details
                              <ArrowUpRight className='size-3.5' aria-hidden='true' />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <ApplicationsPagination
              data={query.data}
              loading={query.isFetching}
              pageSize={filters.size}
              onPageChange={(page) => onChange({ page })}
              onSizeChange={(size) => onChange({ size })}
            />
          </div>
        </>
      )}
    </div>
  );
}
