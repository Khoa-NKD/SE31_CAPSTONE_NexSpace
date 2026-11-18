import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type AnalyticsFilter, type AnalyticsSummary } from '../api';
import { money } from '../format';
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
  // A refreshed server total may remove this page. The guard becomes false after one adjustment.
  if (query.data && page > pages) setPage(pages);
  return (
    <section className='min-w-0 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='font-semibold'>
            {c('Cash transaction ledger', 'Đối chiếu giao dịch tiền')}
          </h2>
          <p className='text-xs text-muted-foreground'>
            {c(
              'Positive: received · negative: refunded · one row per event',
              'Dương: tiền nhận · âm: tiền hoàn · mỗi dòng là một giao dịch'
            )}
          </p>
        </div>
        <select
          aria-label={c('Transaction type', 'Loại giao dịch')}
          className='h-9 rounded-lg border bg-background px-3 text-sm'
          value={kind}
          onChange={(e) => onKind(e.target.value)}
        >
          <option value=''>{c('All cash events', 'Tất cả giao dịch tiền')}</option>
          <option value='PAYMENT'>{c('Payments received', 'Tiền nhận')}</option>
          <option value='REFUND'>{c('Processed refunds', 'Tiền đã hoàn')}</option>
        </select>
      </div>
      <div className='mb-4 grid gap-3 sm:grid-cols-3'>
        {[
          [c('Refunds processed', 'Đã hoàn trong kỳ'), money(summary.refundedAmount, locale)],
          [
            c('Average per first-paid booking', 'Giá trị TB mỗi lượt trả lần đầu'),
            money(summary.averagePaidBookingValue, locale)
          ],
          [
            c('Cash events', 'Số giao dịch tiền'),
            `${summary.receiptCount} ${c('receipts', 'nhận')} · ${summary.refundCount} ${c('refunds', 'hoàn')}`
          ]
        ].map(([label, value]) => (
          <div key={label} className='rounded-xl border border-border/50 bg-muted/30 p-4'>
            <p className='text-xs text-muted-foreground'>{label}</p>
            <p className='mt-1 text-sm font-semibold tabular-nums'>{value}</p>
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
          <button className='underline' onClick={() => void query.refetch()}>
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
                    c('Recorded at', 'Ghi nhận'),
                    c('Booking', 'Mã đặt chỗ'),
                    c('Workspace / resource', 'Không gian / chỗ'),
                    c('Event', 'Giao dịch'),
                    c('Amount', 'Số tiền'),
                    c('Reconciliation', 'Đối soát')
                  ].map((h) => (
                    <th className='p-3' key={h}>
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
                    <td className='whitespace-nowrap p-3 text-xs'>
                      {r.occurredAt.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className='p-3'>
                      <span className='font-medium'>{r.bookingCode}</span>
                      <p className='mt-1 text-[10px] text-muted-foreground'>
                        {statusLabels[r.bookingStatus] ?? r.bookingStatus}
                      </p>
                    </td>
                    <td className='p-3'>
                      <p>{r.workspaceName}</p>
                      <p className='text-xs text-muted-foreground'>{r.resourceName}</p>
                    </td>
                    <td className='p-3 text-xs'>
                      <span
                        className={
                          'inline-flex rounded-full px-2 py-1 font-medium ' +
                          (r.kind === 'PAYMENT'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400')
                        }
                      >
                        {r.kind === 'PAYMENT' ? c('Received', 'Đã nhận') : c('Refunded', 'Đã hoàn')}
                      </span>
                      <p className='mt-1 text-[10px] text-muted-foreground'>{r.eventId}</p>
                    </td>
                    <td
                      className={`whitespace-nowrap p-3 font-medium tabular-nums ${r.kind === 'REFUND' ? 'text-amber-700 dark:text-amber-400' : ''}`}
                    >
                      {money(r.amount, locale)}
                    </td>
                    <td className='p-3 text-xs'>
                      {r.reconciliationStatus === 'MATCHED'
                        ? c('Matched', 'Đã khớp')
                        : r.kind === 'REFUND'
                          ? c('Processed', 'Đã xử lý')
                          : c('Needs review', 'Cần kiểm tra')}
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
      <p className='mt-4 text-xs text-muted-foreground'>
        {c(
          'The transaction list refreshes when opened. If new payments arrive, refresh the report to reconcile the totals.',
          'Danh sách giao dịch được tải khi mở. Nếu có tiền về mới, làm mới báo cáo để đối chiếu tổng số.'
        )}
      </p>
    </section>
  );
}
