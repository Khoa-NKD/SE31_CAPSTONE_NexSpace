import { Spinner as Loader2 } from '@/components/ui/spinner';
import { useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CircleAlert,
  Mail,
  PauseCircle,
  PlayCircle,
  Search,
  ShieldCheck,
  X,
  RotateCcw,
  RefreshCw
} from '@/components/ui/hugeicons';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import PageContainer from '@/components/layout/page-container';
import { useLanguage } from '@/features/landing/context/language-context';
import { backendRequest } from '@/features/auth/api/session';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { validApplicationId } from '@/features/admin-organizers/api/application-details';
import {
  organizerPartnersEndpoint,
  organizerOperationalStatusKey,
  type OrganizerPartner,
  type OrganizerPartnerDetail,
  type OrganizerPartnerPage
} from '@/features/admin-organizers/api/partners';

const path = '/dashboard/admin/organizer-partners';

export const Route = createFileRoute('/dashboard/admin/organizer-partners')({
  validateSearch: (search: Record<string, unknown>): { organizerId?: string } => {
    const organizerId = String(search.organizerId ?? '');
    return validApplicationId(organizerId) ? { organizerId } : {};
  },
  head: () => ({
    meta: [
      { title: 'Quản lý đối tác | NexSpace Admin Console' },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: OrganizerPartners
});

function getInitials(name?: string | null): string {
  if (!name) return 'DN';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DN';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function OrganizerPartners() {
  const { organizerId } = Route.useSearch();
  const actor = useAuthStore((state) => state.user);
  const { language } = useLanguage();

  const allowed = actor?.role === 'ADMIN';

  return (
    <PageContainer
      pageTitle={language === 'vi' ? 'Quản lý đối tác' : 'Organizer Partners'}
      pageDescription={
        language === 'vi'
          ? 'Theo dõi quyền hoạt động, trạng thái vận hành và quản lý đối tác không gian đã được phê duyệt.'
          : 'Monitor operational status and manage approved workspace partners across the platform.'
      }
    >
      {!actor ? (
        <div className='flex items-center justify-center p-12 text-xs text-muted-foreground'>
          <Loader2 className='mr-2 size-4' />
          {language === 'vi' ? 'Đang tải thông tin xác thực...' : 'Loading credentials…'}
        </div>
      ) : !allowed ? (
        <div
          role='alert'
          className='rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive'
        >
          {language === 'vi'
            ? 'Quyền Quản trị viên (ADMIN) là bắt buộc để quản lý đối tác vận hành.'
            : 'Administrator access is required to manage partner operations.'}
        </div>
      ) : organizerId ? (
        <PartnerDetail key={organizerId} actorId={actor.id} id={organizerId} />
      ) : (
        <PartnerDirectory actorId={actor.id} />
      )}
    </PageContainer>
  );
}

function PartnerBadge({
  suspended,
  language
}: {
  suspended: boolean;
  language: 'vi' | 'en';
}) {
  return (
    <Badge
      variant='outline'
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
        suspended
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${suspended ? 'bg-amber-500' : 'bg-emerald-500'}`}
        aria-hidden='true'
      />
      <span>
        {suspended
          ? language === 'vi'
            ? 'Tạm ngưng'
            : 'Suspended'
          : language === 'vi'
            ? 'Đang hoạt động'
            : 'Active'}
      </span>
    </Badge>
  );
}

function PartnerDirectory({ actorId }: { actorId: number }) {
  const { language } = useLanguage();
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'false' | 'true'>('all');
  const [page, setPage] = useState(1);

  const partners = useQuery({
    queryKey: ['organizer-partners', actorId, 'list', page, search, status],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ page: String(page), search });
      if (status !== 'all') {
        params.set('suspended', status);
      }
      return backendRequest<OrganizerPartnerPage>(
        `${organizerPartnersEndpoint}?${params}`,
        'GET',
        undefined,
        true,
        signal
      );
    },
    retry: false
  });

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(keyword.trim());
    setPage(1);
  }

  function handleResetFilters() {
    setKeyword('');
    setSearch('');
    setStatus('all');
    setPage(1);
  }

  const isFiltered = Boolean(search) || status !== 'all';

  const STATUS_TABS: Array<{
    id: 'all' | 'false' | 'true';
    labelVi: string;
    labelEn: string;
    dotColor?: string;
  }> = [
    { id: 'all', labelVi: 'Tất cả', labelEn: 'All' },
    {
      id: 'false',
      labelVi: 'Đang hoạt động',
      labelEn: 'Active',
      dotColor: 'bg-emerald-500'
    },
    {
      id: 'true',
      labelVi: 'Tạm ngưng',
      labelEn: 'Suspended',
      dotColor: 'bg-amber-500'
    }
  ];

  return (
    <div className='min-w-0 space-y-4'>
      {/* ── 1. Status Filter Pills (Segmented Tabs) ── */}
      <div className='flex flex-wrap items-center gap-1.5 rounded-xl border bg-card/60 p-1.5 shadow-2xs backdrop-blur-xs'>
        {STATUS_TABS.map((tab) => {
          const isActive = status === tab.id;
          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => {
                setStatus(tab.id);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              {tab.dotColor && (
                <span
                  className={`size-1.5 rounded-full ${
                    isActive ? 'bg-primary-foreground' : tab.dotColor
                  }`}
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
          onSubmit={submitSearch}
          className='relative w-full sm:max-w-xs md:max-w-sm'
        >
          <Search
            className='pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground/60'
            aria-hidden='true'
          />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            maxLength={255}
            placeholder={
              language === 'vi'
                ? 'Tìm theo tên DN, tài khoản, email...'
                : 'Search business, username, email...'
            }
            className='h-9 rounded-lg bg-card pl-8.5 pr-8 text-xs shadow-2xs transition-all focus-visible:ring-1'
          />
          {(keyword || search) && (
            <button
              type='button'
              onClick={() => {
                setKeyword('');
                setSearch('');
                setPage(1);
              }}
              className='absolute top-2.5 right-2.5 text-muted-foreground/60 hover:text-foreground'
              aria-label={language === 'vi' ? 'Xóa từ khóa' : 'Clear search'}
            >
              <X className='size-3.5' />
            </button>
          )}
        </form>

        {/* Action Controls & Total Count */}
        <div className='flex flex-wrap items-center gap-2'>
          {partners.data && (
            <Badge
              variant='secondary'
              className='h-8 rounded-lg px-2.5 text-xs font-normal text-muted-foreground'
            >
              {language === 'vi'
                ? `${partners.data.totalRecords} đối tác`
                : `${partners.data.totalRecords} partners`}
            </Badge>
          )}

          {isFiltered && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-8 gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground'
              onClick={handleResetFilters}
            >
              <RotateCcw className='size-3.5' aria-hidden='true' />
              <span>{language === 'vi' ? 'Đặt lại' : 'Reset'}</span>
            </Button>
          )}

          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={partners.isFetching}
            className='h-8 gap-1 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground'
            onClick={() => void partners.refetch()}
            aria-label={language === 'vi' ? 'Làm mới' : 'Refresh'}
          >
            <RefreshCw
              className={`size-3.5 ${partners.isFetching ? 'animate-spin' : ''}`}
              aria-hidden='true'
            />
            <span className='hidden sm:inline'>
              {language === 'vi' ? 'Làm mới' : 'Refresh'}
            </span>
          </Button>
        </div>
      </div>

      {/* ── 3. High-Density Structured Table ── */}
      <div className='overflow-hidden rounded-xl border bg-card shadow-2xs'>
        {partners.isPending ? (
          <div className='flex items-center justify-center p-12 text-xs text-muted-foreground'>
            <Loader2 className='mr-2 size-4' />
            {language === 'vi'
              ? 'Đang tải danh sách đối tác...'
              : 'Loading partners list…'}
          </div>
        ) : partners.isError ? (
          <div
            role='alert'
            className='flex flex-wrap items-center justify-between gap-3 p-5 text-xs text-destructive'
          >
            <span>{partners.error.message}</span>
            <Button
              variant='outline'
              size='sm'
              className='h-7 rounded-lg text-xs'
              onClick={() => void partners.refetch()}
            >
              {language === 'vi' ? 'Thử lại' : 'Retry'}
            </Button>
          </div>
        ) : partners.data && partners.data.listObjects.length === 0 ? (
          <div className='grid justify-items-center gap-2 p-12 text-center'>
            <div className='grid size-12 place-items-center rounded-2xl bg-muted/50 text-muted-foreground'>
              <Building2 className='size-6' aria-hidden='true' />
            </div>
            <p className='text-sm font-semibold text-foreground'>
              {language === 'vi'
                ? 'Không tìm thấy đối tác phù hợp'
                : 'No partners found'}
            </p>
            <p className='max-w-sm text-xs text-muted-foreground'>
              {language === 'vi'
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc trạng thái.'
                : 'Try adjusting your search query or reset the active status filters.'}
            </p>
            {isFiltered && (
              <Button
                variant='outline'
                size='sm'
                className='mt-2 h-8 rounded-lg text-xs'
                onClick={handleResetFilters}
              >
                <RotateCcw className='mr-1.5 size-3.5' />
                {language === 'vi' ? 'Xóa bộ lọc' : 'Clear filters'}
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table className='min-w-[800px]'>
              <TableHeader>
                <TableRow className='bg-muted/40 hover:bg-muted/40'>
                  <TableHead className='w-[100px] text-xs font-semibold'>
                    {language === 'vi' ? 'Mã ĐT' : 'Partner ID'}
                  </TableHead>
                  <TableHead className='min-w-[240px] text-xs font-semibold'>
                    {language === 'vi' ? 'Doanh nghiệp đối tác' : 'Partner Business'}
                  </TableHead>
                  <TableHead className='min-w-[200px] text-xs font-semibold'>
                    {language === 'vi' ? 'Liên hệ & Email' : 'Contact & Email'}
                  </TableHead>
                  <TableHead className='w-[150px] text-xs font-semibold'>
                    {language === 'vi' ? 'Trạng thái vận hành' : 'Status'}
                  </TableHead>
                  <TableHead className='w-[120px] min-w-[120px] text-right text-xs font-semibold sticky right-0 z-20 bg-muted/95 backdrop-blur-xs border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
                    {language === 'vi' ? 'Thao tác' : 'Action'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.data?.listObjects.map((partner: OrganizerPartner) => (
                  <TableRow
                    key={partner.organizerId}
                    className='group transition-colors hover:bg-muted/40'
                  >
                    {/* Partner ID */}
                    <TableCell className='py-3 font-mono text-xs font-medium'>
                      <div className='flex flex-col gap-0.5'>
                        <span className='font-semibold text-foreground'>
                          #{partner.organizerId}
                        </span>
                        <span className='text-[10px] text-muted-foreground'>
                          HS #{partner.applicationId}
                        </span>
                      </div>
                    </TableCell>

                    {/* Partner Business Name & Account */}
                    <TableCell className='py-3'>
                      <div className='flex items-center gap-3'>
                        <span className='grid size-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-xs font-bold text-primary'>
                          {getInitials(partner.legalName || partner.username)}
                        </span>
                        <div className='min-w-0 max-w-[320px]'>
                          <span className='block truncate text-xs font-semibold text-foreground'>
                            {partner.legalName || partner.username}
                          </span>
                          <span className='block truncate text-[11px] text-muted-foreground'>
                            @{partner.username}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Email / Contact */}
                    <TableCell className='py-3'>
                      <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                        <Mail
                          className='size-3.5 shrink-0 text-muted-foreground/60'
                          aria-hidden='true'
                        />
                        <span className='max-w-[220px] truncate'>
                          {partner.email}
                        </span>
                      </div>
                    </TableCell>

                    {/* Operational Status */}
                    <TableCell className='py-3'>
                      <PartnerBadge
                        suspended={partner.suspended}
                        language={language}
                      />
                    </TableCell>

                    {/* Action */}
                    <TableCell className='py-3 w-[120px] min-w-[120px] text-right sticky right-0 z-10 bg-card group-hover:bg-muted/50 transition-colors border-l border-border after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-border shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_16px_-2px_rgba(0,0,0,0.45)]'>
                      <Button
                        asChild
                        variant='outline'
                        size='sm'
                        className='h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                      >
                        <Link
                          to={path}
                          search={{ organizerId: String(partner.organizerId) }}
                        >
                          <span>{language === 'vi' ? 'Quản lý' : 'Manage'}</span>
                          <ArrowUpRight className='size-3.5' aria-hidden='true' />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {partners.data && partners.data.totalPages > 1 && (
              <div className='flex flex-wrap items-center justify-between gap-3 border-t bg-card/60 px-4 py-3 sm:px-6'>
                <span className='text-xs text-muted-foreground'>
                  {language === 'vi'
                    ? `Trang ${page} / ${partners.data.totalPages} (${partners.data.totalRecords} đối tác)`
                    : `Page ${page} of ${partners.data.totalPages} (${partners.data.totalRecords} partners)`}
                </span>
                <div className='flex items-center gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={!partners.data.hasPrevious}
                    onClick={() => setPage(page - 1)}
                    className='h-8 rounded-lg px-3 text-xs'
                  >
                    {language === 'vi' ? 'Trước' : 'Previous'}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={!partners.data.hasNext}
                    onClick={() => setPage(page + 1)}
                    className='h-8 rounded-lg px-3 text-xs'
                  >
                    {language === 'vi' ? 'Tiếp' : 'Next'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PartnerDetail({ actorId, id }: { actorId: number; id: string }) {
  const { language } = useLanguage();
  const client = useQueryClient();
  const [confirmation, setConfirmation] = useState<OrganizerPartnerDetail>();
  const [reason, setReason] = useState('');

  const key = ['organizer-partners', actorId, 'detail', id] as const;
  const endpoint = `${organizerPartnersEndpoint}/${id}`;

  const detail = useQuery({
    queryKey: key,
    queryFn: ({ signal }) =>
      backendRequest<OrganizerPartnerDetail>(endpoint, 'GET', undefined, true, signal),
    retry: false
  });

  const change = useMutation({
    mutationFn: (target: OrganizerPartnerDetail) =>
      backendRequest<OrganizerPartnerDetail>(
        `${endpoint}/${target.partner.suspended ? 'restore' : 'suspend'}`,
        'POST',
        { revision: target.revision, reason: reason.trim() }
      ),
    onSuccess: (result) => {
      client.setQueryData(key, result);
      void client.invalidateQueries({
        queryKey: ['organizer-partners', actorId, 'list']
      });
      void client.invalidateQueries({
        queryKey: organizerOperationalStatusKey(result.partner.organizerId)
      });
      setConfirmation(undefined);
      toast.success(
        result.partner.suspended
          ? language === 'vi'
            ? 'Đã tạm ngưng đối tác thành công'
            : 'Partner suspended successfully'
          : language === 'vi'
            ? 'Đã khôi phục hoạt động đối tác thành công'
            : 'Partner restored successfully'
      );
    },
    onError: () => {
      void detail.refetch();
    }
  });

  const data = detail.data;
  const suspended = data?.partner.suspended ?? false;

  return (
    <div className='space-y-4'>
      {/* ── Top Back Button ── */}
      <div>
        <Button
          asChild
          variant='ghost'
          size='sm'
          className='-ml-2 h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground'
        >
          <Link to={path} search={{}}>
            <ArrowLeft className='size-3.5' />
            <span>
              {language === 'vi'
                ? 'Quay lại danh sách đối tác'
                : 'Back to partner directory'}
            </span>
          </Link>
        </Button>
      </div>

      {detail.isPending && (
        <div className='flex items-center gap-2 rounded-xl border bg-card p-6 text-xs text-muted-foreground shadow-2xs'>
          <Loader2 className='size-4' />
          {language === 'vi'
            ? 'Đang tải thông tin chi tiết đối tác…'
            : 'Loading partner details…'}
        </div>
      )}

      {detail.isError && (
        <div
          role='alert'
          className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive'
        >
          <span>{detail.error.message}</span>
          <Button
            variant='outline'
            size='sm'
            className='h-7 rounded-lg text-xs'
            onClick={() => void detail.refetch()}
          >
            {language === 'vi' ? 'Tải lại' : 'Retry'}
          </Button>
        </div>
      )}

      {data && (
        <>
          {/* ── Partner Profile Hero Card ── */}
          <Card className='rounded-xl border bg-card shadow-2xs'>
            <CardHeader className='flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex min-w-0 items-center gap-3.5'>
                <span className='grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-base font-bold text-primary'>
                  {getInitials(data.partner.legalName || data.partner.username)}
                </span>
                <div className='min-w-0 space-y-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <CardTitle className='truncate text-base font-semibold sm:text-lg'>
                      {data.partner.legalName || data.partner.username}
                    </CardTitle>
                    <PartnerBadge suspended={suspended} language={language} />
                  </div>
                  <div className='flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
                    <span className='font-mono'>
                      @{data.partner.username}
                    </span>
                    <span>•</span>
                    <span className='flex items-center gap-1.5'>
                      <Mail className='size-3.5 text-muted-foreground/60' />
                      {data.partner.email}
                    </span>
                    <span>•</span>
                    <span className='font-mono text-[11px]'>
                      Mã ĐT: #{data.partner.organizerId} (HS #{data.partner.applicationId})
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className='flex shrink-0 items-center gap-2'>
                <Button
                  variant={suspended ? 'default' : 'outline'}
                  size='sm'
                  className={`h-9 gap-1.5 rounded-lg px-3.5 text-xs font-medium transition-all ${
                    suspended
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300'
                  }`}
                  onClick={() => {
                    change.reset();
                    setReason('');
                    setConfirmation(data);
                  }}
                >
                  {suspended ? (
                    <PlayCircle className='size-4' />
                  ) : (
                    <PauseCircle className='size-4' />
                  )}
                  <span>
                    {suspended
                      ? language === 'vi'
                        ? 'Khôi phục hoạt động'
                        : 'Restore partner'
                      : language === 'vi'
                        ? 'Tạm ngưng đối tác'
                        : 'Suspend partner'}
                  </span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className='space-y-4 p-5'>
              {/* Suspension Reason Warning Banner */}
              {data.reason && (
                <div className='flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200'>
                  <CircleAlert
                    className='mt-0.5 size-4.5 shrink-0 text-amber-600 dark:text-amber-400'
                    aria-hidden='true'
                  />
                  <div className='min-w-0 space-y-1'>
                    <strong className='block font-semibold'>
                      {language === 'vi'
                        ? 'Lý do tạm ngưng vận hành đối tác'
                        : 'Operational suspension reason'}
                    </strong>
                    <p className='whitespace-pre-wrap leading-relaxed'>
                      {data.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Impact Metric Tiles */}
              <Impact detail={data} language={language} />
            </CardContent>
          </Card>

          {/* ── Partner Workspaces Card ── */}
          <Card className='overflow-hidden rounded-xl border bg-card shadow-2xs'>
            <CardHeader className='border-b p-4 sm:p-5'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <CardTitle className='text-sm font-semibold'>
                    {language === 'vi'
                      ? 'Danh sách không gian làm việc'
                      : 'Managed Workspaces'}
                  </CardTitle>
                  <CardDescription className='text-xs'>
                    {language === 'vi'
                      ? 'Các địa điểm không gian trực thuộc quyền quản lý của đối tác này.'
                      : 'Workspaces under the operational authority of this partner.'}
                  </CardDescription>
                </div>
                <Badge variant='secondary' className='h-6 rounded-md px-2 text-xs'>
                  {data.workspaces.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className='p-0'>
              {data.workspaces.length === 0 ? (
                <div className='p-8 text-center text-xs text-muted-foreground'>
                  {language === 'vi'
                    ? 'Đối tác hiện chưa đăng ký không gian làm việc nào.'
                    : 'This partner has not registered any workspaces yet.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className='bg-muted/40 hover:bg-muted/40'>
                      <TableHead className='w-[100px] text-xs font-semibold'>
                        ID
                      </TableHead>
                      <TableHead className='text-xs font-semibold'>
                        {language === 'vi' ? 'Tên không gian' : 'Workspace Name'}
                      </TableHead>
                      <TableHead className='w-[160px] text-right text-xs font-semibold'>
                        {language === 'vi' ? 'Trạng thái không gian' : 'Workspace Status'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.workspaces.map((workspace) => (
                      <TableRow key={workspace.id} className='hover:bg-muted/40'>
                        <TableCell className='py-2.5 font-mono text-xs font-medium text-muted-foreground'>
                          #{workspace.id}
                        </TableCell>
                        <TableCell className='py-2.5 font-medium text-xs text-foreground'>
                          <span className='truncate'>{workspace.name}</span>
                        </TableCell>
                        <TableCell className='py-2.5 text-right'>
                          <Badge
                            variant='outline'
                            className='rounded-md px-2 py-0.5 text-[11px] font-medium'
                          >
                            {workspace.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Suspend / Restore Confirmation Modal Dialog ── */}
      <Dialog
        open={confirmation != null}
        onOpenChange={(open) => {
          if (!open && !change.isPending) setConfirmation(undefined);
        }}
      >
        <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl sm:max-w-lg'>
          {confirmation && (
            <form
              className='space-y-4'
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  reason.trim() &&
                  !change.isPending &&
                  data?.revision === confirmation.revision
                ) {
                  change.mutate(confirmation);
                }
              }}
            >
              <DialogHeader>
                <div className='flex items-center gap-3'>
                  <span
                    className={`grid size-10 place-items-center rounded-xl ${
                      confirmation.partner.suspended
                        ? 'bg-primary/10 text-primary'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {confirmation.partner.suspended ? (
                      <ShieldCheck className='size-5' aria-hidden='true' />
                    ) : (
                      <PauseCircle className='size-5' aria-hidden='true' />
                    )}
                  </span>
                  <div>
                    <DialogTitle className='text-base font-semibold'>
                      {confirmation.partner.suspended
                        ? language === 'vi'
                          ? 'Xác nhận khôi phục hoạt động'
                          : 'Confirm Partner Restoration'
                        : language === 'vi'
                          ? 'Xác nhận tạm ngưng đối tác'
                          : 'Confirm Partner Suspension'}
                    </DialogTitle>
                    <DialogDescription className='mt-0.5 text-xs'>
                      {confirmation.partner.suspended
                        ? language === 'vi'
                          ? 'Đối tác sẽ được mở lại toàn quyền quản lý workspace và các chỗ đủ điều kiện sẽ nhận đặt mới.'
                          : 'Partner will regain workspace management rights and new bookings will be unblocked.'
                        : language === 'vi'
                          ? 'Đối tác vẫn có thể đăng nhập để xử lý booking hiện có. Hệ thống sẽ chặn giữ chỗ mới và khóa chỉnh sửa workspace.'
                          : 'Partner can still handle existing bookings. New reservations and workspace changes will be blocked.'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Compact impact check */}
              <div className='rounded-xl border bg-muted/30 p-3'>
                <Impact detail={confirmation} language={language} compact />
              </div>

              {/* Reason Input */}
              <div className='space-y-1.5'>
                <Label htmlFor='partner-reason' className='text-xs font-semibold'>
                  {language === 'vi' ? 'Lý do xử lý (bắt buộc)' : 'Action Reason (required)'}
                </Label>
                <Textarea
                  id='partner-reason'
                  className='min-h-20 rounded-lg text-xs'
                  placeholder={
                    language === 'vi'
                      ? 'Nhập lý do cụ thể để lưu vết hệ thống và thông báo cho đối tác...'
                      : 'Provide an audit reason for the operational log and partner notice...'
                  }
                  value={reason}
                  maxLength={500}
                  required
                  disabled={change.isPending}
                  onChange={(event) => setReason(event.target.value)}
                />
                <div className='flex items-center justify-between text-[11px] text-muted-foreground'>
                  <span>
                    {language === 'vi'
                      ? 'Nội dung sẽ được ghi vào nhật ký kiểm toán (Audit Log).'
                      : 'This note will be recorded in the immutable audit log.'}
                  </span>
                  <span className='tabular-nums'>{reason.length}/500</span>
                </div>
              </div>

              {change.isError && (
                <p role='alert' className='text-xs text-destructive'>
                  {change.error.message}
                </p>
              )}

              <DialogFooter className='gap-2 sm:gap-0'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-8 rounded-lg text-xs'
                  disabled={change.isPending}
                  onClick={() => setConfirmation(undefined)}
                >
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </Button>
                <Button
                  type='submit'
                  size='sm'
                  variant={confirmation.partner.suspended ? 'default' : 'destructive'}
                  className='h-8 rounded-lg text-xs'
                  disabled={
                    !reason.trim() ||
                    change.isPending ||
                    data?.revision !== confirmation.revision
                  }
                >
                  {change.isPending && <Loader2 className='mr-1.5 size-3.5' />}
                  <span>
                    {confirmation.partner.suspended
                      ? language === 'vi'
                        ? 'Xác nhận khôi phục'
                        : 'Confirm Restore'
                      : language === 'vi'
                        ? 'Xác nhận tạm ngưng'
                        : 'Confirm Suspension'}
                  </span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Impact({
  detail,
  language,
  compact = false
}: {
  detail: OrganizerPartnerDetail;
  language: 'vi' | 'en';
  compact?: boolean;
}) {
  const isSuspended = detail.partner.suspended;

  if (compact) {
    return (
      <div className='grid grid-cols-2 gap-3 text-xs'>
        <div className='flex items-center gap-2'>
          <Building2 className='size-4 text-primary shrink-0' />
          <div>
            <span className='text-muted-foreground block text-[10px]'>
              {language === 'vi' ? 'Không gian quản lý' : 'Workspaces'}
            </span>
            <span className='font-semibold text-foreground'>
              {detail.workspaces.length}
            </span>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <CalendarDays className='size-4 text-primary shrink-0' />
          <div>
            <span className='text-muted-foreground block text-[10px]'>
              {language === 'vi' ? 'Booking đang xử lý' : 'Active Bookings'}
            </span>
            <span className='font-semibold text-foreground'>
              {detail.upcomingBookings}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='grid gap-3 sm:grid-cols-3'>
      {/* Tile 1: Workspaces */}
      <div className='flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-2xs'>
        <span className='grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary'>
          <Building2 className='size-5' aria-hidden='true' />
        </span>
        <div className='min-w-0'>
          <span className='block text-xs text-muted-foreground'>
            {language === 'vi' ? 'Không gian làm việc' : 'Workspaces'}
          </span>
          <span className='text-lg font-bold tabular-nums text-foreground'>
            {detail.workspaces.length}
          </span>
        </div>
      </div>

      {/* Tile 2: Bookings */}
      <div className='flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-2xs'>
        <span className='grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'>
          <CalendarDays className='size-5' aria-hidden='true' />
        </span>
        <div className='min-w-0'>
          <span className='block text-xs text-muted-foreground'>
            {language === 'vi' ? 'Booking đang xử lý' : 'Active Bookings'}
          </span>
          <span className='text-lg font-bold tabular-nums text-foreground'>
            {detail.upcomingBookings}
          </span>
        </div>
      </div>

      {/* Tile 3: Operational Rights */}
      <div className='flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-2xs'>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${
            isSuspended
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          <ShieldCheck className='size-5' aria-hidden='true' />
        </span>
        <div className='min-w-0'>
          <span className='block text-xs text-muted-foreground'>
            {language === 'vi' ? 'Quyền nhận đặt chỗ' : 'Booking Acceptance'}
          </span>
          <span
            className={`text-xs font-semibold ${
              isSuspended
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {isSuspended
              ? language === 'vi'
                ? 'Bị tạm dừng'
                : 'Suspended'
              : language === 'vi'
                ? 'Bình thường'
                : 'Active'}
          </span>
        </div>
      </div>
    </div>
  );
}
