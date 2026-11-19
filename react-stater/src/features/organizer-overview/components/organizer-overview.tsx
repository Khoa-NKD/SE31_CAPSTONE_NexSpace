import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueries } from '@tanstack/react-query';
import {
  RefreshCw,
  ArrowUpRight,
  LayoutGrid,
  CalendarDays,
  Wallet,
  Clock,
  ImageIcon,
  Layers,
  Tags,
  CalendarOff,
  BarChart3,
  ArrowRight,
  UserRound,
  MapPin,
  Building2
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { Button } from '@/components/ui/button';
import {
  resourceWorkspacesOptions,
  resourceOptions
} from '@/features/organizer-resources/api/resources';
import { operationsApi } from '@/features/organizer-operations/api';
import { workspaceService } from '@/features/workspaces/api/service';
import { analyticsApi } from '@/features/organizer-analytics/api';
import { localDate, money, chartTrends } from '@/features/organizer-analytics/format';
import { AnalyticsCharts } from '@/features/organizer-analytics/components/report-charts';
import { formatDateLabel, formatDateTime } from '@/lib/format';
import { selectClass } from '@/features/organizer-operations/components/operations-shared';
import { scheduleStatus, scheduleTone } from '@/features/organizer-schedule/status';

export function OrganizerOverview() {
  const c = useOrganizerCopy();
  const actor = useAuthStore((s) => s.user?.id) ?? 0;
  const [workspaceId, setWorkspaceId] = useState<number>();
  const [period, setPeriod] = useState(30);
  const [today] = useState(() => localDate(new Date()));
  const [now] = useState(() => new Date());
  const from = useMemo(() => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() - period + 1);
    return localDate(date);
  }, [today, period]);
  const workspaces = useQuery({ ...resourceWorkspacesOptions(actor), enabled: !!actor });
  const filter = { from, to: today, workspaceId };
  const report = useQuery({
    queryKey: ['organizer-overview', actor, 'report', filter],
    queryFn: ({ signal }) => analyticsApi.report(filter, signal),
    enabled: !!actor
  });
  const calendar = useQuery({
    queryKey: ['organizer-overview', actor, 'today', workspaceId, today],
    queryFn: () => workspaceService.getOrganizerCalendarEvents({ workspaceId, date: today }),
    enabled: !!actor,
    refetchInterval: 30000
  });
  const pending = useQuery({
    queryKey: ['organizer-overview', actor, 'pending', workspaceId],
    queryFn: () =>
      workspaceService.getOrganizerBookings({
        workspaceId,
        status: 'PENDING_APPROVAL',
        page: 1,
        size: 5
      }),
    enabled: !!actor,
    refetchInterval: 30000
  });
  const bookings = (calendar.data ?? []).filter(
    (b) =>
      !['CANCELLED', 'EXPIRED'].includes(b.status) &&
      !(
        b.status === 'PENDING_PAYMENT' &&
        b.holdExpiresAt &&
        new Date(b.holdExpiresAt) <= new Date(b.serverTime || now)
      )
  );
  // Batch image metadata per workspace and reuse the setup screens' query caches.
  const imageWorkspaceIds = [...new Set(bookings.map((booking) => booking.workspaceId))];
  const resourceCatalogs = useQueries({
    queries: imageWorkspaceIds.map((id) => ({
      queryKey: ['organizer-operations', actor, id, 'pricing'],
      queryFn: ({ signal }: { signal: AbortSignal }) => operationsApi.pricing(id, signal),
      enabled: !!actor,
      staleTime: 60_000
    }))
  });
  const typeCatalogs = useQueries({
    queries: imageWorkspaceIds.map((id) => ({ ...resourceOptions(actor, id), enabled: !!actor }))
  });
  const resourcePhotos = new Map<string, string>();
  imageWorkspaceIds.forEach((id, index) => {
    const photosByType = new Map(
      typeCatalogs[index].data?.types.map((type) => [type.id, type.photoUrls?.[0]])
    );
    resourceCatalogs[index].data?.resources.forEach((resource) => {
      const photo = photosByType.get(resource.typeId);
      if (photo) resourcePhotos.set(`${id}:${resource.id}`, photo);
    });
  });
  const active = (workspaces.data ?? []).filter((w) => w.status === 'ACTIVE');
  const drafts = (workspaces.data ?? []).filter((w) => w.status === 'DRAFT');
  const errors = [workspaces.error, report.error, calendar.error, pending.error].filter(Boolean);
  const refresh = () => {
    void workspaces.refetch();
    void report.refetch();
    void calendar.refetch();
    void pending.refetch();
  };
  const amount = report.data?.earnings?.organizerAmount;
  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-6 pb-10'>
      <header className='relative flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6'>
        <div
          className='pointer-events-none absolute -right-12 -top-28 size-72 rounded-full border-[36px] border-primary/5'
          aria-hidden='true'
        />
        <div className='relative'>
          <p className='flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary'>
            <span className='size-1.5 rounded-full bg-primary' />
            NexSpace Organizer
          </p>
          <h1 className='mt-2 text-2xl font-semibold tracking-tight sm:text-3xl'>
            {c('Operations overview', 'Tổng quan hoạt động')}
          </h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            {c(
              'Bookings, money and daily tasks in one place.',
              'Theo dõi đặt chỗ, tiền và công việc hằng ngày tại một nơi.'
            )}
          </p>
        </div>
        <div className='relative flex flex-wrap items-center gap-2 rounded-xl border bg-background/60 p-2'>
          <select
            className={selectClass}
            aria-label={c('Workspace', 'Không gian')}
            value={workspaceId ?? ''}
            onChange={(e) => setWorkspaceId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value=''>{c('All workspaces', 'Tất cả workspace')}</option>
            {workspaces.data?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name || `Workspace #${w.id}`}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            aria-label={c('Period', 'Khoảng thời gian')}
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
          >
            <option value={7}>{c('Last 7 days', '7 ngày gần nhất')}</option>
            <option value={30}>{c('Last 30 days', '30 ngày gần nhất')}</option>
            <option value={90}>{c('Last 90 days', '90 ngày gần nhất')}</option>
          </select>
          <Button
            variant='outline'
            size='icon'
            aria-label={c('Refresh', 'Làm mới')}
            onClick={refresh}
          >
            <RefreshCw className='size-4' />
          </Button>
        </div>
      </header>
      {!!errors.length && (
        <div
          role='alert'
          className='rounded-xl border border-destructive/30 p-4 text-sm text-destructive'
        >
          {errors.map((e) => (
            <p key={e!.message}>{e!.message}</p>
          ))}
          <Button variant='outline' onClick={refresh}>
            {c('Retry', 'Thử lại')}
          </Button>
        </div>
      )}
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        {[
          {
            label: c('Your total after fees', 'Tổng tiền bạn được nhận'),
            value: report.isPending
              ? '…'
              : amount == null
                ? c('Not verified', 'Chưa đủ căn cứ')
                : money(amount, 'vi-VN'),
            help: c('Includes VAT · in selected dates', 'Gồm VAT · trong thời gian đã chọn'),
            icon: Wallet,
            tone: 'border-primary/25 bg-gradient-to-br from-primary/10 to-card',
            iconTone: 'bg-primary/15 text-primary',
            to: '/dashboard/organizer/analytics'
          },
          {
            label: c('Bookings today', 'Booking hôm nay'),
            value: calendar.isPending ? '…' : calendar.isError ? '—' : bookings.length,
            help: c(
              'Includes valid holds; excludes cancelled / expired',
              'Gồm giữ chỗ còn hạn; không tính hủy / hết hạn'
            ),
            icon: CalendarDays,
            tone: 'border-border bg-card',
            iconTone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
            to: '/dashboard/organizer/schedule'
          },
          {
            label: c('Awaiting your approval', 'Đơn chờ bạn duyệt'),
            value: pending.isPending
              ? '…'
              : pending.isError
                ? '—'
                : (pending.data?.totalElements ?? 0),
            help: c('All upcoming approval requests', 'Các yêu cầu đặt chỗ đang chờ duyệt'),
            icon: Clock,
            tone: 'border-border bg-card',
            iconTone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            to: '/dashboard/organizer/bookings'
          },
          {
            label: c('Active workspaces', 'Workspace đang hoạt động'),
            value: workspaces.isPending
              ? '…'
              : workspaces.isError
                ? '—'
                : workspaceId
                  ? active.filter((w) => w.id === workspaceId).length
                  : active.length,
            help: c('Ready to accept bookings', 'Đang hoạt động trong phạm vi đã chọn'),
            icon: LayoutGrid,
            tone: 'border-border bg-card',
            iconTone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            to: '/dashboard/organizer/workspaces'
          }
        ].map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className={`group min-w-0 rounded-2xl border p-4 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-sm sm:p-5 ${card.tone}`}
          >
            <div className='flex justify-between'>
              <span
                className={`flex size-9 items-center justify-center rounded-xl ${card.iconTone}`}
              >
                <card.icon className='size-4' />
              </span>
              <ArrowUpRight className='size-4 text-muted-foreground/50 transition-colors group-hover:text-primary' />
            </div>
            <p className='mt-3 text-xs font-medium text-muted-foreground'>{card.label}</p>
            <p className='mt-1.5 break-words text-[clamp(1.4rem,2vw,2rem)] font-semibold tracking-tight tabular-nums'>
              {card.value}
            </p>
            <p className='mt-2 text-[11px] leading-relaxed text-muted-foreground'>{card.help}</p>
          </Link>
        ))}
      </div>
      <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]'>
        <section className='min-w-0 overflow-hidden rounded-2xl border bg-card'>
          <div className='flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4'>
            <div className='flex items-center gap-3'>
              <span className='flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                <CalendarDays className='size-4' />
              </span>
              <div>
                <h2 className='flex items-center gap-2 font-semibold'>
                  {c('Today’s bookings', 'Đặt chỗ hôm nay')}
                  <span className='rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground'>
                    {calendar.isPending || calendar.isError ? '—' : bookings.length}
                  </span>
                </h2>
                <p className='mt-0.5 text-xs text-muted-foreground'>{formatDateLabel(today)}</p>
              </div>
            </div>
            <Link
              to='/dashboard/organizer/schedule'
              className='flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/5'
            >
              {c('View timeline', 'Xem lịch biểu')}
              <ArrowRight className='size-3.5' />
            </Link>
          </div>
          {calendar.isPending && (
            <p role='status' className='p-5 text-sm text-muted-foreground'>
              {c('Loading…', 'Đang tải…')}
            </p>
          )}
          {!calendar.isPending && !calendar.isError && !bookings.length && (
            <div className='flex flex-col items-center px-5 py-12 text-center'>
              <span className='mb-3 rounded-2xl bg-muted p-4'>
                <CalendarDays className='size-7 text-muted-foreground/60' />
              </span>
              <p className='text-sm font-medium'>
                {c('No bookings for today.', 'Hôm nay chưa có booking.')}
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                {c('New bookings will appear here.', 'Các lượt đặt mới sẽ hiển thị tại đây.')}
              </p>
            </div>
          )}
          <div className='max-h-[560px] space-y-3 overflow-auto p-3 sm:p-4'>
            {bookings.map((b) => (
              <article
                key={b.id}
                className='flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/15 p-3 sm:flex-row'
              >
                <ResourceTypeThumbnail
                  src={resourcePhotos.get(`${b.workspaceId}:${b.resourceId}`)}
                  name={b.resourceName || b.resourceCode}
                />
                <div className='flex min-w-0 flex-1 flex-col justify-between gap-4 py-1'>
                  <div>
                    <div className='flex flex-wrap items-start justify-between gap-2'>
                      <h3 className='text-base font-semibold tracking-tight'>
                        {b.resourceName || b.resourceCode}
                      </h3>
                      <span
                        className={`w-fit rounded-md border px-2 py-1 text-[10px] font-medium ${scheduleTone[b.status] ?? ''}`}
                      >
                        {scheduleStatus(b.status, c)}
                      </span>
                    </div>
                    <div className='mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground'>
                      <span className='inline-flex items-center gap-1.5'>
                        <UserRound className='size-3.5 shrink-0' />
                        {b.customerName || c('Customer', 'Khách')}
                      </span>
                      <span className='inline-flex items-center gap-1.5'>
                        <MapPin className='size-3.5 shrink-0' />
                        {b.workspaceName}
                      </span>
                    </div>
                    <p className='mt-3 flex items-start gap-1.5 text-xs leading-relaxed tabular-nums'>
                      <Clock className='mt-0.5 size-3.5 shrink-0 text-muted-foreground' />
                      {formatDateTime(b.startTime)} → {formatDateTime(b.endTime)}
                    </p>
                  </div>
                  <div className='flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5'>
                    <span className='rounded bg-background/70 px-2 py-1 font-mono text-[10px] text-muted-foreground'>
                      {b.bookingCode}
                    </span>
                    <Link
                      to='/dashboard/organizer/bookings'
                      search={{ workspaceId: b.workspaceId }}
                      className='inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline'
                    >
                      {c('Manage bookings', 'Quản lý đặt chỗ')}
                      <ArrowUpRight className='size-3.5' />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        <aside className='overflow-hidden rounded-2xl border bg-card'>
          <section className='p-4 sm:p-5'>
            <h2 className='font-semibold'>{c('Quick actions', 'Thao tác nhanh')}</h2>
            <p className='mt-1 text-xs text-muted-foreground'>
              {c('Your everyday workspace tools.', 'Công cụ quản lý thường dùng.')}
            </p>
            <div className='mt-4 grid gap-1.5'>
              {[
                {
                  to: '/dashboard/organizer/floorplan',
                  icon: Layers,
                  label: c('Set up floor plans', 'Thiết lập sơ đồ tầng')
                },
                {
                  to: '/dashboard/organizer/pricing',
                  icon: Tags,
                  label: c('Update pricing', 'Cập nhật bảng giá')
                },
                {
                  to: '/dashboard/organizer/blockout',
                  icon: CalendarOff,
                  label: c('Block booking time', 'Ngừng nhận đặt theo lịch')
                },
                {
                  to: '/dashboard/organizer/bookings',
                  icon: CalendarDays,
                  label: c('Manage bookings', 'Quản lý đặt chỗ')
                },
                {
                  to: '/dashboard/organizer/analytics',
                  icon: BarChart3,
                  label: c('Financial analytics', 'Thống kê tiền và lượt thuê')
                }
              ].map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className='group flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-primary/5'
                >
                  <span className='flex min-w-0 items-center gap-3'>
                    <span className='flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground group-hover:border-primary/20 group-hover:text-primary'>
                      <a.icon className='size-4' />
                    </span>
                    <span className='text-xs font-medium'>{a.label}</span>
                  </span>
                  <ArrowUpRight className='size-3.5 shrink-0 text-muted-foreground/60 group-hover:text-primary' />
                </Link>
              ))}
            </div>
          </section>
          <section className='border-t bg-muted/20 p-4 sm:px-5'>
            <div className='flex items-center gap-2'>
              <Building2 className='size-4 text-muted-foreground' />
              <h2 className='text-xs font-semibold'>
                {c('Workspace setup', 'Thiết lập workspace')}
              </h2>
            </div>
            <p className='mt-2 text-xs text-muted-foreground'>
              {workspaces.isPending
                ? '…'
                : drafts.length
                  ? `${drafts.length} ${c('draft workspaces', 'workspace đang là bản nháp')}`
                  : c('No draft workspaces.', 'Không có workspace đang là bản nháp.')}
            </p>
            <Link
              to='/dashboard/organizer/workspaces'
              className='mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline'
            >
              {drafts.length
                ? c('Continue setup', 'Tiếp tục thiết lập')
                : c('Manage workspaces', 'Quản lý workspace')}
              <ArrowRight className='size-3' />
            </Link>
          </section>
        </aside>
      </div>
      {report.data && (
        <AnalyticsCharts
          rows={chartTrends(report.data.filter, report.data.trends, 'day')}
          locale={c('en-US', 'vi-VN')}
        />
      )}
    </div>
  );
}

function ResourceTypeThumbnail({ src, name }: { src?: string; name: string }) {
  const c = useOrganizerCopy();
  const [failedSrc, setFailedSrc] = useState<string>();
  return (
    <div className='flex h-44 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted sm:h-auto sm:min-h-36 sm:w-40 lg:w-48'>
      {src && src !== failedSrc ? (
        <img
          src={src}
          alt={name}
          loading='lazy'
          decoding='async'
          className='size-full object-cover'
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <ImageIcon
          className='size-9 text-muted-foreground/50'
          aria-label={c('Resource type photo unavailable', 'Chưa hiển thị được ảnh loại chỗ')}
        />
      )}
    </div>
  );
}
