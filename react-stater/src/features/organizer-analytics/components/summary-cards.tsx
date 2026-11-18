import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarCheck,
  Clock3,
  Info,
  Receipt,
  Users,
  Wallet
} from 'lucide-react';
import type { AnalyticsSummary } from '../api';
import { change, money } from '../format';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';

export function SummaryCards({
  current,
  previous,
  onMoney
}: {
  current: AnalyticsSummary;
  previous: AnalyticsSummary;
  onMoney: (kind: string) => void;
}) {
  const c = useOrganizerCopy();
  const locale = c('en-US', 'vi-VN');
  const cards = [
    {
      key: 'netAmount',
      label: c('Cash after refunds', 'Tiền thu sau hoàn'),
      icon: Wallet,
      cash: true,
      action: '',
      tone: 'text-primary bg-primary/10',
      help: c(
        'Receipts minus processed refunds. Not profit or organizer payout.',
        'Tiền nhận trừ tiền đã hoàn trong kỳ. Chưa phải lợi nhuận hay tiền thực chuyển cho organizer.'
      )
    },
    {
      key: 'receivedAmount',
      label: c('Cash received', 'Tiền khách đã trả'),
      icon: ArrowDownLeft,
      cash: true,
      action: 'PAYMENT',
      tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
      help: c(
        'All successful receipts in the period, including reconciliation exceptions.',
        'Tổng tiền nhận từ các giao dịch thành công trong kỳ, gồm khoản cần đối soát.'
      )
    },
    {
      key: 'refundedAmount',
      label: c('Cash refunded', 'Tiền đã hoàn'),
      icon: Receipt,
      cash: true,
      action: 'REFUND',
      tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
      help: c(
        'Processed refunds by refund date. An increase is not necessarily an improvement.',
        'Tiền hoàn đã xử lý theo ngày hoàn. Tăng không đồng nghĩa hiệu quả tốt hơn.'
      )
    },
    {
      key: 'paidBookings',
      label: c('Paid bookings', 'Lượt đặt đã thanh toán'),
      icon: CalendarCheck,
      cash: false,
      tone: 'text-sky-600 bg-sky-500/10 dark:text-sky-400',
      help: c(
        'First payment per booking; counted once, including later cancellations/refunds.',
        'Mỗi booking tính một lần ở lần trả đầu, gồm cả đơn hủy/hoàn sau đó.'
      )
    }
  ] as const;
  return (
    <section
      aria-label={c('Key business metrics', 'Chỉ số kinh doanh chính')}
      className='space-y-3'
    >
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        {cards.map((card) => {
          const value = String(current[card.key]);
          const comparison = change(value, String(previous[card.key]));
          const Icon = card.icon;
          const action = 'action' in card ? card.action : undefined;
          return (
            <div
              key={card.key}
              className={`rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5 ${card.key === 'netAmount' ? 'border-primary/25 bg-gradient-to-br from-primary/5 to-card' : ''}`}
            >
              <div className='mb-4 flex items-center justify-between gap-2'>
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${card.tone}`}
                >
                  <Icon className='size-4' />
                </span>
                <details className='relative'>
                  <summary
                    aria-label={c('Metric definition', 'Giải thích chỉ số')}
                    className='cursor-pointer list-none rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary'
                  >
                    <Info className='size-4' />
                  </summary>
                  <p className='absolute right-0 top-8 z-20 w-60 rounded-xl border bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-lg'>
                    {card.help}
                  </p>
                </details>
              </div>
              <h2 className='text-sm text-muted-foreground'>{card.label}</h2>
              <p className='mt-2 break-words text-[clamp(1.35rem,2vw,1.75rem)] font-semibold tracking-tight tabular-nums'>
                {card.cash ? money(value, locale) : Number(value).toLocaleString(locale)}
              </p>
              <div className='mt-3 flex items-center justify-between gap-2'>
                <span
                  className={`rounded-md px-1.5 py-1 text-xs font-medium tabular-nums ${!comparison ? 'bg-muted text-muted-foreground' : card.key === 'refundedAmount' ? 'bg-muted text-foreground' : comparison.startsWith('−') ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'}`}
                >
                  {comparison ?? c('No baseline', 'Chưa có cơ sở')}
                </span>
                {action !== undefined && (
                  <button
                    type='button'
                    onClick={() => onMoney(action)}
                    className='flex items-center gap-1 rounded text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary'
                  >
                    {c('Details', 'Chi tiết')}
                    <ArrowUpRight className='size-3.5' />
                  </button>
                )}
              </div>
              <p className='mt-2 text-[11px] text-muted-foreground'>
                {c('vs previous period of equal length', 'so với kỳ trước cùng độ dài')}
              </p>
            </div>
          );
        })}
      </div>
      <div className='grid grid-cols-2 rounded-2xl border border-border/70 bg-card py-1 xl:grid-cols-4'>
        {[
          {
            label: c('Bookings created', 'Lượt đặt phát sinh'),
            value: current.createdBookings.toLocaleString(locale),
            icon: CalendarCheck
          },
          {
            label: c('Paying customers', 'Khách đã thanh toán'),
            value: current.payingCustomers.toLocaleString(locale),
            icon: Users
          },
          {
            label: c('Returning customers', 'Khách quay lại'),
            value: current.returningCustomers.toLocaleString(locale),
            icon: Users
          },
          {
            label: c('Reserved resource-hours', 'Giờ chỗ được đặt'),
            value: Number(current.bookedHours).toLocaleString(locale, { maximumFractionDigits: 2 }),
            icon: Clock3
          }
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className='flex items-center gap-3 px-4 py-3'>
            <Icon className='hidden size-4 shrink-0 text-muted-foreground sm:block' />
            <div>
              <p className='text-xs text-muted-foreground'>{label}</p>
              <p className='mt-1 text-lg font-semibold tabular-nums'>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
