import { useId, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import type { AnalyticsReport, Ranking, Trend } from '../api';
import { cents, compactMoney, money, displayAnalyticsDate, type chartTrends } from '../format';

const panel = 'min-w-0 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5';

interface CashSeriesVisibility {
  received: boolean;
  net: boolean;
  refunded: boolean;
}

interface BookingSeriesVisibility {
  createdBookings: boolean;
  paidBookings: boolean;
}

function CashTooltip({
  active,
  payload,
  locale,
  visible
}: {
  active?: boolean;
  payload?: { payload?: Trend }[];
  locale: string;
  visible: CashSeriesVisibility;
}) {
  const c = useOrganizerCopy();
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  if (!visible.received && !visible.net && !visible.refunded) return null;
  return (
    <div className='min-w-[170px] max-w-[220px] space-y-1.5 rounded-lg border border-border/80 bg-popover/95 px-2.5 py-2 text-[11px] text-popover-foreground shadow-md backdrop-blur-sm'>
      <p className='border-b border-border/60 pb-1 font-semibold text-foreground'>
        {displayAnalyticsDate(row.date)}
      </p>
      {visible.received && (
        <div className='flex items-center justify-between gap-3'>
          <span className='flex items-center gap-1.5 text-muted-foreground'>
            <span className='size-2 rounded-full bg-indigo-500' />
            {c('Received', 'Đã nhận')}
          </span>
          <strong className='tabular-nums'>{money(row.receivedAmount, locale)}</strong>
        </div>
      )}
      {visible.refunded && (
        <div className='flex items-center justify-between gap-3'>
          <span className='flex items-center gap-1.5 text-muted-foreground'>
            <span className='size-2 rounded-full bg-rose-500' />
            {c('Refunded', 'Đã hoàn')}
          </span>
          <strong className='text-rose-600 tabular-nums dark:text-rose-400'>
            {money(row.refundedAmount, locale)}
          </strong>
        </div>
      )}
      {visible.net && (
        <div className='flex items-center justify-between gap-3 border-t border-border/50 pt-1'>
          <span className='flex items-center gap-1.5 font-medium text-foreground'>
            <span className='size-2 rounded-full bg-emerald-500' />
            {c('Net cash', 'Thực thu')}
          </span>
          <strong className='text-emerald-600 tabular-nums dark:text-emerald-400'>
            {money(row.netAmount, locale)}
          </strong>
        </div>
      )}
    </div>
  );
}

function BookingTooltip({
  active,
  payload,
  visible
}: {
  active?: boolean;
  payload?: { payload?: Trend }[];
  visible: BookingSeriesVisibility;
}) {
  const c = useOrganizerCopy();
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  if (!visible.createdBookings && !visible.paidBookings) return null;
  return (
    <div className='min-w-[155px] max-w-[200px] space-y-1.5 rounded-lg border border-border/80 bg-popover/95 px-2.5 py-2 text-[11px] text-popover-foreground shadow-md backdrop-blur-sm'>
      <p className='border-b border-border/60 pb-1 font-semibold text-foreground'>
        {displayAnalyticsDate(row.date)}
      </p>
      {visible.createdBookings && (
        <div className='flex items-center justify-between gap-3'>
          <span className='flex items-center gap-1.5 text-muted-foreground'>
            <span className='size-2 rounded-full bg-slate-400' />
            {c('New bookings', 'Đơn đặt mới')}
          </span>
          <strong className='tabular-nums'>{row.createdBookings}</strong>
        </div>
      )}
      {visible.paidBookings && (
        <div className='flex items-center justify-between gap-3'>
          <span className='flex items-center gap-1.5 text-muted-foreground'>
            <span className='size-2 rounded-full bg-indigo-500' />
            {c('Paid bookings', 'Đã thanh toán')}
          </span>
          <strong className='text-indigo-600 tabular-nums dark:text-indigo-400'>
            {row.paidBookings}
          </strong>
        </div>
      )}
    </div>
  );
}

export function AnalyticsCharts({
  rows,
  locale
}: {
  rows: ReturnType<typeof chartTrends>;
  locale: string;
}) {
  const c = useOrganizerCopy();
  const gradient = useId().replaceAll(':', '');

  const [cashVisible, setCashVisible] = useState<CashSeriesVisibility>({
    received: true,
    net: true,
    refunded: true
  });

  const [bookingVisible, setBookingVisible] = useState<BookingSeriesVisibility>({
    createdBookings: true,
    paidBookings: true
  });

  function toggleCashSeries(key: keyof CashSeriesVisibility) {
    setCashVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleBookingSeries(key: keyof BookingSeriesVisibility) {
    setBookingVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const totals = useMemo(() => {
    let received = 0;
    let refunded = 0;
    let net = 0;
    let created = 0;
    let paid = 0;
    for (const r of rows) {
      received += r.received;
      refunded += r.refunded;
      net += r.net;
      created += r.createdBookings;
      paid += r.paidBookings;
    }
    return { received, refunded, net, created, paid };
  }, [rows]);

  const cashLegendItems: {
    key: keyof CashSeriesVisibility;
    label: string;
    shortLabel: string;
    total: number;
    dotClass: string;
    pillActiveClass: string;
    textClass: string;
  }[] = [
    {
      key: 'received',
      label: c('Received', 'Đã nhận'),
      shortLabel: c('Received', 'Nhận'),
      total: totals.received,
      dotClass: 'bg-indigo-500',
      pillActiveClass: 'border-indigo-500/30 bg-indigo-500/5',
      textClass: 'text-foreground'
    },
    {
      key: 'net',
      label: c('Net after refunds', 'Thực thu sau hoàn'),
      shortLabel: c('Net', 'Thực thu'),
      total: totals.net,
      dotClass: 'bg-emerald-500',
      pillActiveClass: 'border-emerald-500/30 bg-emerald-500/5',
      textClass: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      key: 'refunded',
      label: c('Refunded', 'Đã hoàn'),
      shortLabel: c('Refunded', 'Hoàn'),
      total: totals.refunded,
      dotClass: 'bg-rose-500',
      pillActiveClass: 'border-rose-500/30 bg-rose-500/5',
      textClass: 'text-rose-600 dark:text-rose-400'
    }
  ];

  const bookingLegendItems: {
    key: keyof BookingSeriesVisibility;
    label: string;
    shortLabel: string;
    total: number;
    dotClass: string;
    pillActiveClass: string;
    textClass: string;
  }[] = [
    {
      key: 'createdBookings',
      label: c('New bookings', 'Đơn đặt mới'),
      shortLabel: c('New', 'Đặt mới'),
      total: totals.created,
      dotClass: 'bg-slate-400',
      pillActiveClass: 'border-border/70 bg-muted/40',
      textClass: 'text-foreground'
    },
    {
      key: 'paidBookings',
      label: c('Paid bookings', 'Đơn đã thanh toán'),
      shortLabel: c('Paid', 'Đã trả'),
      total: totals.paid,
      dotClass: 'bg-indigo-500',
      pillActiveClass: 'border-indigo-500/30 bg-indigo-500/5',
      textClass: 'text-indigo-600 dark:text-indigo-400'
    }
  ];

  return (
    <div className='grid gap-4 xl:grid-cols-[1.45fr_1fr]'>
      <section className={panel} aria-label={c('Cash flow chart', 'Biểu đồ dòng tiền')}>
        <div className='mb-4 flex flex-wrap items-start justify-between gap-2'>
          <div>
            <h2 className='text-base font-semibold'>
              {c('Cash flow over time', 'Biểu đồ dòng tiền theo thời gian')}
            </h2>
            <p className='text-xs text-muted-foreground'>
              {c(
                'Click any legend item or badge to hide/show its line on the chart',
                'Bấm vào từng mục chú thích để ẩn hoặc hiện đường biểu đồ tương ứng'
              )}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-1.5 text-[11px]'>
            {cashLegendItems.map((item) => {
              const active = cashVisible[item.key];
              return (
                <button
                  key={item.key}
                  type='button'
                  aria-pressed={active}
                  title={
                    active
                      ? c(`Click to hide ${item.label}`, `Bấm để ẩn đường ${item.label}`)
                      : c(`Click to show ${item.label}`, `Bấm để hiện đường ${item.label}`)
                  }
                  onClick={() => toggleCashSeries(item.key)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 transition-all select-none ${
                    active
                      ? item.pillActiveClass
                      : 'border-border/40 bg-muted/20 opacity-45 line-through'
                  }`}
                >
                  <span className={`size-2 rounded-full ${item.dotClass}`} />
                  <span className='text-muted-foreground'>{item.shortLabel}:</span>
                  <strong className={`tabular-nums ${item.textClass}`}>
                    {compactMoney(item.total, locale)} ₫
                  </strong>
                </button>
              );
            })}
          </div>
        </div>

        <div className='h-68 sm:h-76'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradient + '-received'} x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#6366f1' stopOpacity={0.22} />
                  <stop offset='100%' stopColor='#6366f1' stopOpacity={0} />
                </linearGradient>
                <linearGradient id={gradient + '-net'} x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#10b981' stopOpacity={0.2} />
                  <stop offset='100%' stopColor='#10b981' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='3 3' />
              <XAxis
                dataKey='date'
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickMargin={10}
                minTickGap={48}
                tickFormatter={displayAnalyticsDate}
              />
              <YAxis
                width={54}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickFormatter={(value: number) => compactMoney(value, locale)}
              />
              <Tooltip content={<CashTooltip locale={locale} visible={cashVisible} />} />
              <ReferenceLine y={0} stroke='var(--border)' />
              <Area
                type='monotone'
                dataKey='received'
                name={c('Received', 'Đã nhận')}
                stroke='#6366f1'
                fill={'url(#' + gradient + '-received)'}
                strokeWidth={2}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
                hide={!cashVisible.received}
              />
              <Area
                type='monotone'
                dataKey='net'
                name={c('Net after refunds', 'Thực thu sau hoàn')}
                stroke='#10b981'
                fill={'url(#' + gradient + '-net)'}
                strokeWidth={2}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
                hide={!cashVisible.net}
              />
              <Area
                type='monotone'
                dataKey='refunded'
                name={c('Refunded', 'Đã hoàn')}
                stroke='#f43f5e'
                fill='none'
                strokeDasharray='4 3'
                strokeWidth={1.75}
                activeDot={{ r: 3.5 }}
                isAnimationActive={false}
                hide={!cashVisible.refunded}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Interactive Legend Footer */}
        <div
          className='mt-3 flex flex-wrap items-center justify-center gap-3 border-t border-border/50 pt-3 text-xs'
          role='group'
          aria-label={c('Toggle chart lines', 'Ẩn hoặc hiện các đường trên biểu đồ')}
        >
          {cashLegendItems.map((item) => {
            const active = cashVisible[item.key];
            return (
              <button
                key={item.key}
                type='button'
                aria-pressed={active}
                onClick={() => toggleCashSeries(item.key)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all select-none ${
                  active
                    ? 'border-border/80 bg-background text-foreground shadow-2xs hover:bg-muted/40'
                    : 'border-transparent bg-muted/30 text-muted-foreground opacity-50 line-through hover:opacity-75'
                }`}
              >
                <span className={`size-2 rounded-full ${item.dotClass}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={panel} aria-label={c('Booking volume chart', 'Biểu đồ lượt đặt')}>
        <div className='mb-4 flex flex-wrap items-start justify-between gap-2'>
          <div>
            <h2 className='text-base font-semibold'>
              {c('Booking volume', 'Lượt đặt theo thời gian')}
            </h2>
            <p className='text-xs text-muted-foreground'>
              {c(
                'Created vs first-time paid bookings',
                'Đơn đặt mới và đơn đã thanh toán trong kỳ'
              )}
            </p>
          </div>
          <div className='flex items-center gap-1.5 text-[11px]'>
            {bookingLegendItems.map((item) => {
              const active = bookingVisible[item.key];
              return (
                <button
                  key={item.key}
                  type='button'
                  aria-pressed={active}
                  onClick={() => toggleBookingSeries(item.key)}
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 transition-all select-none ${
                    active
                      ? item.pillActiveClass
                      : 'border-border/40 bg-muted/20 opacity-45 line-through'
                  }`}
                >
                  <span className={`size-2 rounded-full ${item.dotClass}`} />
                  <span className='text-muted-foreground'>{item.shortLabel}:</span>
                  <strong className={`tabular-nums ${item.textClass}`}>{item.total}</strong>
                </button>
              );
            })}
          </div>
        </div>

        <div className='h-68 sm:h-76'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={rows} barGap={3} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='3 3' />
              <XAxis
                dataKey='date'
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickMargin={10}
                minTickGap={48}
                tickFormatter={displayAnalyticsDate}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                width={32}
              />
              <Tooltip
                content={<BookingTooltip visible={bookingVisible} />}
                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
              />
              <Bar
                dataKey='createdBookings'
                name={c('New bookings', 'Đơn đặt mới')}
                fill='#94a3b8'
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
                isAnimationActive={false}
                hide={!bookingVisible.createdBookings}
              />
              <Bar
                dataKey='paidBookings'
                name={c('Paid bookings', 'Đơn đã thanh toán')}
                fill='#6366f1'
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
                isAnimationActive={false}
                hide={!bookingVisible.paidBookings}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Interactive Legend Footer */}
        <div
          className='mt-3 flex flex-wrap items-center justify-center gap-3 border-t border-border/50 pt-3 text-xs'
          role='group'
          aria-label={c('Toggle booking bars', 'Ẩn hoặc hiện cột lượt đặt')}
        >
          {bookingLegendItems.map((item) => {
            const active = bookingVisible[item.key];
            return (
              <button
                key={item.key}
                type='button'
                aria-pressed={active}
                onClick={() => toggleBookingSeries(item.key)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all select-none ${
                  active
                    ? 'border-border/80 bg-background text-foreground shadow-2xs hover:bg-muted/40'
                    : 'border-transparent bg-muted/30 text-muted-foreground opacity-50 line-through hover:opacity-75'
                }`}
              >
                <span className={`size-2 rounded-full ${item.dotClass}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function AnalyticsRankings({
  report,
  onWorkspace
}: {
  report: AnalyticsReport;
  onWorkspace: (id: number) => void;
}) {
  const c = useOrganizerCopy();
  const locale = c('en-US', 'vi-VN');
  const [dimension, setDimension] = useState<'workspaces' | 'resourceTypes' | 'resources'>(
    'workspaces'
  );
  const [sort, setSort] = useState<'netAmount' | 'paidBookings' | 'receivedAmount'>('netAmount');
  const [direction, setDirection] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const matching = report[dimension].filter((row) =>
    row.name.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale))
  );
  // filter creates a new array; ES2022 does not include toSorted.
  // eslint-disable-next-line unicorn/no-array-sort
  const sorted = matching.sort((a, b) => {
    const x = sort === 'paidBookings' ? BigInt(a[sort]) : cents(a[sort]);
    const y = sort === 'paidBookings' ? BigInt(b[sort]) : cents(b[sort]);
    return (x === y ? a.id - b.id : x > y ? -1 : 1) * (direction === 'desc' ? 1 : -1);
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / 10));
  const activePage = Math.min(page, totalPages);
  const shown = sorted.slice((activePage - 1) * 10, activePage * 10);

  return (
    <section className={panel}>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-base font-semibold'>
            {c('Revenue ranking by workspace & resource', 'Xếp hạng doanh thu theo không gian & chỗ')}
          </h2>
          <p className='text-xs text-muted-foreground'>
            {c(
              'Ranked by cash after refunds (pre-fee) by default.',
              'Mặc định xếp theo thực thu sau hoàn (chưa trừ phí nền tảng).'
            )}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5 text-xs'>
            {(
              [
                ['workspaces', c('Workspaces', 'Không gian')],
                ['resourceTypes', c('Types', 'Loại chỗ')],
                ['resources', c('Units', 'Ghế/Phòng')]
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type='button'
                onClick={() => {
                  setDimension(key);
                  setPage(1);
                  setSearch('');
                }}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  dimension === key
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type='search'
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label={c('Search rankings', 'Tìm trong xếp hạng')}
            placeholder={c('Search by name…', 'Tìm theo tên…')}
            className='h-8 min-w-0 rounded-lg border bg-background px-2.5 text-xs focus-visible:outline-2 focus-visible:outline-primary'
          />
          <select
            aria-label={c('Sort by', 'Sắp xếp theo')}
            className='h-8 rounded-lg border bg-background px-2 text-xs'
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as typeof sort);
              setPage(1);
            }}
          >
            <option value='netAmount'>{c('Net after refunds', 'Thực thu sau hoàn')}</option>
            <option value='receivedAmount'>{c('Cash received', 'Tiền đã nhận')}</option>
            <option value='paidBookings'>{c('Paid bookings', 'Đơn đã thanh toán')}</option>
          </select>
          <button
            type='button'
            className='h-8 rounded-lg border bg-background px-2.5 text-xs hover:bg-muted'
            aria-label={c('Reverse sort order', 'Đảo thứ tự sắp xếp')}
            onClick={() => {
              setDirection(direction === 'desc' ? 'asc' : 'desc');
              setPage(1);
            }}
          >
            {direction === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full text-left text-sm'>
          <thead className='border-y bg-muted/40 text-xs text-muted-foreground [&_th]:font-medium'>
            <tr>
              <th className='w-12 p-2.5'>#</th>
              <th className='p-2.5'>{c('Name', 'Tên không gian / chỗ')}</th>
              <th className='p-2.5 text-right'>{c('Paid bookings', 'Đơn đã trả')}</th>
              <th className='p-2.5 text-right'>{c('Received', 'Đã nhận')}</th>
              <th className='p-2.5 text-right'>{c('Refunded', 'Đã hoàn')}</th>
              <th className='p-2.5 text-right'>{c('Net cash', 'Thực thu sau hoàn')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r: Ranking, index) => (
              <tr
                key={r.id}
                className='border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30'
              >
                <td className='p-2.5'>
                  <span
                    className={
                      'inline-flex size-6 items-center justify-center rounded-md text-xs font-semibold ' +
                      (activePage === 1 && index < 3
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground')
                    }
                  >
                    {(activePage - 1) * 10 + index + 1}
                  </span>
                </td>
                <td className='p-2.5 font-medium'>
                  {dimension === 'workspaces' ? (
                    <button
                      type='button'
                      className='text-left text-primary hover:underline'
                      title={c('View bookings for this workspace', 'Xem đặt chỗ của không gian này')}
                      onClick={() => onWorkspace(r.id)}
                    >
                      {r.name}
                    </button>
                  ) : (
                    r.name
                  )}
                </td>
                <td className='p-2.5 text-right tabular-nums'>{r.paidBookings}</td>
                <td className='whitespace-nowrap p-2.5 text-right tabular-nums'>
                  {money(r.receivedAmount, locale)}
                </td>
                <td className='whitespace-nowrap p-2.5 text-right text-rose-600 tabular-nums dark:text-rose-400'>
                  {r.refundedAmount !== '0.00' && r.refundedAmount !== '0'
                    ? `−${money(r.refundedAmount, locale)}`
                    : money(r.refundedAmount, locale)}
                </td>
                <td className='whitespace-nowrap p-2.5 text-right font-semibold text-emerald-600 tabular-nums dark:text-emerald-400'>
                  {money(r.netAmount, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!sorted.length && (
        <p className='py-8 text-center text-sm text-muted-foreground'>
          {c(
            'No results for this period and search.',
            'Không có kết quả phù hợp kỳ và từ khóa đã chọn.'
          )}
        </p>
      )}
      {sorted.length > 10 && (
        <div className='mt-3 flex items-center justify-end gap-2 text-xs'>
          <button
            type='button'
            disabled={activePage === 1}
            className='rounded-md border px-2.5 py-1 hover:bg-muted disabled:opacity-40'
            onClick={() => setPage(activePage - 1)}
          >
            ←
          </button>
          <span className='tabular-nums'>
            {activePage} / {totalPages}
          </span>
          <button
            type='button'
            disabled={activePage === totalPages}
            className='rounded-md border px-2.5 py-1 hover:bg-muted disabled:opacity-40'
            onClick={() => setPage(activePage + 1)}
          >
            →
          </button>
        </div>
      )}
    </section>
  );
}

export function BookingBreakdown({ report }: { report: AnalyticsReport }) {
  const c = useOrganizerCopy();
  const labels: Record<string, string> = {
    PENDING_APPROVAL: c('Pending approval', 'Chờ duyệt'),
    PENDING_PAYMENT: c('Pending payment', 'Chờ thanh toán'),
    CONFIRMED: c('Confirmed', 'Đã xác nhận'),
    CHECKED_IN: c('Checked in', 'Đã đến'),
    COMPLETED: c('Completed', 'Hoàn tất'),
    CANCELLED: c('Cancelled', 'Đã hủy'),
    EXPIRED: c('Expired', 'Hết hạn'),
    NO_SHOW: c('No-show', 'Không đến')
  };
  const rows = Object.entries(labels).map(([status, name]) => ({
    status,
    name,
    count: report.statuses.find((s) => s.status === status)?.count ?? 0
  }));
  const max = Math.max(1, ...report.heatmap.map((h) => Number(h.bookedHours)));
  return (
    <div className='grid gap-4 xl:grid-cols-2'>
      <section className={panel}>
        <h2 className='text-base font-semibold'>
          {c('Current booking statuses', 'Phân bổ trạng thái đơn đặt')}
        </h2>
        <p className='mb-4 text-xs text-muted-foreground'>
          {c(
            'Current status of bookings created in the selected period.',
            'Trạng thái hiện tại của các đơn được tạo trong kỳ đã chọn.'
          )}
        </p>
        <div className='space-y-2.5'>
          {rows.map((row) => {
            const pct = report.current.createdBookings
              ? Math.round((row.count / report.current.createdBookings) * 100)
              : 0;
            return (
              <div
                key={row.name}
                className='grid grid-cols-[120px_1fr_68px] items-center gap-3 text-xs'
              >
                <span className='truncate text-muted-foreground'>{row.name}</span>
                <span className='h-2 overflow-hidden rounded-full bg-muted'>
                  <span
                    className={`block h-full rounded-full ${
                      ['CANCELLED', 'NO_SHOW'].includes(row.status)
                        ? 'bg-rose-500'
                        : ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(row.status)
                          ? 'bg-emerald-500'
                          : row.status === 'EXPIRED'
                            ? 'bg-slate-400'
                            : 'bg-amber-500'
                    }`}
                    style={{
                      width: `${
                        report.current.createdBookings
                          ? (row.count / report.current.createdBookings) * 100
                          : 0
                      }%`
                    }}
                  />
                </span>
                <span className='text-right font-medium tabular-nums'>
                  {row.count}{' '}
                  <span className='text-[10px] font-normal text-muted-foreground'>({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
        <div className='mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground'>
          <span>{c('Returning paying customers', 'Khách quay lại từ kỳ trước')}</span>
          <strong className='text-foreground tabular-nums'>
            {report.current.returningCustomers} / {report.current.payingCustomers}
          </strong>
        </div>
      </section>
      <section className={panel}>
        <h2 className='text-base font-semibold'>
          {c('Reserved hours by weekday', 'Mật độ giờ đặt theo thứ & khung giờ')}
        </h2>
        <p className='mb-4 text-xs text-muted-foreground'>
          {c(
            'Accumulated resource-hours across the 24-hour day.',
            'Tổng số giờ chỗ được đặt theo từng khung giờ trong tuần.'
          )}
        </p>
        <div className='overflow-x-auto'>
          <div className='min-w-[460px] space-y-1'>
            <div className='grid grid-cols-[44px_repeat(24,1fr)] gap-1 text-center text-[9px] text-muted-foreground'>
              <span />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
            {Array.from({ length: 7 }, (_, day) => (
              <div key={day} className='grid grid-cols-[44px_repeat(24,1fr)] items-center gap-1'>
                <span className='text-[10px] text-muted-foreground'>
                  {day === 6
                    ? c('Sun', 'CN')
                    : c(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day], `Thứ ${day + 2}`)}
                </span>
                {Array.from({ length: 24 }, (_, hour) => {
                  const hours =
                    report.heatmap.find((h) => h.dayOfWeek === day + 1 && h.hour === hour)
                      ?.bookedHours ?? '0';
                  return (
                    <div
                      key={hour}
                      role='img'
                      aria-label={`${day + 1}, ${hour}:00: ${hours} ${c('hours', 'giờ')}`}
                      title={`${hour}:00 · ${hours} ${c('resource-hours', 'giờ chỗ')}`}
                      className='h-5 rounded-xs bg-primary transition-transform hover:scale-110'
                      style={{ opacity: Number(hours) ? 0.2 + (Number(hours) / max) * 0.8 : 0.07 }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div
          className='mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground'
          aria-hidden='true'
        >
          <span className='mr-1'>{c('Less', 'Ít')}</span>
          {[0.07, 0.25, 0.5, 0.75, 1].map((opacity) => (
            <span key={opacity} className='size-2.5 rounded-xs bg-primary' style={{ opacity }} />
          ))}
          <span className='ml-1'>{c('More', 'Nhiều')}</span>
        </div>
      </section>
    </div>
  );
}
