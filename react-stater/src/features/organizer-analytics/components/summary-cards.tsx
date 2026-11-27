import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Clock3,
  Info,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet
} from '@/components/ui/hugeicons';
import type { AnalyticsSummary, OrganizerEarnings } from '../api';
import { change, money } from '../format';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';

export function SummaryCards({
  current,
  earnings,
  previousEarnings,
  comparisonLabel,
  onMoney,
  onCharts
}: {
  current: AnalyticsSummary;
  earnings?: OrganizerEarnings;
  previousEarnings?: OrganizerEarnings;
  comparisonLabel?: string;
  onMoney: (kind: string) => void;
  onCharts?: () => void;
}) {
  const c = useOrganizerCopy();
  const locale = c('en-US', 'vi-VN');

  const cards = [
    {
      key: 'organizerAmount',
      label: c('Your net earnings (incl. VAT)', 'Tổng tiền bạn được hưởng'),
      description: c('Net rental + net VAT · after fees', 'Tiền thuê sau phí + VAT còn lại'),
      icon: Wallet,
      tone: 'text-primary bg-primary/10 ring-1 ring-primary/20',
      highlight: true,
      help: c(
        'Total net earnings allocated to your balance: 90% pre-VAT rental + 90% VAT after 10% platform fee and fee VAT deduction.',
        'Tổng tiền chuyển vào ví của bạn: 90% tiền thuê gốc + 90% VAT còn lại sau khi trừ 10% phí nền tảng và 8% VAT của phí sàn.'
      )
    },
    {
      key: 'rentalEarningsAmount',
      label: c('Net rental income', 'Tiền thuê sau khi trừ phí'),
      description: c('90% pre-VAT rental · after refunds', '90% tiền thuê gốc · chưa gồm VAT'),
      icon: CalendarCheck,
      tone: 'text-emerald-600 bg-emerald-500/10 ring-1 ring-emerald-500/20 dark:text-emerald-400',
      highlight: false,
      help: c(
        'Your pre-VAT rental earnings after deducting 10% platform commission.',
        'Doanh thu tiền thuê trước thuế thuần sau khi trừ 10% phí hoa hồng sàn.'
      )
    },
    {
      key: 'vatAmount',
      label: c('Net VAT retained', 'VAT còn lại sau khấu trừ'),
      description: c('90% tax portion · for tax filing', '90% VAT còn lại · để kê khai nộp thuế'),
      icon: Receipt,
      tone: 'text-sky-600 bg-sky-500/10 ring-1 ring-sky-500/20 dark:text-sky-400',
      highlight: false,
      help: c(
        'Retained 90% VAT allocated to you for tax declaration (after deducting 10% input fee VAT).',
        'Phần 90% VAT khách trả bàn giao cho bạn để kê khai nộp thuế (sau khi khấu trừ 10% VAT đầu vào của phí sàn).'
      )
    },
    {
      key: 'platformFeeAmount',
      label: c('Platform fee (incl. VAT)', 'Phí nền tảng (gồm VAT)'),
      description: c('10% commission + 8% fee VAT', '10% hoa hồng + 8% VAT phí sàn'),
      icon: Receipt,
      tone: 'text-amber-600 bg-amber-500/10 ring-1 ring-amber-500/20 dark:text-amber-400',
      highlight: false,
      help: c(
        'Total platform take-rate retained: 10% base fee on rental plus 8% statutory fee VAT.',
        'Tổng phí nền tảng giữ lại: 10% phí dịch vụ trên tiền thuê gốc cộng 8% VAT của phí sàn theo luật thuế.'
      )
    }
  ] as const;

  const operationalMetrics = [
    {
      label: c('Paid bookings', 'Đơn đã thanh toán'),
      value: current.paidBookings.toLocaleString(locale),
      unit: c(current.paidBookings === 1 ? 'booking' : 'bookings', 'đơn'),
      sub: `${c('Avg', 'TB')}: ${money(current.averagePaidBookingValue, locale)}`,
      icon: CalendarCheck,
      tone: 'text-indigo-600 bg-indigo-500/10 dark:text-indigo-400'
    },
    {
      label: c('New bookings', 'Đơn đặt mới'),
      value: current.createdBookings.toLocaleString(locale),
      unit: c(current.createdBookings === 1 ? 'booking' : 'bookings', 'đơn'),
      sub: `${current.completedBookings} ${c('completed', 'hoàn tất')} · ${current.cancelledBookings} ${c('cancelled', 'đã hủy')}`,
      icon: CalendarCheck,
      tone: 'text-slate-600 bg-slate-500/10 dark:text-slate-400'
    },
    {
      label: c('Paying customers', 'Khách đã thanh toán'),
      value: current.payingCustomers.toLocaleString(locale),
      unit: c(current.payingCustomers === 1 ? 'person' : 'people', 'người'),
      sub: `${current.returningCustomers.toLocaleString(locale)} ${c('returning', 'khách quay lại')}`,
      icon: Users,
      tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400'
    },
    {
      label: c('Booked resource-hours', 'Giờ chỗ được đặt'),
      value: Number(current.bookedHours).toLocaleString(locale, { maximumFractionDigits: 1 }),
      unit: c(Number(current.bookedHours) === 1 ? 'hour' : 'hours', 'giờ'),
      sub: c('Active reservations in period', 'Tổng thời lượng đặt trong kỳ'),
      icon: Clock3,
      tone: 'text-sky-600 bg-sky-500/10 dark:text-sky-400'
    }
  ];

  return (
    <section
      aria-label={c('Key business metrics', 'Chỉ số kinh doanh chính')}
      className='space-y-3.5'
    >
      {/* Visual Cash Flow Strip: Customer Cash -> Refunds -> Net -> Fee -> Organizer Earnings */}
      <div className='rounded-2xl border border-border/70 bg-card/90 p-3.5 shadow-sm sm:p-4'>
        <div className='mb-2.5 flex flex-wrap items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <span className='inline-block size-2 rounded-full bg-primary' />
            <h2 className='text-xs font-semibold tracking-wider text-muted-foreground uppercase'>
              {c('Cash flow summary in period', 'Bức tranh dòng tiền trong kỳ')}
            </h2>
          </div>
          <div className='flex items-center gap-2'>
            {onCharts && (
              <button
                type='button'
                onClick={onCharts}
                className='inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
              >
                <BarChart3 className='size-3.5' />
                {c('View charts', 'Xem biểu đồ')}
              </button>
            )}
            <button
              type='button'
              onClick={() => onMoney('')}
              className='inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10'
            >
              {c('View transaction ledger', 'Xem sổ cái giao dịch')}
              <ArrowRight className='size-3.5' />
            </button>
          </div>
        </div>

        <div className='grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4'>
          <button
            type='button'
            onClick={() => onMoney('PAYMENT')}
            className='group flex cursor-pointer flex-col justify-between rounded-xl border border-border/60 bg-background/60 p-3 text-left transition-all hover:border-indigo-500/40 hover:bg-indigo-500/5'
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='text-xs font-medium text-muted-foreground'>
                {c('1. Customer payments', '1. Tổng thu từ khách')}
              </span>
              <span className='rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400'>
                {current.receiptCount} {c('txns', 'GD')}
              </span>
            </div>
            <p className='mt-1.5 text-base font-bold tracking-tight text-foreground tabular-nums sm:text-lg'>
              {money(current.receivedAmount, locale)}
            </p>
          </button>

          <button
            type='button'
            onClick={() => onMoney('REFUND')}
            className='group flex cursor-pointer flex-col justify-between rounded-xl border border-border/60 bg-background/60 p-3 text-left transition-all hover:border-rose-500/40 hover:bg-rose-500/5'
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='text-xs font-medium text-muted-foreground'>
                {c('2. Refunds processed', '2. Đã hoàn trả khách')}
              </span>
              <span className='rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400'>
                {current.refundCount} {c('txns', 'GD')}
              </span>
            </div>
            <p className='mt-1.5 text-base font-bold tracking-tight text-rose-600 tabular-nums sm:text-lg dark:text-rose-400'>
              −{money(current.refundedAmount, locale)}
            </p>
          </button>

          <button
            type='button'
            onClick={onCharts}
            className='group flex cursor-pointer flex-col justify-between rounded-xl border border-border/60 bg-background/60 p-3 text-left transition-all hover:border-emerald-500/40 hover:bg-emerald-500/5'
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='text-xs font-medium text-muted-foreground'>
                {c('3. Net cash (before fee)', '3. Thực thu sau hoàn')}
              </span>
              <span className='rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400'>
                {c('Pre-fee', 'Trước phí')}
              </span>
            </div>
            <p className='mt-1.5 text-base font-bold tracking-tight text-emerald-600 tabular-nums sm:text-lg dark:text-emerald-400'>
              {money(current.netAmount, locale)}
            </p>
          </button>

          <button
            type='button'
            onClick={onCharts}
            className='group flex cursor-pointer flex-col justify-between rounded-xl border border-primary/25 bg-primary/5 p-3 text-left transition-all hover:border-primary/50 hover:bg-primary/10'
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='text-xs font-medium text-primary'>
                {c('4. Net organizer share', '4. Thực hưởng sau phí')}
              </span>
              <span className='rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary'>
                {c('Incl. VAT', 'Gồm VAT')}
              </span>
            </div>
            <p className='mt-1.5 text-base font-bold tracking-tight text-primary tabular-nums sm:text-lg'>
              {money(earnings?.organizerAmount ?? '0', locale)}
            </p>
          </button>
        </div>
      </div>

      {/* 4 Organizer Earnings Cards */}
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        {cards.map((card) => {
          const value = earnings?.[card.key];
          const oldValue = previousEarnings?.[card.key];
          const comparison = value != null && oldValue != null ? change(value, oldValue) : null;
          const isNegative = comparison?.startsWith('−') ?? false;
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className={`relative flex flex-col justify-between rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
                card.highlight
                  ? 'border-primary/30 bg-gradient-to-br from-primary/[0.07] via-card to-card'
                  : 'border-border/70 bg-card'
              }`}
            >
              <div>
                <div className='mb-3 flex items-center justify-between gap-2'>
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${card.tone}`}
                  >
                    <Icon className='size-4' />
                  </span>

                  {/* Compact, well-fitted info popover on hover/focus */}
                  <div className='group relative'>
                    <button
                      type='button'
                      aria-label={c('Metric definition', 'Giải thích chỉ số')}
                      className='flex size-6 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary'
                    >
                      <Info className='size-3.5' />
                    </button>
                    <div
                      role='tooltip'
                      className='pointer-events-none invisible absolute top-7 right-0 z-30 w-48 rounded-lg border border-border/80 bg-popover/95 px-2.5 py-2 text-[11px] leading-snug text-popover-foreground opacity-0 shadow-md backdrop-blur-sm transition-all duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100'
                    >
                      {card.help}
                    </div>
                  </div>
                </div>

                <h3 className='text-xs font-medium text-muted-foreground'>{card.label}</h3>
                <p className='mt-1 break-words text-xl font-bold tracking-tight tabular-nums sm:text-2xl'>
                  {money(value ?? '0', locale)}
                </p>
                <p className='mt-0.5 text-[11px] text-muted-foreground/80'>{card.description}</p>
              </div>

              <div className='mt-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5'>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                    !comparison
                      ? 'bg-muted text-muted-foreground'
                      : card.key === 'platformFeeAmount'
                        ? 'bg-muted text-foreground'
                        : isNegative
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {comparison &&
                    card.key !== 'platformFeeAmount' &&
                    (isNegative ? (
                      <TrendingDown className='size-3' />
                    ) : (
                      <TrendingUp className='size-3' />
                    ))}
                  {comparison ?? '—'}
                </span>
                <span className='truncate text-[11px] text-muted-foreground'>
                  {comparisonLabel
                    ? `${c('vs', 'so với')} ${comparisonLabel}`
                    : c('vs prev. period', 'so với kỳ trước')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4 Operational KPI Cards */}
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        {operationalMetrics.map(({ label, value, unit, sub, icon: Icon, tone }) => (
          <div
            key={label}
            className='flex items-center gap-3.5 rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm'
          >
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon className='size-4' />
            </span>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-xs text-muted-foreground'>{label}</p>
              <p className='mt-0.5 text-lg font-bold tracking-tight tabular-nums'>
                {value}{' '}
                <span className='text-xs font-normal text-muted-foreground'>{unit}</span>
              </p>
              <p className='truncate text-[11px] text-muted-foreground/80'>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {earnings?.unallocatedAmount != null && earnings.unallocatedAmount !== '0.00' && (
        <p className='rounded-xl border border-amber-500/30 bg-amber-500/5 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-400'>
          {c(
            'Cash movement outside organizer allocation: ',
            'Tiền khách chưa tính vào phần bạn được nhận: '
          )}
          <strong className='tabular-nums'>{money(earnings.unallocatedAmount, locale)}</strong>.{' '}
          {c(
            'Includes surplus/duplicate payments, their refunds and incomplete settlements.',
            'Gồm tiền trả dư/trùng, hoàn các khoản đó hoặc đơn chưa thanh toán đủ; không cộng vào thu nhập.'
          )}
        </p>
      )}
    </section>
  );
}
