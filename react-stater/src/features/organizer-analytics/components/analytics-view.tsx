import { Spinner } from '@/components/ui/spinner';
import { DateInput } from '@/components/ui/date-input';
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  SlidersHorizontal,
  CalendarDays,
  ChevronDown
} from '@/components/ui/hugeicons';
import { analyticsApi, type AnalyticsFilter, type AnalyticsReport } from '../api';
import {
  ANALYTICS_TIMEZONE,
  chartTrends,
  displayAnalyticsDate,
  formatVnDate,
  previousComparisonRange,
  resolveDatePreset,
  todayInHoChiMinh,
  type DatePresetKey
} from '../format';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { Button } from '@/components/ui/button';
import { OrganizerPageHeader } from '@/components/layout/organizer-page-header';
import { AnalyticsCharts, AnalyticsRankings, BookingBreakdown } from './report-charts';
import { FinancialLedger } from './financial-ledger';
import { SummaryCards } from './summary-cards';

const selectClass = 'organizer-control';
const panelClass = 'organizer-surface p-4 sm:p-5';

interface PresetDefinition {
  key: DatePresetKey;
  labelEn: string;
  labelVi: string;
  purposeEn: string;
  purposeVi: string;
  category: 'day' | 'period' | 'other';
  quickBar?: boolean;
}

const PRESET_DEFINITIONS: PresetDefinition[] = [
  {
    key: 'today',
    labelEn: 'Today',
    labelVi: 'Hôm nay',
    purposeEn: 'Track daily revenue',
    purposeVi: 'Theo dõi doanh thu trong ngày',
    category: 'day',
    quickBar: true
  },
  {
    key: 'yesterday',
    labelEn: 'Yesterday',
    labelVi: 'Hôm qua',
    purposeEn: 'Review previous day transactions',
    purposeVi: 'Kiểm tra giao dịch ngày trước',
    category: 'day',
    quickBar: true
  },
  {
    key: 'last_7_days',
    labelEn: 'Last 7 days',
    labelVi: '7 ngày qua',
    purposeEn: 'Short-term business tracking',
    purposeVi: 'Theo dõi kinh doanh ngắn hạn',
    category: 'day',
    quickBar: true
  },
  {
    key: 'last_30_days',
    labelEn: 'Last 30 days',
    labelVi: '30 ngày qua',
    purposeEn: 'Recent revenue analysis',
    purposeVi: 'Phân tích doanh thu gần đây',
    category: 'day',
    quickBar: true
  },
  {
    key: 'last_90_days',
    labelEn: 'Last 90 days',
    labelVi: '90 ngày qua',
    purposeEn: 'Long-term trend monitoring',
    purposeVi: 'Theo dõi xu hướng dài hạn',
    category: 'day'
  },
  {
    key: 'this_week',
    labelEn: 'This week',
    labelVi: 'Tuần này',
    purposeEn: 'Current week statistics (Mon – today)',
    purposeVi: 'Thống kê theo tuần hiện tại',
    category: 'period'
  },
  {
    key: 'last_week',
    labelEn: 'Last week',
    labelVi: 'Tuần trước',
    purposeEn: 'Previous week reconciliation (Mon – Sun)',
    purposeVi: 'Đối soát tuần trước',
    category: 'period'
  },
  {
    key: 'this_month',
    labelEn: 'This month',
    labelVi: 'Tháng này',
    purposeEn: 'Track current month revenue',
    purposeVi: 'Theo dõi doanh thu tháng hiện tại',
    category: 'period',
    quickBar: true
  },
  {
    key: 'last_month',
    labelEn: 'Last month',
    labelVi: 'Tháng trước',
    purposeEn: 'Monthly revenue reconciliation',
    purposeVi: 'Đối soát doanh thu hàng tháng',
    category: 'period',
    quickBar: true
  },
  {
    key: 'this_quarter',
    labelEn: 'This quarter',
    labelVi: 'Quý này',
    purposeEn: 'Quarterly business report',
    purposeVi: 'Báo cáo kinh doanh theo quý',
    category: 'period'
  },
  {
    key: 'last_quarter',
    labelEn: 'Last quarter',
    labelVi: 'Quý trước',
    purposeEn: 'Compare quarterly business results',
    purposeVi: 'Đối chiếu kết quả kinh doanh',
    category: 'period'
  },
  {
    key: 'this_year',
    labelEn: 'This year',
    labelVi: 'Năm này',
    purposeEn: 'Annual revenue summary',
    purposeVi: 'Tổng kết doanh thu trong năm',
    category: 'period'
  },
  {
    key: 'last_year',
    labelEn: 'Last year',
    labelVi: 'Năm trước',
    purposeEn: 'Year-over-year revenue comparison',
    purposeVi: 'Đối chiếu doanh thu hàng năm',
    category: 'period'
  },
  {
    key: 'all_time',
    labelEn: 'All time',
    labelVi: 'Toàn thời gian',
    purposeEn: 'Statistics from business start',
    purposeVi: 'Thống kê từ khi bắt đầu kinh doanh',
    category: 'other'
  },
  {
    key: 'custom',
    labelEn: 'Custom',
    labelVi: 'Tùy chỉnh',
    purposeEn: 'Choose a custom date range',
    purposeVi: 'Tự chọn khoảng thời gian',
    category: 'other'
  }
];

