import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type AnalyticsFilter, type AnalyticsSummary } from '../api';
import { money, displayAnalyticsDate } from '../format';
import { useOrganizerCopy } from '@/hooks/use-organizer-copy';
import { Button } from '@/components/ui/button';

export function FinancialLedger({
  filter,
  kind,
  onKind,
  summary,
  actor
}: {
  filter: AnalyticsFilter;
  kind: string;
  onKind: (value: string) => void;
  summary: AnalyticsSummary;
  actor: unknown;
}) {
  // Changing filters remounts the inner table, so pagination always starts at page one.
  return (
    <LedgerTable
      key={JSON.stringify([filter, kind])}
      filter={filter}
      kind={kind}
      onKind={onKind}
      summary={summary}
      actor={actor}
    />
  );
}

function LedgerTable({
  filter,
  kind,
  onKind,
  summary,
  actor
}: {
  filter: AnalyticsFilter;
  kind: string;
  onKind: (value: string) => void;
  summary: AnalyticsSummary;
  actor: unknown;
}) {
  const c = useOrganizerCopy();
  const locale = c('en-US', 'vi-VN');
  const [page, setPage] = useState(1);
  const statusLabels: Record<string, string> = {
    PENDING_APPROVAL: c('Pending approval', 'Chờ duyệt'),
    PENDING_PAYMENT: c('Pending payment', 'Chờ thanh toán'),
    CONFIRMED: c('Confirmed', 'Đã xác nhận'),
    CHECKED_IN: c('Checked in', 'Đã đến'),
    COMPLETED: c('Completed', 'Hoàn tất'),
    CANCELLED: c('Cancelled', 'Đã hủy'),
    EXPIRED: c('Expired', 'Hết hạn'),
    NO_SHOW: c('No-show', 'Không đến')
  };
  const query = useQuery({
    queryKey: ['organizer-analytics', actor, 'ledger', filter, page, kind],
    queryFn: ({ signal }) => analyticsApi.ledger(filter, page, kind || undefined, signal),
    staleTime: 0,
    retry: 1,
    enabled: !!actor
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 20));
  if (query.data && page > pages) setPage(pages);

  return (
    <section className='min-w-0 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-base font-semibold'>
            {c('Cash transaction ledger', 'Sổ cái đối chiếu giao dịch dòng tiền')}
          </h2>
          <p className='text-xs text-muted-foreground'>
            {c(
              'Detailed log of every customer payment (+) and processed refund (−) in the period.',
              'Chi tiết từng khoản tiền nhận từ khách (+) và tiền đã hoàn trả (−) trong kỳ.'
            )}
          </p>
        </div>
        <div
          className='inline-flex rounded-xl border border-border/70 bg-muted/40 p-1 text-xs'
          role='group'
          aria-label={c('Transaction type', 'Loại giao dịch')}
        >
          {(
            [
              ['', `${c('All', 'Tất cả')} (${summary.receiptCount + summary.refundCount})`],
              ['PAYMENT', `${c('Received', 'Tiền nhận')} (${summary.receiptCount})`],
              ['REFUND', `${c('Refunded', 'Tiền hoàn')} (${summary.refundCount})`]
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type='button'
              onClick={() => onKind(val)}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                kind === val
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className='mb-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4'>
        {[
          [
            c('Total customer payments', 'Tổng thu từ khách'),
            money(summary.receivedAmount, locale),
            'text-foreground'
          ],
          [
            c('Total refunds processed', 'Đã hoàn trả trong kỳ'),
            `−${money(summary.refundedAmount, locale)}`,
            'text-rose-600 dark:text-rose-400'
          ],
          [
            c('Net cash (before fees)', 'Thực thu sau hoàn (trước phí)'),
            money(summary.netAmount, locale),
            'text-emerald-600 dark:text-emerald-400'
          ],
          [
            c('Average paid booking', 'Trung bình mỗi đơn thanh toán'),
            money(summary.averagePaidBookingValue, locale),
            'text-foreground'
          ]
        ].map(([label, value, colorClass]) => (
          <div key={label} className='rounded-xl border border-border/60 bg-muted/25 p-3'>
            <p className='text-xs text-muted-foreground'>{label}</p>
            <p className={`mt-1 text-sm font-bold tabular-nums ${colorClass}`}>{value}</p>
          </div>
        ))}
      </div>

      {query.isPending && (
        <p role='status' className='py-8 text-center text-sm text-muted-foreground'>
          {c('Loading transactions…', 'Đang tải giao dịch…')}
        </p>
      )}
      {query.isError && (
        <p role='alert' className='text-sm text-destructive'>
          {c('Could not load transactions.', 'Không tải được giao dịch.')}{' '}
          <button type='button' className='underline' onClick={() => void query.refetch()}>
            {c('Retry', 'Thử lại')}
          </button>
        </p>
      )}
      {query.data && !query.isError && (
        <>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='border-y bg-muted/40 text-xs text-muted-foreground [&_th]:font-medium'>
                <tr>
                  {[
                    c('Recorded at', 'Thời gian'),
                    c('Booking', 'Mã đặt chỗ'),
                    c('Workspace / resource', 'Không gian / chỗ'),
                    c('Type', 'Loại giao dịch'),
                    c('Amount', 'Số tiền'),
                    c('Status', 'Đối soát')
                  ].map((h) => (
                    <th className='p-2.5' key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map((r) => (
                  <tr
                    key={r.eventId}
                    className='border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30'
                  >
                    <td className='whitespace-nowrap p-2.5 text-xs text-muted-foreground'>
                      {displayAnalyticsDate(r.occurredAt)}
                    </td>
                    <td className='p-2.5'>
                      <span className='font-medium'>{r.bookingCode}</span>
                      <p className='mt-0.5 text-[11px] text-muted-foreground'>
                        {statusLabels[r.bookingStatus] ?? r.bookingStatus}
                      </p>
                    </td>
                    <td className='p-2.5'>
                      <p className='font-medium'>{r.workspaceName}</p>
                      <p className='text-xs text-muted-foreground'>{r.resourceName}</p>
                    </td>
                    <td className='p-2.5 text-xs'>
                      <span
                        className={
                          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ' +
                          (r.kind === 'PAYMENT'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400')
                        }
                      >
                        {r.kind === 'PAYMENT' ? c('Received', 'Đã nhận') : c('Refunded', 'Đã hoàn')}
                      </span>
                      <p className='mt-0.5 text-[10px] text-muted-foreground'>{r.eventId}</p>
                    </td>
                    <td
                      className={`whitespace-nowrap p-2.5 font-semibold tabular-nums ${
                        r.kind === 'REFUND'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {r.kind === 'PAYMENT' ? '+' : ''}
                      {money(r.amount, locale)}
                    </td>
                    <td className='p-2.5 text-xs'>
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${
                          r.reconciliationStatus === 'MATCHED' || r.kind === 'REFUND'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {r.reconciliationStatus === 'MATCHED'
                          ? c('Matched', 'Đã khớp')
                          : r.kind === 'REFUND'
                            ? c('Processed', 'Đã xử lý')
                            : c('Needs review', 'Cần kiểm tra')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data.rows.length && (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              {c('No transactions match these filters.', 'Không có giao dịch phù hợp bộ lọc.')}
            </p>
          )}
          <div className='mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground'>
            <span>
              {query.data.total.toLocaleString(locale)} {c('transactions', 'giao dịch')} ·{' '}
              {c('Page', 'Trang')} {page}/{pages}
            </span>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={page <= 1 || query.isFetching}
                onClick={() => setPage(page - 1)}
              >
                {c('Previous', 'Trước')}
              </Button>
              <Button
                variant='outline'
                size='sm'
                disabled={page >= pages || query.isFetching}
                onClick={() => setPage(page + 1)}
              >
                {c('Next', 'Sau')}
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
