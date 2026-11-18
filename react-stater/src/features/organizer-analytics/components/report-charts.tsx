import { useId, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import type { AnalyticsReport, Ranking, Trend } from '../api';
import { cents, money, type chartTrends } from '../format';

const panel = 'min-w-0 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5';

function CashTooltip({
  active,
  payload,
  locale
}: {
  active?: boolean;
  payload?: { payload?: Trend }[];
  locale: string;
}) {
  const c = useOrganizerCopy();
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className='space-y-1 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-md'>
      <p>{row.date}</p>
      <p>
        {c('Received', 'Đã nhận')}: {money(row.receivedAmount, locale)}
      </p>
      <p>
        {c('Refunded', 'Đã hoàn')}: {money(row.refundedAmount, locale)}
      </p>
      <p>
        {c('After refunds', 'Sau hoàn')}: {money(row.netAmount, locale)}
      </p>
    </div>
  );
}
function BookingTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: { payload?: Trend }[];
}) {
  const c = useOrganizerCopy();
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className='space-y-2 rounded-xl border bg-popover p-3 text-xs text-popover-foreground shadow-lg'>
      <p className='border-b pb-2 font-medium'>{row.date}</p>
      <p>
        {c('Created', 'Phát sinh')}: <strong>{row.createdBookings}</strong>
      </p>
      <p>
        {c('First paid', 'Thanh toán lần đầu')}: <strong>{row.paidBookings}</strong>
      </p>
      <p className='max-w-52 text-[10px] text-muted-foreground'>
        {c(
          'Different date cohorts; this is not a conversion rate.',
          'Hai nhóm theo ngày khác nhau; không phải tỷ lệ chuyển đổi.'
        )}
      </p>
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
  return (
    <div className='grid gap-4 xl:grid-cols-[1.4fr_1fr]'>
      <section className={panel} aria-label={c('Cash flow chart', 'Biểu đồ dòng tiền')}>
        <h2 className='font-semibold'>{c('Cash flow over time', 'Dòng tiền theo thời gian')}</h2>
        <p className='mb-4 text-xs text-muted-foreground'>
          {c(
            'VND · payment and processed refund dates',
            'VND · theo ngày thanh toán và xử lý hoàn'
          )}
        </p>
        <div className='h-72 sm:h-80'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={gradient + '-received'} x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#6366f1' stopOpacity={0.25} />
                  <stop offset='100%' stopColor='#6366f1' stopOpacity={0} />
                </linearGradient>
                <linearGradient id={gradient + '-net'} x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='#10b981' stopOpacity={0.2} />
                  <stop offset='100%' stopColor='#10b981' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='4 4' />
              <XAxis
                dataKey='date'
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickMargin={12}
                minTickGap={28}
                tickFormatter={(value: string) => value.slice(5).replace('-', '/')}
              />
              <YAxis
                width={65}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat(locale, { notation: 'compact' }).format(value)
                }
              />
              <Tooltip content={<CashTooltip locale={locale} />} />
              <ReferenceLine y={0} stroke='var(--border)' />
              <Legend
                iconType='circle'
                iconSize={7}
                wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
              />
              <Area
                type='linear'
                dataKey='received'
                name={c('Received', 'Đã nhận')}
                stroke='#6366f1'
                fill={'url(#' + gradient + '-received)'}
                strokeWidth={2.5}
                isAnimationActive={false}
              />
              <Area
                type='linear'
                dataKey='net'
                name={c('After refunds', 'Sau hoàn')}
                stroke='#10b981'
                fill={'url(#' + gradient + '-net)'}
                strokeWidth={2.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className={panel} aria-label={c('Booking volume chart', 'Biểu đồ lượt đặt')}>
        <h2 className='font-semibold'>{c('Booking volume', 'Lượt đặt theo thời gian')}</h2>
        <p className='mb-4 text-xs text-muted-foreground'>
          {c(
            'Created bookings vs bookings paid for the first time',
            'Lượt tạo mới và lượt thanh toán lần đầu'
          )}
        </p>
        <div className='h-72 sm:h-80'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={rows} barGap={3} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke='var(--border)' strokeDasharray='4 4' />
              <XAxis
                dataKey='date'
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickMargin={12}
                minTickGap={28}
                tickFormatter={(value: string) => value.slice(5).replace('-', '/')}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                width={32}
              />
              <Tooltip
                content={<BookingTooltip />}
                cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              />
              <Legend
                iconType='circle'
                iconSize={7}
                wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
              />
              <Bar
                dataKey='createdBookings'
                name={c('Created', 'Phát sinh')}
                fill='#94a3b8'
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
              <Bar
                dataKey='paidBookings'
                name={c('First paid', 'Đã thanh toán')}
                fill='#6366f1'
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
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
          <h2 className='font-semibold'>{c('Rental ranking', 'Xếp hạng cho thuê')}</h2>
          <p className='text-xs text-muted-foreground'>
            {c(
              'Cash after refunds is the default ranking criterion.',
              'Mặc định xếp theo tiền thu sau hoàn.'
            )}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <input
            type='search'
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label={c('Search rankings', 'Tìm trong xếp hạng')}
            placeholder={c('Search by name…', 'Tìm theo tên…')}
            className='h-9 min-w-0 rounded-lg border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary'
          />
          <select
            aria-label={c('Ranking dimension', 'Nhóm xếp hạng')}
            className='h-9 rounded-lg border bg-background px-2 text-sm'
            value={dimension}
            onChange={(e) => {
              setDimension(e.target.value as typeof dimension);
              setPage(1);
              setSearch('');
            }}
          >
            <option value='workspaces'>{c('Workspaces', 'Không gian')}</option>
            <option value='resourceTypes'>{c('Resource types', 'Loại chỗ')}</option>
            <option value='resources'>{c('Individual resources', 'Từng ghế/phòng')}</option>
          </select>
          <select
            aria-label={c('Sort by', 'Sắp xếp theo')}
            className='h-9 rounded-lg border bg-background px-2 text-sm'
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as typeof sort);
              setPage(1);
            }}
          >
            <option value='netAmount'>{c('Cash after refunds', 'Tiền thu sau hoàn')}</option>
            <option value='receivedAmount'>{c('Cash received', 'Tiền đã nhận')}</option>
            <option value='paidBookings'>{c('Paid bookings', 'Lượt đã thanh toán')}</option>
          </select>
          <button
            className='rounded-lg border px-3 text-sm'
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
              <th className='p-3'>#</th>
              <th className='p-3'>{c('Name', 'Tên')}</th>
              <th className='p-3 text-right'>{c('Paid bookings', 'Lượt đã trả')}</th>
              <th className='p-3 text-right'>{c('Received', 'Đã nhận')}</th>
              <th className='p-3 text-right'>{c('Refunded', 'Đã hoàn')}</th>
              <th className='p-3 text-right'>{c('After refunds', 'Sau hoàn')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r: Ranking, index) => (
              <tr
                key={r.id}
                className='border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30'
              >
                <td className='p-3'>
                  <span
                    className={
                      'inline-flex size-7 items-center justify-center rounded-lg text-xs font-semibold ' +
                      (activePage === 1 && index < 3
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground')
                    }
                  >
                    {(activePage - 1) * 10 + index + 1}
                  </span>
                </td>
                <td className='p-3 font-medium'>
                  {dimension === 'workspaces' ? (
                    <button
                      className='text-left text-primary hover:underline'
                      onClick={() => onWorkspace(r.id)}
                    >
                      {r.name}
                    </button>
                  ) : (
                    r.name
                  )}
                </td>
                <td className='p-3 text-right tabular-nums'>{r.paidBookings}</td>
                <td className='whitespace-nowrap p-3 text-right tabular-nums'>
                  {money(r.receivedAmount, locale)}
                </td>
                <td className='whitespace-nowrap p-3 text-right tabular-nums'>
                  {money(r.refundedAmount, locale)}
                </td>
                <td className='whitespace-nowrap p-3 text-right font-semibold tabular-nums'>
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
        <div className='mt-3 flex items-center justify-end gap-3 text-sm'>
          <button
            disabled={activePage === 1}
            className='rounded-md border px-3 py-1.5 hover:bg-muted disabled:opacity-40'
            onClick={() => setPage(activePage - 1)}
          >
            ←
          </button>
          {activePage}/{totalPages}
          <button
            disabled={activePage === totalPages}
            className='disabled:opacity-40'
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
        <h2 className='font-semibold'>
          {c('Current booking statuses', 'Trạng thái đặt chỗ hiện tại')}
        </h2>
        <p className='mb-4 text-xs text-muted-foreground'>
          {c(
            'Only bookings created in the selected period; not status-change events.',
            'Các đơn tạo trong kỳ; không phải số lần chuyển trạng thái trong kỳ.'
          )}
        </p>
        <div className='space-y-3'>
          {rows.map((row) => (
            <div
              key={row.name}
              className='grid grid-cols-[130px_1fr_40px] items-center gap-3 text-xs'
            >
              <span>{row.name}</span>
              <span className='h-2 overflow-hidden rounded-full bg-muted'>
                <span
                  className={`block h-full rounded-full ${['CANCELLED', 'NO_SHOW'].includes(row.status) ? 'bg-rose-500' : ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(row.status) ? 'bg-emerald-500' : row.status === 'EXPIRED' ? 'bg-slate-400' : 'bg-amber-500'}`}
                  style={{
                    width: `${report.current.createdBookings ? (row.count / report.current.createdBookings) * 100 : 0}%`
                  }}
                />
              </span>
              <span className='text-right tabular-nums'>{row.count}</span>
            </div>
          ))}
        </div>
        <div className='mt-5 border-t pt-3 text-sm'>
          {c('Returning customers from earlier periods', 'Khách đã từng trả tiền trước kỳ này')}:{' '}
          <strong>{report.current.returningCustomers}</strong> / {report.current.payingCustomers}
        </div>
      </section>
      <section className={panel}>
        <h2 className='font-semibold'>{c('Reserved hours by weekday', 'Giờ được đặt theo thứ')}</h2>
        <p className='mb-4 text-xs text-muted-foreground'>
          {c(
            'Accumulated resource-hours; not occupancy %. Includes future reservations.',
            'Tổng giờ chỗ được đặt; không phải % công suất. Gồm lịch đặt tương lai.'
          )}
        </p>
        <div className='overflow-x-auto'>
          <div className='min-w-[480px] space-y-1'>
            <div className='grid grid-cols-[48px_repeat(24,1fr)] gap-1 text-center text-[9px] text-muted-foreground'>
              <span />
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
            {Array.from({ length: 7 }, (_, day) => (
              <div key={day} className='grid grid-cols-[48px_repeat(24,1fr)] items-center gap-1'>
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
                      className='h-5 rounded-sm bg-primary'
                      style={{ opacity: Number(hours) ? 0.2 + (Number(hours) / max) * 0.8 : 0.07 }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div
          className='mt-4 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground'
          aria-hidden='true'
        >
          <span className='mr-1'>{c('Less', 'Ít')}</span>
          {[0.07, 0.25, 0.5, 0.75, 1].map((opacity) => (
            <span key={opacity} className='size-3 rounded-sm bg-primary' style={{ opacity }} />
          ))}
          <span className='ml-1'>{c('More', 'Nhiều')}</span>
        </div>
        <p className='mt-3 text-xs text-muted-foreground'>
          {c(
            'Darker = more booked hours. Hours are clipped to the selected date range.',
            'Màu đậm hơn = nhiều giờ được đặt hơn. Chỉ tính phần thời gian nằm trong kỳ đã chọn.'
          )}
        </p>
      </section>
    </div>
  );
}
