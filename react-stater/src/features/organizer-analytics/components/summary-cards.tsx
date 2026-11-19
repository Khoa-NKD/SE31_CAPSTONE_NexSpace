import { ArrowUpRight, CalendarCheck, Clock3, Info, Receipt, Users, Wallet } from 'lucide-react';
import type { AnalyticsSummary, OrganizerEarnings } from '../api';
import { change, money } from '../format';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';

export function SummaryCards({
  current,
  earnings,
  previousEarnings,
  onMoney
}: {
  current: AnalyticsSummary;
  earnings?: OrganizerEarnings;
  previousEarnings?: OrganizerEarnings;
  onMoney: (kind: string) => void;
}) {
  const c = useOrganizerCopy();
  const locale = c('en-US', 'vi-VN');
  const cards = [
    {
      key: 'organizerAmount',
      label: c('Your earnings including VAT', 'Tổng tiền bạn được hưởng'),
      description: c('Includes VAT · after refunds and fees', 'Gồm VAT · đã trừ tiền hoàn và phí'),
      icon: Wallet,
      tone: 'text-primary bg-primary/10',
      help: c(
        'Customer funds allocated to you after refunds and the recorded platform fee. Includes rental VAT; this is not confirmation of a bank transfer.',
        'Tiền thuê còn lại sau hoàn, cộng VAT còn lại, trừ phí nền tảng. Không thu thêm phí khách trên đơn mới. Đây là khoản được hưởng, chưa phải tiền đã chuyển vào ngân hàng; cũng không phải số dư có thể rút ngay.'
      )
    },
    {
      key: 'rentalEarningsAmount',
      label: c('Rental income after fees', 'Tiền thuê sau khi trừ phí'),
      description: c('Excludes VAT · after refunds', 'Không gồm VAT · đã trừ tiền hoàn'),
      icon: CalendarCheck,
      tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
      help: c(
        'Your allocation minus rental VAT. Operating costs are not deducted, so this is not profit.',
        'Tổng tiền bạn được nhận trừ phần VAT. Đây là tiền thuê sau khi trừ tiền hoàn và phí nền tảng; chưa trừ chi phí vận hành nên chưa phải lợi nhuận.'
      )
    },
    {
      key: 'vatAmount',
      label: c('VAT included in your total', 'VAT trong tiền được nhận'),
      description: c('Tax portion · after refunds', 'Phần thuế VAT · đã trừ VAT hoàn lại'),
      icon: Receipt,
      tone: 'text-sky-600 bg-sky-500/10 dark:text-sky-400',
      help: c(
        'Rental VAT retained after processed refunds, allocated to the organizer for tax handling. Uses the original booking amount, not a current tax rate.',
        'Phần VAT nằm trong tổng tiền bạn được nhận để xử lý nghĩa vụ thuế, không phải tiền thuê hay lợi nhuận. Đã trừ VAT tương ứng với tiền hoàn cho khách; dùng số thuế đã chốt trên đơn.'
      )
    },
    {
      key: 'platformFeeAmount',
      label: c('Platform fees', 'Phí nền tảng'),
      description: c('Deducted from your rental income', 'Khoản phí trừ khỏi tiền thuê của bạn'),
      icon: Receipt,
      tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
      help: c(
        'The total platform charge on rental excluding rental VAT includes applicable platform-fee tax; no additional fee tax is deducted here. Refunds reduce this charge proportionally; full refunds reverse it.',
        'Tổng phí nền tảng tính trên tiền thuê chưa VAT; mức phí công bố đã gồm VAT của chính phí nền tảng, không trừ thêm thuế phí lần nữa. Phí giảm theo tỷ lệ hoàn; hoàn toàn bộ thì không thu phí. Khoản này đã được trừ khi tính tiền bạn được hưởng.'
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
          const value = earnings?.[card.key];
          const oldValue = previousEarnings?.[card.key];
          const comparison = value != null && oldValue != null ? change(value, oldValue) : null;
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className={`rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5 ${card.key === 'organizerAmount' ? 'border-primary/25 bg-gradient-to-br from-primary/5 to-card' : ''}`}
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
              <p className='mt-1 text-xs text-muted-foreground'>{card.description}</p>
              <p className='mt-2 break-words text-[clamp(1.35rem,2vw,1.75rem)] font-semibold tracking-tight tabular-nums'>
                {value == null ? c('Not verified', 'Chưa đủ căn cứ') : money(value, locale)}
              </p>
              <div className='mt-3 flex items-center justify-between gap-2'>
                <span
                  className={`rounded-md px-1.5 py-1 text-xs font-medium tabular-nums ${!comparison ? 'bg-muted text-muted-foreground' : card.key === 'platformFeeAmount' ? 'bg-muted text-foreground' : comparison.startsWith('−') ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'}`}
                >
                  {comparison ?? c('No baseline', 'Chưa có cơ sở')}
                </span>
              </div>
              <p className='mt-2 text-[11px] text-muted-foreground'>
                {c('vs previous period of equal length', 'so với kỳ trước cùng độ dài')}
              </p>
            </div>
          );
        })}
      </div>
      <div className='grid grid-cols-2 rounded-2xl border border-border/70 bg-card py-1 xl:grid-cols-5'>
        {[
          {
            label: c('Paid bookings', 'Đơn đã thanh toán'),
            value: current.paidBookings.toLocaleString(locale),
            unit: c(current.paidBookings === 1 ? 'booking' : 'bookings', 'đơn'),
            icon: CalendarCheck
          },
          {
            label: c('Bookings created', 'Đơn đặt mới'),
            value: current.createdBookings.toLocaleString(locale),
            unit: c(current.createdBookings === 1 ? 'booking' : 'bookings', 'đơn'),
            icon: CalendarCheck
          },
          {
            label: c('Paying customers', 'Khách đã thanh toán'),
            value: current.payingCustomers.toLocaleString(locale),
            unit: c(current.payingCustomers === 1 ? 'person' : 'people', 'người'),
            icon: Users
          },
          {
            label: c('Returning customers', 'Khách quay lại'),
            value: current.returningCustomers.toLocaleString(locale),
            unit: c(current.returningCustomers === 1 ? 'person' : 'people', 'người'),
            icon: Users
          },
          {
            label: c('Reserved resource-hours', 'Giờ chỗ được đặt'),
            value: Number(current.bookedHours).toLocaleString(locale, { maximumFractionDigits: 2 }),
            unit: c(Number(current.bookedHours) === 1 ? 'hour' : 'hours', 'giờ'),
            icon: Clock3
          }
        ].map(({ label, value, unit, icon: Icon }) => (
          <div key={label} className='flex items-center gap-3 px-4 py-3'>
            <Icon className='hidden size-4 shrink-0 text-muted-foreground sm:block' />
            <div>
              <p className='text-xs text-muted-foreground'>{label}</p>
              <p className='mt-1 text-lg font-semibold tabular-nums'>
                {value} <span className='text-sm font-normal text-muted-foreground'>{unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm'>
        <div>
          <span className='text-muted-foreground'>
            {c(
              'Transferred to you in the selected period: ',
              'Đã thực chuyển vào ngân hàng trong thời gian đã chọn: '
            )}
          </span>
          <strong className='tabular-nums'>
            {earnings?.transferredAmount != null
              ? money(earnings.transferredAmount, locale)
              : earnings?.transferTrackingAvailable
                ? c('Needs reconciliation', 'Cần đối soát chi trả')
                : c('No transfer records yet', 'Chưa có bản ghi chi trả')}
          </strong>
        </div>
        <button
          type='button'
          onClick={() => onMoney('')}
          className='flex items-center gap-1 text-xs text-primary hover:underline'
        >
          {c('Customer payments and refunds', 'Xem tiền khách và hoàn tiền')}
          <ArrowUpRight className='size-3.5' />
        </button>
      </div>
      {earnings?.unallocatedAmount != null && earnings.unallocatedAmount !== '0.00' && (
        <p className='rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400'>
          {c(
            'Cash movement outside organizer allocation: ',
            'Tiền khách chưa tính vào phần bạn được nhận: '
          )}
          {money(earnings.unallocatedAmount, locale)}.{' '}
          {c(
            'Includes surplus/duplicate payments, their refunds and incomplete settlements.',
            'Gồm tiền trả dư/trùng, hoàn các khoản đó hoặc đơn chưa thanh toán đủ; không cộng vào thu nhập.'
          )}
        </p>
      )}
      <p className='text-xs leading-relaxed text-muted-foreground'>
        {c(
          'Allocations follow cash events in the selected period. Refunds can reverse earlier-period tax and fees. Transfers are counted separately by transfer date; these figures are not a withdrawable account balance.',
          'Khách thanh toán → ghi nhận tiền thuê và VAT → xử lý hoàn theo chính sách → tính khoản bạn được hưởng → chi trả khi đủ điều kiện. Tổng được hưởng = tiền thuê còn lại + VAT còn lại − phí nền tảng còn lại. VAT dịch vụ thuê thuộc trách nhiệm hóa đơn, kê khai và nộp thuế của Organizer. Các số tính theo ngày thanh toán/hoàn trong thời gian đã chọn; tiền đã chuyển tính riêng theo ngày chuyển. Chưa có luồng tự động chi trả.'
        )}
      </p>
    </section>
  );
}
