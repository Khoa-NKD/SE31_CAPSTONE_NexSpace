export const scheduleTone: Record<string, string> = {
  CONFIRMED: 'border-blue-500 bg-blue-500/20 text-blue-700 dark:text-blue-200',
  CHECKED_IN: 'border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-200',
  PENDING_PAYMENT: 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-200',
  PENDING_APPROVAL: 'border-orange-500 bg-orange-500/20 text-orange-700 dark:text-orange-200',
  COMPLETED: 'border-slate-500 bg-slate-500/20',
  NO_SHOW: 'border-rose-500 bg-rose-500/20',
  BLOCKED: 'border-violet-500 bg-violet-500/20',
  MAINTENANCE: 'border-red-500 bg-red-500/20'
};
export function scheduleStatus(status: string, c: (en: string, vi: string) => string) {
  return (
    {
      CONFIRMED: c('Confirmed', 'Đã xác nhận'),
      CHECKED_IN: c('Checked in', 'Đã nhận chỗ'),
      PENDING_PAYMENT: c('Payment hold', 'Đang giữ chỗ / chờ thanh toán'),
      PENDING_APPROVAL: c('Pending approval', 'Chờ duyệt'),
      COMPLETED: c('Completed', 'Hoàn thành'),
      NO_SHOW: c('No show', 'Không đến'),
      BLOCKED: c('Unavailable', 'Ngừng nhận đặt'),
      MAINTENANCE: c('Maintenance', 'Bảo trì')
    }[status] ?? status
  );
}