export function OrganizerAnalyticsView() {
  const navigate = useNavigate();
  const c = useOrganizerCopy();
  const locale = c('en-US', 'vi-VN');
  const actor = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  const contentSectionRef = useRef<HTMLDivElement>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);

  // Default preset is "Tháng này" (this_month) in Asia/Ho_Chi_Minh timezone
  const [activePreset, setActivePreset] = useState<DatePresetKey>('this_month');
  const [showMorePresets, setShowMorePresets] = useState(false);
  const [filter, setFilter] = useState<AnalyticsFilter>(() => resolveDatePreset('this_month'));
  const [draft, setDraft] = useState<AnalyticsFilter>(filter);

  const [tab, setTab] = useState<'overview' | 'performance' | 'finance'>('overview');
  const [group, setGroup] = useState<'day' | 'week' | 'month'>('day');
  const [ledgerKind, setLedgerKind] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const maxToday = todayInHoChiMinh();

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
  const hasFutureDate =
    (Boolean(draft.from) && draft.from > maxToday) || (Boolean(draft.to) && draft.to > maxToday);
  const validRangeLength = Number.isFinite(duration) && duration > 0 && duration <= 366;
  const valid = validRangeLength && !hasFutureDate;
  const dirty = JSON.stringify(draft) !== JSON.stringify(filter);

  const comparison = useMemo(
    () => previousComparisonRange(filter.from, filter.to),
    [filter.from, filter.to]
  );
  const comparisonShortLabel = comparison
    ? `${formatVnDate(comparison.from)} – ${formatVnDate(comparison.to)}`
    : undefined;

  function applyInstantFilter(next: AnalyticsFilter) {
    setDraft(next);
    const nextDuration = (Date.parse(next.to) - Date.parse(next.from)) / 86_400_000 + 1;
    const future =
      (Boolean(next.from) && next.from > maxToday) || (Boolean(next.to) && next.to > maxToday);
    if (Number.isFinite(nextDuration) && nextDuration > 0 && nextDuration <= 366 && !future) {
      setFilter(next);
      setExportError('');
    }
  }

  function handleSelectPreset(key: DatePresetKey) {
    setActivePreset(key);
    if (key === 'custom') {
      fromInputRef.current?.focus();
      return;
    }
    const range = resolveDatePreset(key, maxToday);
    applyInstantFilter({
      ...draft,
      from: range.from,
      to: range.to
    });
  }

  function handleManualDateChange(field: 'from' | 'to', value: string) {
    setActivePreset('custom');
    setDraft((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  async function refreshReport() {
    await Promise.all([
      report.refetch(),
      queryClient.invalidateQueries({ queryKey: ['organizer-analytics', actor, 'ledger'] })
    ]);
  }

  function applyWorkspace(workspaceId: number) {
    void navigate({ to: '/dashboard/organizer/bookings', search: { workspaceId } });
  }

  function scrollToAnalyticsTabs() {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById('organizer-analytics-tabs') || contentSectionRef.current;
        if (el) {
          try {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch {}
          const rect = el.getBoundingClientRect();
          const targetY = window.pageYOffset + rect.top - 80;
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      }, 100);
    });
  }

  function showMoney(kind: string) {
    setLedgerKind(kind);
    setTab('finance');
    scrollToAnalyticsTabs();
  }

  function showCharts() {
    setTab('overview');
    scrollToAnalyticsTabs();
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

  const quickPresets = PRESET_DEFINITIONS.filter((p) => p.quickBar);
  const activePresetDef =
    PRESET_DEFINITIONS.find((p) => p.key === activePreset) ??
    PRESET_DEFINITIONS[PRESET_DEFINITIONS.length - 1];
  const isSecondaryPresetActive = !activePresetDef.quickBar;

  return (
    <div className='min-w-0 space-y-4 pb-8'>
      <OrganizerPageHeader
        icon={<BarChart3 />}
        title={c('Business analytics', 'Phân tích dòng tiền & kinh doanh')}
        description={c(
          'Track customer payments, refunds, net organizer earnings and workspace performance.',
          'Theo dõi trực quan dòng tiền thu/hoàn, khoản thực hưởng và hiệu quả từng không gian.'
        )}
      >
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={report.isFetching}
            onClick={() => void refreshReport()}
          >
            {report.isFetching ? <Spinner className='size-4' /> : <RefreshCw className='size-4' />}
            {c('Refresh', 'Làm mới')}
          </Button>
          <Button
            variant='default'
            size='sm'
            disabled={!data || exporting || report.isFetching}
            onClick={() => void exportCsv()}
          >
            <Download className='size-4' />
            {exporting ? c('Exporting…', 'Đang xuất…') : c('Export CSV', 'Xuất giao dịch CSV')}
          </Button>
        </div>
      </OrganizerPageHeader>

      <form
        className={`${panelClass} space-y-4 rounded-2xl`}
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) {
            setFilter(draft);
            setExportError('');
          }
        }}
      >
        {/* Header: Bộ lọc thời gian + Nút Bộ lọc */}
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2 className='text-base font-semibold tracking-tight text-foreground'>
            {c('Time filter', 'Bộ lọc thời gian')}
          </h2>

          <div className='flex items-center gap-2'>
            {(draft.workspaceId ||
              draft.floorNumber !== undefined ||
              draft.category ||
              draft.resourceTypeId) && (
              <button
                type='button'
                onClick={() => {
                  const defaultRange = resolveDatePreset('this_month', maxToday);
                  setActivePreset('this_month');
                  applyInstantFilter({ from: defaultRange.from, to: defaultRange.to });
                }}
                className='cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
              >
                {c('Reset all', 'Đặt lại mặc định')}
              </button>
            )}
            <button
              type='button'
              aria-expanded={advanced}
              onClick={() => setAdvanced(!advanced)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                advanced
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <SlidersHorizontal className='size-4' />
              <span>{c('Filters', 'Bộ lọc')}</span>
              {(draft.category || draft.resourceTypeId || draft.floorNumber !== undefined) && (
                <span className='size-2 rounded-full bg-primary' />
              )}
            </button>
          </div>
        </div>

        {/* Top Quick Preset Pills Bar */}
        <div className='flex flex-wrap items-center gap-2'>
          {quickPresets.map((item) => {
            const isSelected = activePreset === item.key;
            return (
              <button
                key={item.key}
                type='button'
                title={c(item.purposeEn, item.purposeVi)}
                onClick={() => handleSelectPreset(item.key)}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all select-none ${
                  isSelected
                    ? 'border-foreground bg-foreground text-background shadow-xs'
                    : 'border-border/80 bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                }`}
              >
                {c(item.labelEn, item.labelVi)}
              </button>
            );
          })}

          <button
            type='button'
            aria-expanded={showMorePresets}
            onClick={() => setShowMorePresets((prev) => !prev)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all select-none ${
              isSecondaryPresetActive
                ? 'border-foreground bg-foreground text-background shadow-xs'
                : showMorePresets
                  ? 'border-foreground/50 bg-muted/60 text-foreground'
                  : 'border-border/80 bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            }`}
          >
            <span>
              {isSecondaryPresetActive
                ? `${c('Other', 'Khác')}: ${c(activePresetDef.labelEn, activePresetDef.labelVi)}`
                : c('Other', 'Khác')}
            </span>
            <ChevronDown
              className={`size-3.5 transition-transform duration-150 ${
                showMorePresets ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Expanded Categorized Preset Panel (Theo ngày / Theo kỳ / Khác) */}
        {showMorePresets && (
          <div className='space-y-3.5 rounded-2xl border border-border/80 bg-muted/20 p-4'>
            {(
              [
                ['day', c('By day', 'Theo ngày')],
                ['period', c('By period', 'Theo kỳ')],
                ['other', c('Other', 'Khác')]
              ] as const
            ).map(([catKey, catTitle]) => {
              const groupItems = PRESET_DEFINITIONS.filter((p) => p.category === catKey);
              return (
                <div key={catKey} className='space-y-2'>
                  <p className='text-xs font-medium text-muted-foreground'>{catTitle}</p>
                  <div className='flex flex-wrap items-center gap-1.5'>
                    {groupItems.map((item) => {
                      const isSelected = activePreset === item.key;
                      return (
                        <button
                          key={item.key}
                          type='button'
                          title={c(item.purposeEn, item.purposeVi)}
                          onClick={() => handleSelectPreset(item.key)}
                          className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-all select-none ${
                            isSelected
                              ? 'bg-foreground font-semibold text-background shadow-xs'
                              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                          }`}
                        >
                          {c(item.labelEn, item.labelVi)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Date Range Inputs Row: Từ ngày & Đến hết ngày */}
        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='space-y-1.5'>
            <label
              htmlFor='analytics-from-date'
              className='block text-xs font-medium text-muted-foreground'
            >
              {c('From date', 'Từ ngày')}
            </label>
            <DateInput
              id='analytics-from-date'
              ref={fromInputRef}
              type='date'
              required
              max={maxToday}
              value={draft.from}
              className='h-10 rounded-full bg-background/80 px-3.5 text-sm'
              onValueChange={(dateValue) => handleManualDateChange('from', dateValue)}
            />
          </div>
          <div className='space-y-1.5'>
            <label
              htmlFor='analytics-to-date'
              className='block text-xs font-medium text-muted-foreground'
            >
              {c('To date (inclusive)', 'Đến hết ngày')}
            </label>
            <DateInput
              id='analytics-to-date'
              type='date'
              required
              min={draft.from || undefined}
              max={maxToday}
              value={draft.to}
              className='h-10 rounded-full bg-background/80 px-3.5 text-sm'
              onValueChange={(dateValue) => handleManualDateChange('to', dateValue)}
            />
          </div>
        </div>

        {/* Workspace Select + Apply Button Row */}
        <div className='space-y-1.5'>
          <label
            htmlFor='analytics-workspace-select'
            className='block text-xs font-medium text-muted-foreground'
          >
            {c('Workspace', 'Không gian')}
          </label>
          <div className='flex flex-wrap items-center gap-2.5 sm:flex-nowrap'>
            <select
              id='analytics-workspace-select'
              className={`${selectClass} h-10 min-w-0 flex-1 rounded-full bg-background/80 px-4 text-sm`}
              value={draft.workspaceId ?? ''}
              onChange={(e) =>
                applyInstantFilter({
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

            <button
              type='submit'
              disabled={!valid || report.isFetching}
              className='inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground px-5 text-xs font-semibold text-background shadow-xs transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm'
            >
              {c('Apply', 'Áp dụng')}
            </button>
          </div>
        </div>

        {/* Advanced Resource Filters (Floor, Category, Resource Type) */}
        {advanced && (
          <div className='grid gap-3 border-t border-dashed border-border/70 pt-3.5 sm:grid-cols-3'>
            <label className='space-y-1 text-xs text-muted-foreground'>
              {c('Floor', 'Tầng')}
              <select
                className={`${selectClass} w-full rounded-xl`}
                disabled={!draft.workspaceId}
                value={draft.floorNumber ?? ''}
                onChange={(e) =>
                  applyInstantFilter({
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
                className={`${selectClass} w-full rounded-xl`}
                value={draft.category ?? ''}
                onChange={(e) =>
                  applyInstantFilter({
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
                className={`${selectClass} w-full rounded-xl`}
                value={draft.resourceTypeId ?? ''}
                onChange={(e) =>
                  applyInstantFilter({
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

        {/* Validation Alerts */}
        {hasFutureDate && (
          <p role='alert' className='text-xs font-medium text-destructive'>
            {c(
              'Future dates are not allowed for actual cash flow reports.',
              'Không cho phép chọn ngày tương lai đối với báo cáo dòng tiền thực tế.'
            )}
          </p>
        )}
        {!hasFutureDate && !validRangeLength && (
          <p role='alert' className='text-xs font-medium text-destructive'>
            {c(
              'Choose a valid date range of up to 366 days.',
              'Chọn khoảng ngày hợp lệ (Từ ngày ≤ Đến hết ngày, tối đa 366 ngày).'
            )}
          </p>
        )}
        {dirty && valid && (
          <p className='text-xs text-amber-600 dark:text-amber-400'>
            {c(
              'Custom date range modified. Click Apply to refresh the report.',
              'Khoảng thời gian tùy chỉnh đã thay đổi. Bấm Áp dụng để cập nhật báo cáo.'
            )}
          </p>
        )}
        {options.isError && (
          <p role='alert' className='text-xs text-destructive'>
            {c('Could not load filter options.', 'Không tải được danh sách bộ lọc.')}{' '}
            <button type='button' className='underline' onClick={() => void options.refetch()}>
              {c('Retry', 'Thử lại')}
            </button>
          </p>
        )}

        {/* Filter Card Footer: Active Date Range + Purpose + Comparison Period */}
        <div className='flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='inline-flex items-center gap-1.5 font-medium text-foreground tabular-nums'>
              <CalendarDays className='size-3.5 text-muted-foreground' />
              {formatVnDate(filter.from)} – {formatVnDate(filter.to)}
            </span>
            <span className='text-border'>•</span>
            <span>
              <strong className='font-medium text-foreground'>
                {c(activePresetDef.labelEn, activePresetDef.labelVi)}
              </strong>
              {' — '}
              {c(activePresetDef.purposeEn, activePresetDef.purposeVi)}
            </span>
          </div>

          <div className='flex flex-wrap items-center gap-2 text-[11px]'>
            {comparisonShortLabel && (
              <span>
                {c('Comparison period', 'Kỳ so sánh')}:{' '}
                <strong className='font-medium text-foreground tabular-nums'>
                  {comparisonShortLabel}
                </strong>
              </span>
            )}
            <span className='rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px]'>
              {ANALYTICS_TIMEZONE}
            </span>
          </div>
        </div>
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
          <Button variant='outline' size='sm' className='ml-2' onClick={() => void report.refetch()}>
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
          <div className='flex flex-wrap items-center justify-between gap-2 px-0.5 text-xs text-muted-foreground'>
            <div className='flex flex-wrap items-center gap-1.5'>
              <span className='rounded-md border border-border/70 bg-card px-2 py-0.5'>
                {options.data?.workspaces.find((w) => w.id === filter.workspaceId)?.name ??
                  c('All workspaces', 'Tất cả không gian')}
              </span>
              {filter.floorNumber !== undefined && (
                <span className='rounded-md border border-border/70 bg-card px-2 py-0.5'>
                  {c('Floor', 'Tầng')} {filter.floorNumber}
                </span>
              )}
              {filter.category && (
                <span className='rounded-md border border-border/70 bg-card px-2 py-0.5'>
                  {filter.category === 'ROOM' ? c('Rooms', 'Phòng') : c('Desks', 'Ghế')}
                </span>
              )}
              {filter.resourceTypeId && (
                <span className='rounded-md border border-border/70 bg-card px-2 py-0.5'>
                  {options.data?.resourceTypes.find((t) => t.id === filter.resourceTypeId)?.name ??
                    c('Selected resource type', 'Loại chỗ đã chọn')}
                </span>
              )}
            </div>
            <span>
              {c('Updated', 'Cập nhật')}: {displayAnalyticsDate(data.generatedAt)}
              {report.isFetching && c(' · refreshing…', ' · đang làm mới…')}
            </span>
          </div>

          <ReportNotes report={data} warningsOnly />

          <SummaryCards
            current={data.current}
            earnings={data.earnings}
            previousEarnings={data.previousEarnings}
            comparisonLabel={comparisonShortLabel}
            onMoney={showMoney}
            onCharts={showCharts}
          />

          {/* Anchor target for jumping to charts / transaction ledger */}
          <div ref={contentSectionRef} id='organizer-analytics-tabs' className='scroll-mt-20 space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-2.5'>
              <nav
                className='inline-flex rounded-xl border border-border/70 bg-muted/40 p-1'
                aria-label={c('Analytics sections', 'Các phần thống kê')}
              >
                {(
                  [
                    ['overview', c('Overview & trends', 'Tổng quan & xu hướng')],
                    ['performance', c('Rental performance', 'Hiệu quả cho thuê')],
                    [
                      'finance',
                      `${c('Transaction ledger', 'Sổ cái giao dịch')} (${data.current.receiptCount + data.current.refundCount})`
                    ]
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type='button'
                    aria-pressed={tab === value}
                    onClick={() => setTab(value)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                      tab === value
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {tab === 'overview' && (
                <div className='flex items-center gap-2 text-xs'>
                  <span className='text-muted-foreground'>{c('Group by', 'Nhóm theo')}:</span>
                  <div className='inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5'>
                    {(
                      [
                        ['day', c('Day', 'Ngày')],
                        ['week', c('Week', 'Tuần')],
                        ['month', c('Month', 'Tháng')]
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        type='button'
                        onClick={() => setGroup(val)}
                        className={`cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors ${
                          group === val
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {tab === 'overview' && (
              <div className='space-y-4'>
                <AnalyticsCharts rows={trends} locale={locale} />
                <AnalyticsRankings report={data} onWorkspace={applyWorkspace} />
              </div>
            )}
            {tab === 'performance' && (
              <div className='space-y-4'>
                <BookingBreakdown report={data} />
                <AnalyticsRankings report={data} onWorkspace={applyWorkspace} />
              </div>
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
          </div>

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
  if (warningsOnly && resolved.length === 0 && warnings.length === 0) {
    return null;
  }
  return (
    <div className='space-y-2.5'>
      {warningsOnly && resolved.length > 0 && (
        <div
          role='status'
          className='rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-muted-foreground'
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
          className='space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3.5 py-3'
        >
          <p className='flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400'>
            <AlertTriangle className='size-3.5' />
            {c('Data requiring review', 'Dữ liệu cần kiểm tra')}
          </p>
          {warnings.some((notice) => notice.code === 'EXCLUDED_FINANCIAL_RECORDS') && (
            <p className='text-xs font-medium'>
              {c(
                'Money totals below include only records with a verified basis. Resolve excluded records before treating this as a complete financial report.',
                'Tổng tiền bên dưới chỉ gồm bản ghi đủ căn cứ. Cần xử lý các bản ghi bị loại trước khi xem đây là báo cáo tài chính đầy đủ.'
              )}
            </p>
          )}
          {warnings.map((n) => (
            <p key={n.code} className='text-xs text-muted-foreground'>
              {n.count} · {descriptions[n.code]}
            </p>
          ))}
        </div>
      )}
      {!warningsOnly && (
        <details className='rounded-xl border border-border/60 bg-card/60 px-3.5 py-2.5 text-xs'>
          <summary className='cursor-pointer font-medium text-muted-foreground hover:text-foreground'>
            {c('Calculation rules and data limitations', 'Quy tắc tính toán và phạm vi dữ liệu')}
          </summary>
          <ul className='mt-2.5 space-y-1.5 pl-4 text-[11px] leading-relaxed text-muted-foreground'>
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
