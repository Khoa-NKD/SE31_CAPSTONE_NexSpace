import { Spinner } from '@/components/ui/spinner';
import { DateInput } from '@/components/ui/date-input';
import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, RefreshCw, BarChart3, AlertTriangle, SlidersHorizontal } from '@/components/ui/hugeicons';
import { analyticsApi, type AnalyticsFilter, type AnalyticsReport } from '../api';
import { chartTrends, localDate, preset, displayAnalyticsDate } from '../format';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { Button } from '@/components/ui/button';
import { OrganizerPageHeader } from '@/components/layout/organizer-page-header';
import { AnalyticsCharts, AnalyticsRankings, BookingBreakdown } from './report-charts';
import { FinancialLedger } from './financial-ledger';
import { SummaryCards } from './summary-cards';

const selectClass = 'organizer-control';
const panelClass = 'organizer-surface p-4 sm:p-5';

export function OrganizerAnalyticsView() {
  const navigate = useNavigate();
  const c = useOrganizerCopy();
  const locale = c('en-US', 'vi-VN');
  const actor = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AnalyticsFilter>(() => preset(30));
  const [draft, setDraft] = useState(filter);
  const [tab, setTab] = useState<'overview' | 'performance' | 'finance'>('overview');
  const [group, setGroup] = useState<'day' | 'week' | 'month'>('day');
  const [ledgerKind, setLedgerKind] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const options = useQuery({
    queryKey: ['organizer-analytics', actor, 'options'],
    queryFn: ({ signal }) => analyticsApi.options(signal),
    enabled: !!actor,
    staleTime: 60_000
  });
  const report = useQuery({
    queryKey: ['organizer-analytics', actor, 'report', filter],
    queryFn: ({ signal }) => analyticsApi.report(filter, signal),
    enabled: !!actor,
    staleTime: 30_000,
    retry: 1
  });
  const data = report.data;
  const trends = useMemo(
    () => (data ? chartTrends(data.filter, data.trends, group) : []),
    [data, group]
  );
  const floors = options.data?.floors.filter((f) => f.workspaceId === draft.workspaceId) ?? [];
  const types =
    options.data?.resourceTypes.filter(
      (t) =>
        (!draft.workspaceId || t.workspaceId === draft.workspaceId) &&
        (!draft.category || t.category === draft.category)
    ) ?? [];
  const duration = (Date.parse(draft.to) - Date.parse(draft.from)) / 86_400_000 + 1;
  const valid = Number.isFinite(duration) && duration > 0 && duration <= 366;
  const dirty = JSON.stringify(draft) !== JSON.stringify(filter);

  async function refreshReport() {
    await Promise.all([
      report.refetch(),
      queryClient.invalidateQueries({ queryKey: ['organizer-analytics', actor, 'ledger'] })
    ]);
  }

  function applyWorkspace(workspaceId: number) {
    void navigate({ to: '/dashboard/organizer/bookings', search: { workspaceId } });
  }
  function showMoney(kind: string) {
    setLedgerKind(kind);
    setTab('finance');
  }
  async function exportCsv() {
    setExporting(true);
    setExportError('');
    try {
      const csv = await analyticsApi.export(
        filter,
        tab === 'finance' ? ledgerKind || undefined : undefined
      );
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `nexspace-${filter.from}-${filter.to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : c('Export failed. Please retry.', 'Xuất báo cáo thất bại. Vui lòng thử lại.')
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className='min-w-0 space-y-5 pb-8'>
      <OrganizerPageHeader
        icon={<BarChart3 />}
        title={c('Business analytics', 'Thống kê kinh doanh')}
        description={c(
          'Bookings, cash flow and workspace performance.',
          'Lượt đặt, dòng tiền và hiệu quả từng không gian.'
        )}
      >
        <div className='flex gap-2'>
          <Button
            variant='outline'
            disabled={report.isFetching}
            onClick={() => void refreshReport()}
          >
            {report.isFetching ? <Spinner className={'size-4'} /> : <RefreshCw className={'size-4'} />}
            {c('Refresh', 'Làm mới')}
          </Button>
          <Button
            variant='default'
            disabled={!data || exporting || report.isFetching}
            onClick={() => void exportCsv()}
          >
            <Download className='size-4' />
            {exporting ? c('Exporting…', 'Đang xuất…') : c('Export transactions', 'Xuất giao dịch')}
          </Button>
        </div>
      </OrganizerPageHeader>

      <form
        className={`${panelClass} space-y-3`}
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) {
            setFilter(draft);
            setExportError('');
          }
        }}
      >
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1'>
            {[1, 7, 30, 90].map((days) => (
              <Button
                key={days}
                type='button'
                size='sm'
                variant={
                  draft.from === preset(days).from && draft.to === preset(days).to
                    ? 'secondary'
                    : 'ghost'
                }
                onClick={() => setDraft({ ...draft, ...preset(days) })}
              >
                {days === 1 ? c('Today', 'Hôm nay') : `${days} ${c('days', 'ngày')}`}
              </Button>
            ))}
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() =>
                setDraft({
                  ...draft,
                  from: localDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
                  to: localDate(new Date())
                })
              }
            >
              {c('This month', 'Tháng này')}
            </Button>
          </div>
          <Button
            type='button'
            size='sm'
            variant={advanced ? 'secondary' : 'ghost'}
            aria-expanded={advanced}
            onClick={() => setAdvanced(!advanced)}
          >
            <SlidersHorizontal className='size-4' />
            {c('Advanced filters', 'Lọc nâng cao')}
            {(draft.category || draft.resourceTypeId || draft.floorNumber !== undefined) && (
              <span className='size-2 rounded-full bg-primary' />
            )}
          </Button>
          {(draft.workspaceId ||
            draft.floorNumber !== undefined ||
            draft.category ||
            draft.resourceTypeId) && (
            <Button
              type='button'
              size='sm'
              variant='ghost'
              onClick={() => setDraft({ from: draft.from, to: draft.to })}
            >
              {c('Clear filters', 'Xóa bộ lọc')}
            </Button>
          )}
        </div>
        <div className='grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.5fr_auto]'>
          <label className='space-y-1 text-xs text-muted-foreground'>
            {c('From (inclusive)', 'Từ ngày')}
            <DateInput
              type='date'
              required
              value={draft.from}
              onValueChange={(dateValue) => setDraft({ ...draft, from: dateValue })}
            />
          </label>
          <label className='space-y-1 text-xs text-muted-foreground'>
            {c('To (inclusive)', 'Đến hết ngày')}
            <DateInput
              type='date'
              required
              value={draft.to}
              onValueChange={(dateValue) => setDraft({ ...draft, to: dateValue })}
            />
          </label>
          <label className='space-y-1 text-xs text-muted-foreground'>
            {c('Workspace', 'Không gian')}
            <select
              className={`${selectClass} w-full`}
              value={draft.workspaceId ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  workspaceId: e.target.value ? Number(e.target.value) : undefined,
                  floorNumber: undefined,
                  resourceTypeId: undefined
                })
              }
            >
              <option value=''>{c('All my workspaces', 'Tất cả không gian của tôi')}</option>
              {options.data?.workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <Button type='submit' disabled={!valid || report.isFetching} className='h-10'>
            {c('Apply filters', 'Áp dụng bộ lọc')}
          </Button>
        </div>
        {advanced && (
          <div className='grid gap-3 border-t border-dashed pt-3 sm:grid-cols-3'>
            <label className='space-y-1 text-xs text-muted-foreground'>
              {c('Floor', 'Tầng')}
              <select
                className={`${selectClass} w-full`}
                disabled={!draft.workspaceId}
                value={draft.floorNumber ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    floorNumber: e.target.value === '' ? undefined : Number(e.target.value)
                  })
                }
              >
                <option value=''>{c('All floors', 'Tất cả tầng')}</option>
                {floors.map((f) => (
                  <option key={f.floorNumber} value={f.floorNumber}>
                    {c('Floor', 'Tầng')} {f.floorNumber}
                  </option>
                ))}
              </select>
            </label>
            <label className='min-w-40 flex-1 space-y-1 text-xs text-muted-foreground'>
              {c('Category', 'Nhóm chỗ')}
              <select
                className={`${selectClass} w-full`}
                value={draft.category ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    category: (e.target.value || undefined) as AnalyticsFilter['category'],
                    resourceTypeId: undefined
                  })
                }
              >
                <option value=''>{c('Desks and rooms', 'Ghế và phòng')}</option>
                <option value='DESK'>{c('Desks', 'Ghế')}</option>
                <option value='ROOM'>{c('Rooms', 'Phòng')}</option>
              </select>
            </label>
            <label className='min-w-48 flex-1 space-y-1 text-xs text-muted-foreground'>
              {c('Resource type', 'Loại chỗ')}
              <select
                className={`${selectClass} w-full`}
                value={draft.resourceTypeId ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    resourceTypeId: e.target.value ? Number(e.target.value) : undefined
                  })
                }
              >
                <option value=''>{c('All resource types', 'Tất cả loại chỗ')}</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {!draft.workspaceId
                      ? ` · ${options.data?.workspaces.find((w) => w.id === t.workspaceId)?.name ?? ''}`
                      : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {!valid && (
          <p role='alert' className='text-sm text-destructive'>
            {c(
              'Choose a valid date range of up to 366 days.',
              'Chọn khoảng ngày hợp lệ, tối đa 366 ngày.'
            )}
          </p>
        )}
        {dirty && valid && (
          <p className='text-xs text-amber-600 dark:text-amber-400'>
            {c(
              'Filters changed. Apply them to update the report below.',
              'Bộ lọc đã đổi. Bấm Áp dụng để cập nhật báo cáo bên dưới.'
            )}
          </p>
        )}
        {options.isError && (
          <p role='alert' className='text-sm text-destructive'>
            {c('Could not load filter options.', 'Không tải được danh sách bộ lọc.')}{' '}
            <button type='button' className='underline' onClick={() => void options.refetch()}>
              {c('Retry', 'Thử lại')}
            </button>
          </p>
        )}
      </form>

      {exportError && (
        <p role='alert' className='text-sm text-destructive'>
          {exportError}
        </p>
      )}
      {report.isError && (
        <div role='alert' className={`${panelClass} border-destructive/40 text-destructive`}>
          {c(
            'Could not load analytics. No estimated or sample values are shown.',
            'Không tải được thống kê. Hệ thống không thay bằng số ước lượng hoặc số mẫu.'
          )}{' '}
          <Button variant='outline' className='ml-2' onClick={() => void report.refetch()}>
            {c('Retry', 'Thử lại')}
          </Button>
        </div>
      )}
      {report.isPending && (
        <div role='status' className={`${panelClass} py-12 text-center text-muted-foreground`}>
          {c('Loading verified records…', 'Đang tổng hợp dữ liệu…')}
        </div>
      )}
      {data && !report.isError && (
        <>
          <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
            <span>
              {displayAnalyticsDate(data.filter.from)} → {displayAnalyticsDate(data.filter.to)} ·
              VND · {c('Stored timestamp zone', 'Múi giờ ghi nhận')}: {data.timestampZone}
            </span>
            <span>
              {c('Updated', 'Cập nhật')}: {displayAnalyticsDate(data.generatedAt)}{' '}
              {report.isFetching && c(' · refreshing…', ' · đang cập nhật…')}
            </span>
          </div>
          <div className='flex flex-wrap gap-2 text-xs'>
            <span className='rounded-full border bg-card px-3 py-1.5'>
              {options.data?.workspaces.find((w) => w.id === filter.workspaceId)?.name ??
                c('All my workspaces', 'Tất cả không gian của tôi')}
            </span>
            {filter.floorNumber !== undefined && (
              <span className='rounded-full border bg-card px-3 py-1.5'>
                {c('Floor', 'Tầng')} {filter.floorNumber}
              </span>
            )}
            {filter.category && (
              <span className='rounded-full border bg-card px-3 py-1.5'>
                {filter.category === 'ROOM' ? c('Rooms', 'Phòng') : c('Desks', 'Ghế')}
              </span>
            )}
            {filter.resourceTypeId && (
              <span className='rounded-full border bg-card px-3 py-1.5'>
                {options.data?.resourceTypes.find((t) => t.id === filter.resourceTypeId)?.name ??
                  c('Selected resource type', 'Loại chỗ đã chọn')}
              </span>
            )}
          </div>
          <ReportNotes report={data} warningsOnly />
          <SummaryCards
            current={data.current}
            earnings={data.earnings}
            previousEarnings={data.previousEarnings}
            onMoney={showMoney}
          />
          <nav
            className='flex gap-1 overflow-x-auto border-b pb-2'
            aria-label={c('Analytics sections', 'Các phần thống kê')}
          >
            {(['overview', 'performance', 'finance'] as const).map((value) => (
              <Button
                key={value}
                variant={tab === value ? 'secondary' : 'ghost'}
                size='sm'
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                {value === 'overview'
                  ? c('Overview', 'Tổng quan')
                  : value === 'performance'
                    ? c('Rental performance', 'Hiệu quả cho thuê')
                    : c('Financial transactions', 'Giao dịch tài chính')}
              </Button>
            ))}
          </nav>
          {tab === 'overview' && (
            <>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <h2 className='text-lg font-semibold tracking-tight'>
                    {c('Business trends', 'Xu hướng kinh doanh')}
                  </h2>
                  <p className='text-xs text-muted-foreground'>
                    {c(
                      'Follow cash flow and demand across the selected period.',
                      'Theo dõi dòng tiền và nhu cầu trong kỳ đã chọn.'
                    )}
                  </p>
                </div>
                <label className='flex items-center gap-2 text-sm'>
                  {c('Group by', 'Nhóm theo')}
                  <select
                    className={selectClass}
                    value={group}
                    onChange={(e) => setGroup(e.target.value as typeof group)}
                  >
                    <option value='day'>{c('Day', 'Ngày')}</option>
                    <option value='week'>{c('Week', 'Tuần')}</option>
                    <option value='month'>{c('Month', 'Tháng')}</option>
                  </select>
                </label>
              </div>
              <AnalyticsCharts rows={trends} locale={locale} />
              <AnalyticsRankings report={data} onWorkspace={applyWorkspace} />
            </>
          )}
          {tab === 'performance' && (
            <>
              <BookingBreakdown report={data} />
              <AnalyticsRankings report={data} onWorkspace={applyWorkspace} />
            </>
          )}
          {tab === 'finance' && (
            <FinancialLedger
              filter={filter}
              kind={ledgerKind}
              onKind={setLedgerKind}
              summary={data.current}
              actor={actor}
            />
          )}
          <ReportNotes report={data} />
        </>
      )}
    </div>
  );
}

function ReportNotes({
  report,
  warningsOnly = false
}: {
  report: AnalyticsReport;
  warningsOnly?: boolean;
}) {
  const c = useOrganizerCopy();
  const descriptions: Record<string, string> = {
    EARNINGS_NEED_RECONCILIATION: c(
      'Organizer allocation cannot be certified: some booking currency, tax, fee, payment or refund data is incomplete or inconsistent. Amounts remain unknown rather than estimated.',
      'Chưa đủ căn cứ tính tiền bạn được hưởng: có dữ liệu tiền tệ, VAT, phí, thanh toán hoặc hoàn tiền thiếu/không khớp. Không thay số thiếu bằng 0 hay ước lượng.'
    ),
    EVENT_DATE_BASIS: c(
      'Bookings use creation dates; paid bookings use first payment dates; cash and refunds use their own processing dates. These are different cohorts.',
      'Đơn đặt mới theo ngày tạo; đơn đã thanh toán theo ngày thanh toán thành công đầu tiên; tiền nhận và hoàn theo ngày xử lý tương ứng. Các nhóm này không cùng tập booking.'
    ),
    CURRENT_RESOURCE_CLASSIFICATION: c(
      'Workspace, floor and resource-type grouping uses current assignments. Moving or renaming resources changes historical grouping, not recorded payment amounts.',
      'Nhóm workspace, tầng và loại chỗ dùng liên kết hiện tại. Đổi tên hoặc chuyển chỗ có thể đổi cách phân nhóm lịch sử, không đổi số tiền đã ghi nhận.'
    ),
    ORGANIZER_ALLOCATION_BASIS: c(
      'Bank transfers are shown only from PAID payout records with a reference and date. Allocations are not proof of a transfer; operating costs and profit are not calculated.',
      'Chỉ ghi tiền đã chuyển từ bản ghi chi trả PAID có mã và ngày chuyển. Tiền được phân bổ không đồng nghĩa đã chuyển; chưa tính chi phí vận hành hay lợi nhuận.'
    ),
    HISTORICAL_OCCUPANCY_UNAVAILABLE: c(
      'Reserved hours are not actual attendance or historical occupancy. Rooms do not add their contained desks to sales or resource-hours.',
      'Giờ được đặt không phải thời gian khách thực dùng hoặc công suất lịch sử. Thuê phòng không cộng thêm lượt và giờ của các ghế bên trong.'
    ),
    BOOKING_STATUS_IS_CURRENT: c(
      'Status counts describe bookings created in the selected period using their current status. Booked hours also reflect current cancellations.',
      'Phân bố trạng thái dùng trạng thái hiện tại của các đơn tạo trong kỳ. Giờ được đặt cũng phản ánh các lần hủy hiện tại.'
    ),
    EXCLUDED_FINANCIAL_RECORDS: c(
      'Records excluded from money totals: missing dates/amounts, non-successful payments with received funds, or refunds without a verified VND basis. Review these records.',
      'Bản ghi chưa đưa vào tổng tiền: thiếu ngày/số tiền, giao dịch chưa thành công nhưng có tiền về, hoặc hoàn tiền chưa rõ căn cứ VND. Cần kiểm tra lại.'
    ),
    RECEIPTS_NEED_RECONCILIATION: c(
      'Included receipts needing reconciliation: amount/reconciliation mismatch, money received at or after cancellation/expiry, or a booking still awaiting payment/approval despite a successful receipt. Missing cancellation timestamps also require review.',
      'Khoản đã cộng nhưng cần đối soát: lệch tiền/chưa khớp đối soát, tiền về sau hủy/hết hạn, booking vẫn chờ trả tiền/chờ duyệt dù có giao dịch thành công, hoặc thiếu mốc hủy để kiểm chứng.'
    ),
    MULTIPLE_SUCCESSFUL_PAYMENTS: c(
      'Multiple successful payments still need review as of the end of this period. Cash counts receipts; paid bookings count once.',
      'Booking có nhiều giao dịch thành công chưa đủ căn cứ xác nhận đã hoàn phần dư tính đến hết kỳ. Tiền nhận cộng từng giao dịch; lượt đã trả chỉ tính một lần.'
    ),
    DUPLICATE_PAYMENTS_REFUNDED: c(
      'The extra amount from multiple payments has been refunded by the end of this period. The booking is counted once.',
      'Phần tiền trả dư do thanh toán nhiều lần đã được hoàn tính đến hết kỳ. Booking vẫn chỉ tính một lượt.'
    ),
    REFUND_EXCEEDS_RECEIPT: c(
      'Processed refunds exceed the recorded received amount. Recorded cash is preserved; review the underlying transactions.',
      'Tổng tiền hoàn đã xử lý vượt số tiền nhận ghi trên giao dịch. Số liệu tiền vẫn giữ theo bản ghi; cần kiểm tra giao dịch nguồn.'
    )
  };
  const warnings = report.notices.filter(
    (n) =>
      n.count > 0 &&
      n.code !== 'DUPLICATE_PAYMENTS_REFUNDED' &&
      n.code !== 'EARNINGS_NEED_RECONCILIATION'
  );
  const resolved = report.notices.filter(
    (n) => n.count > 0 && n.code === 'DUPLICATE_PAYMENTS_REFUNDED'
  );
  return (
    <div className='space-y-3'>
      {warningsOnly && resolved.length > 0 && (
        <div
          role='status'
          className='rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground'
        >
          {resolved.map((notice) => (
            <p key={notice.code}>
              {notice.count} · {descriptions[notice.code]}
            </p>
          ))}
        </div>
      )}
      {warningsOnly && warnings.length > 0 && (
        <div
          role='status'
          className='space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4'
        >
          <p className='flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400'>
            <AlertTriangle className='size-4' />
            {c('Data requiring review', 'Dữ liệu cần kiểm tra')}
          </p>
          {warnings.some((notice) => notice.code === 'EXCLUDED_FINANCIAL_RECORDS') && (
            <p className='text-sm font-medium'>
              {c(
                'Money totals below include only records with a verified basis. Resolve excluded records before treating this as a complete financial report.',
                'Tổng tiền bên dưới chỉ gồm bản ghi đủ căn cứ. Cần xử lý các bản ghi bị loại trước khi xem đây là báo cáo tài chính đầy đủ.'
              )}
            </p>
          )}
          {warnings.map((n) => (
            <p key={n.code} className='text-sm'>
              {n.count} · {descriptions[n.code]}
            </p>
          ))}
        </div>
      )}
      {!warningsOnly && (
        <details className={panelClass}>
          <summary className='cursor-pointer text-sm font-medium'>
            {c('Calculation rules and data limitations', 'Cách tính và phạm vi dữ liệu')}
          </summary>
          <ul className='mt-3 space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground'>
            {report.notices
              .filter((n) => n.count === 0)
              .map((n) => (
                <li className='list-disc' key={n.code}>
                  {descriptions[n.code] ?? n.code}
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
  );
}
