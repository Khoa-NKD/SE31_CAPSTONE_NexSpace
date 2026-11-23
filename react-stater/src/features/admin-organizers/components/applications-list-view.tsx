import { useState } from 'react';
import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useLanguage } from '@/features/landing/context/language-context';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
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
  RotateCcw,
  RefreshCw,
  Building2,
  ArrowUpRight,
  Inbox,
  Clock,
  AlertCircle,
  FileText,
  X
} from '@/components/ui/hugeicons';

const emptySubscribe = () => () => {};

export function ApplicationsListView({
  filters,
  onChange
}: {
  filters: AdminApplicationFilters;
  onChange: (patch: Partial<AdminApplicationFilters>) => void;
}) {
  const { language } = useLanguage();
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

  const [searchValue, setSearchValue] = useState(filters.search || '');

  if (!mounted) {
    return (
      <div className='flex items-center justify-center p-12 text-xs text-muted-foreground'>
        <Spinner className='mr-2 size-4' />
        {language === 'vi' ? 'Đang tải dữ liệu hồ sơ...' : 'Loading applications…'}
      </div>
    );
  }

  if (!allowed) {
    return (
      <div role='alert' className='rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive'>
        {language === 'vi'
          ? 'Quyền Quản trị viên (ADMIN) là bắt buộc để xem hàng đợi hồ sơ đối tác.'
          : 'Administrator access is required to view organizer applications.'}
      </div>
    );
  }

  const currentSortKey = `${filters.sortBy}:${filters.sortDir}`;

  const handleSortChange = (combinedKey: string) => {
    const [sortBy, sortDir] = combinedKey.split(':') as [
      AdminApplicationFilters['sortBy'],
      AdminApplicationFilters['sortDir']
    ];
    onChange({ sortBy, sortDir, page: 1 });
  };

  const isFiltered =
    Boolean(filters.search) ||
    filters.status !== 'all' ||
    filters.sortBy !== 'submittedAt' ||
    filters.sortDir !== 'desc';

  const STATUS_TABS: Array<{
    id: AdminApplicationFilters['status'];
    labelVi: string;
    labelEn: string;
    dotColor?: string;
  }> = [
    { id: 'all', labelVi: 'Tất cả', labelEn: 'All' },
    { id: 'PENDING_REVIEW', labelVi: 'Chờ xét duyệt', labelEn: 'Pending Review', dotColor: 'bg-amber-500' },
    { id: 'CONTRACT_PENDING', labelVi: 'Chờ ký HĐ', labelEn: 'Awaiting Agreement', dotColor: 'bg-blue-500' },
    { id: 'APPROVED', labelVi: 'Đã duyệt', labelEn: 'Approved', dotColor: 'bg-emerald-500' },
    { id: 'REVISION_REQUESTED', labelVi: 'Cần bổ sung', labelEn: 'Changes Requested', dotColor: 'bg-indigo-500' },
    { id: 'REJECTED', labelVi: 'Đã từ chối', labelEn: 'Rejected', dotColor: 'bg-rose-500' }
  ];

  return (
    <div className='min-w-0 space-y-4'>
      {/* ── 1. Status Filter Pills (Segmented Tabs) ── */}
      <div className='flex flex-wrap items-center gap-1.5 rounded-xl border bg-card/60 p-1.5 shadow-2xs backdrop-blur-xs'>
        {STATUS_TABS.map((tab) => {
          const isActive = filters.status === tab.id;
          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => onChange({ status: tab.id, page: 1 })}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              {tab.dotColor && (
                <span
                  className={`size-1.5 rounded-full ${isActive ? 'bg-primary-foreground' : tab.dotColor}`}
                  aria-hidden='true'
                />
              )}
              <span>{language === 'vi' ? tab.labelVi : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* ── 2. Compact Search & Controls Toolbar ── */}
      <div className='flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between'>
        {/* Search Input */}
        <form
          className='relative w-full sm:max-w-xs md:max-w-sm'
          onSubmit={(e) => {
            e.preventDefault();
            onChange({ search: searchValue.trim(), page: 1 });
          }}
        >
          <Search
            className='pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground/60'
            aria-hidden='true'
          />
          <Input
            id='application-search'
            name='search'
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            maxLength={255}
            placeholder={
              language === 'vi'
                ? 'Tìm theo tên DN, người nộp, email...'
                : 'Search business, applicant, email...'
            }
            className='h-9 rounded-lg bg-card pl-8.5 pr-8 text-xs shadow-2xs transition-all focus-visible:ring-1'
          />
          {searchValue && (
            <button
              type='button'
              onClick={() => {
                setSearchValue('');
                onChange({ search: '', page: 1 });
              }}
              className='absolute top-2.5 right-2.5 text-muted-foreground/60 hover:text-foreground'
              aria-label={language === 'vi' ? 'Xoá tìm kiếm' : 'Clear search'}
            >
              <X className='size-3.5' />
            </button>
          )}
        </form>

        {/* Sort & Actions */}
        <div className='flex flex-wrap items-center gap-2'>
          {/* Quick Sort Select */}
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <span>{language === 'vi' ? 'Sắp xếp:' : 'Sort:'}</span>
            <select
              value={currentSortKey}
              onChange={(e) => handleSortChange(e.target.value)}
              className='h-8.5 rounded-lg border border-input bg-card px-2.5 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring'
            >
              <option value='submittedAt:desc'>
                {language === 'vi' ? 'Mới nộp nhất' : 'Newest submission'}
              </option>
              <option value='submittedAt:asc'>
                {language === 'vi' ? 'Cũ nhất' : 'Oldest submission'}
              </option>
              <option value='legalName:asc'>
                {language === 'vi' ? 'Tên DN (A → Z)' : 'Business name (A-Z)'}
              </option>
              <option value='legalName:desc'>
                {language === 'vi' ? 'Tên DN (Z → A)' : 'Business name (Z-A)'}
              </option>
              <option value='status:asc'>
                {language === 'vi' ? 'Theo trạng thái' : 'By status'}
              </option>
              <option value='id:desc'>
                {language === 'vi' ? 'Mã hồ sơ giảm dần' : 'Application ID (desc)'}
              </option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-8.5 gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground'
              onClick={() => {
                setSearchValue('');
                onChange({
                  search: '',
                  status: 'all',
                  size: 20,
                  sortBy: 'submittedAt',
                  sortDir: 'desc',
                  page: 1
                });
              }}
            >
              <RotateCcw className='size-3.5' aria-hidden='true' />
              <span>{language === 'vi' ? 'Đặt lại' : 'Reset'}</span>
            </Button>
          )}

          {/* Refresh Button */}
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={query.isFetching}
            className='h-8.5 gap-1.5 rounded-lg border-border/80 bg-card px-2.5 text-xs shadow-2xs hover:bg-muted/50'
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? (
              <Spinner className='size-3.5' aria-hidden='true' />
            ) : (
              <RefreshCw className='size-3.5' aria-hidden='true' />
            )}
            <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* ── 3. Table Container ── */}
      {query.isPending ? (
        <div className='flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-xs text-muted-foreground'>
          <Spinner className='mb-2 size-5 text-primary' />
          {language === 'vi' ? 'Đang tải danh sách hồ sơ...' : 'Loading applications…'}
        </div>
      ) : query.isError ? (
        <div role='alert' className='space-y-3 rounded-xl border border-destructive/20 bg-destructive/10 p-5 text-xs text-destructive'>
          <div className='flex items-center gap-2 font-semibold'>
            <AlertCircle className='size-4' />
            <span>
              {language === 'vi' ? 'Không thể tải danh sách hồ sơ' : 'Could not load organizer applications.'}
            </span>
          </div>
          <p className='text-muted-foreground'>{query.error.message}</p>
          {!(query.error instanceof ApiError && [401, 403].includes(query.error.status)) && (
            <Button size='sm' variant='outline' onClick={() => void query.refetch()}>
              {language === 'vi' ? 'Thử lại' : 'Try again'}
            </Button>
          )}
        </div>
      ) : (
        <div className='overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs'>
          {/* Card Table Sub-Header */}
          <div className='flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-2.5'>
            <div className='flex items-center gap-2'>
              <Building2 className='size-4 text-primary' aria-hidden='true' />
              <h2 className='text-xs font-semibold text-foreground'>
                {language === 'vi' ? 'Danh sách hồ sơ đối tác' : 'Organizer Applications'}
              </h2>
              <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary'>
                {query.data.totalRecords.toLocaleString()} {language === 'vi' ? 'hồ sơ' : 'records'}
              </span>
            </div>
            <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
              <Clock className='size-3 text-amber-500' aria-hidden='true' />
              <span>
                {language === 'vi'
                  ? 'Mục tiêu SLA: Xử lý hồ sơ trong vòng 24h'
                  : 'SLA Target: Process within 24h'}
              </span>
            </div>
          </div>

          {/* Table Data or Empty State */}
          {!query.data.listObjects.length ? (
            <div className='space-y-2.5 p-12 text-center text-xs text-muted-foreground'>
              <Inbox className='mx-auto size-8 text-muted-foreground/30' aria-hidden='true' />
              <p className='font-medium text-foreground'>
                {language === 'vi' ? 'Không tìm thấy hồ sơ phù hợp' : 'No submitted applications found'}
              </p>
              <p className='text-[11px] text-muted-foreground'>
                {language === 'vi'
                  ? 'Thử thay đổi từ khoá tìm kiếm hoặc chuyển sang bộ lọc trạng thái khác.'
                  : 'Try adjusting your search criteria or switching to a different status filter.'}
              </p>
              {isFiltered && (
                <Button
                  size='sm'
                  variant='outline'
                  className='mt-2 h-7.5 text-xs'
                  onClick={() => {
                    setSearchValue('');
                    onChange({
                      search: '',
                      status: 'all',
                      size: 20,
                      sortBy: 'submittedAt',
                      sortDir: 'desc',
                      page: 1
                    });
                  }}
                >
                  <RotateCcw className='mr-1.5 size-3' />
                  {language === 'vi' ? 'Xoá tất cả bộ lọc' : 'Clear all filters'}
                </Button>
              )}
            </div>
          ) : (
            <div className='min-w-0 overflow-x-auto'>
              <Table className='text-xs min-w-[950px]'>
                <TableHeader className='bg-muted/40'>
                  <TableRow className='hover:bg-transparent [&_th]:h-9 [&_th]:px-4 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:text-muted-foreground'>
                    <TableHead className='w-16'>{language === 'vi' ? 'Mã đơn' : 'ID'}</TableHead>
                    <TableHead className='min-w-[220px]'>{language === 'vi' ? 'Doanh nghiệp / Pháp nhân' : 'Business Legal Name'}</TableHead>
                    <TableHead className='min-w-[190px]'>{language === 'vi' ? 'Người nộp đơn' : 'Applicant'}</TableHead>
                    <TableHead className='w-36'>{language === 'vi' ? 'Thời gian nộp' : 'Submitted'}</TableHead>
                    <TableHead className='w-36'>{language === 'vi' ? 'Trạng thái' : 'Status'}</TableHead>
                    <TableHead className='w-32'>{language === 'vi' ? 'Thời gian duyệt' : 'Reviewed'}</TableHead>
                    <TableHead className='w-28 min-w-[110px] text-right sticky right-0 z-20 bg-muted/95 backdrop-blur-xs border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>{language === 'vi' ? 'Thao tác' : 'Action'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className='divide-y divide-border/50'>
                  {query.data.listObjects.map((application) => {
                    const isPending = application.status === 'PENDING_REVIEW';
                    const isApproved = application.status === 'APPROVED';
                    const isContractPending = application.status === 'CONTRACT_PENDING';
                    const isRevision = application.status === 'REVISION_REQUESTED';

                    return (
                      <TableRow
                        key={application.id}
                        className='group transition-colors hover:bg-muted/30'
                      >
                        {/* ID Column */}
                        <TableCell className='py-3 px-4 font-mono text-[11px] font-semibold text-muted-foreground'>
                          <span className='rounded bg-muted/60 px-1.5 py-0.5'>
                            #{application.id}
                          </span>
                        </TableCell>

                        {/* Business Column */}
                        <TableCell className='py-3 px-4'>
                          <p className='font-semibold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1'>
                            {application.legalName || (language === 'vi' ? 'Chưa cập nhật' : 'Not provided')}
                          </p>
                          <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5'>
                            <FileText className='size-3 text-muted-foreground/60 shrink-0' />
                            <span className='truncate'>
                              {businessTypes.label(application.businessType) || (language === 'vi' ? 'Doanh nghiệp' : 'Enterprise')}
                            </span>
                          </div>
                        </TableCell>

                        {/* Applicant Column */}
                        <TableCell className='py-3 px-4'>
                          <p className='font-medium text-xs text-foreground'>
                            {application.applicantUserName}
                          </p>
                          <p className='text-[11px] text-muted-foreground truncate max-w-[180px]'>
                            {application.applicantEmail}
                          </p>
                        </TableCell>

                        {/* Submitted At */}
                        <TableCell className='py-3 px-4 text-[11px] text-muted-foreground tabular-nums'>
                          {applicationTimestamp(application.submittedAt)}
                        </TableCell>

                        {/* Status Column */}
                        <TableCell className='py-3 px-4'>
                          <Badge
                            variant='outline'
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-all ${
                              isPending
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : isApproved
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : isContractPending
                                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : isRevision
                                      ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                      : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                isPending
                                  ? 'bg-amber-500 animate-pulse'
                                  : isApproved
                                    ? 'bg-emerald-500'
                                    : isContractPending
                                      ? 'bg-blue-500'
                                      : isRevision
                                        ? 'bg-indigo-500'
                                        : 'bg-rose-500'
                              }`}
                              aria-hidden='true'
                            />
                            <span>
                              {language === 'vi'
                                ? isPending
                                  ? 'Chờ xét duyệt'
                                  : isApproved
                                    ? 'Đã duyệt'
                                    : isContractPending
                                      ? 'Chờ ký HĐ'
                                      : isRevision
                                        ? 'Yêu cầu sửa'
                                        : 'Đã từ chối'
                                : applicationStatusPresentation(application.status).label}
                            </span>
                          </Badge>
                        </TableCell>

                        {/* Reviewed At */}
                        <TableCell className='py-3 px-4 text-[11px] text-muted-foreground tabular-nums'>
                          {application.reviewedAt ? (
                            applicationTimestamp(application.reviewedAt)
                          ) : (
                            <span className='italic text-muted-foreground/50'>
                              {language === 'vi' ? 'Chưa xét duyệt' : 'Not reviewed'}
                            </span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className='py-3 px-4 min-w-[110px] text-right sticky right-0 z-10 bg-card group-hover:bg-muted/50 transition-colors border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
                          <Button
                            variant={isPending ? 'default' : 'outline'}
                            size='sm'
                            className={`h-7.5 rounded-lg px-2.5 text-xs shadow-none gap-1 ${
                              isPending
                                ? 'bg-amber-600 hover:bg-amber-700 text-white font-medium'
                                : 'text-primary border-primary/25 hover:bg-primary/5 hover:text-primary'
                            }`}
                            asChild
                          >
                            <Link
                              to='/dashboard/admin/organizers/$applicationId'
                              params={{ applicationId: String(application.id) }}
                              search={{ ...filters, appId: undefined }}
                              aria-label={`View application #${application.id}`}
                            >
                              <span>
                                {language === 'vi'
                                  ? isPending
                                    ? 'Xét duyệt'
                                    : 'Chi tiết'
                                  : isPending
                                    ? 'Review'
                                    : 'Details'}
                              </span>
                              <ArrowUpRight className='size-3' aria-hidden='true' />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          <ApplicationsPagination
            data={query.data}
            loading={query.isFetching}
            pageSize={filters.size}
            onPageChange={(page) => onChange({ page })}
            onSizeChange={(size) => onChange({ size })}
          />
        </div>
      )}
    </div>
  );
}
