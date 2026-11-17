import { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Armchair,
  Users,
  Building,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Hourglass,
  QrCode,
  CreditCard,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import type { BookingDto } from '../../api/booking-types';

interface BookingHistoryCardProps {
  booking: BookingDto;
  onCancelHold?: (booking: BookingDto) => void;
  onCancelBooking?: (booking: BookingDto) => void;
  isCancelling?: boolean;
}

// Module-level helper for formatting currency
function formatAmount(val?: number) {
  const num = val ?? 0;
  if (num > 1000) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(num);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
}

// Module-level helper for formatting date and time ranges
function formatDateRange(start?: string, end?: string) {
  if (!start) return { timeStr: 'N/A', dateStr: '' };
  try {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    
    const timeStr = `${startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` +
      (endDate ? ` - ${endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : '');
    const dateStr = startDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return { timeStr, dateStr };
  } catch {
    return { timeStr: start, dateStr: '' };
  }
}

// Module-level status badge configuration
function getStatusBadge(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        label: 'Đã xác nhận'
      };
    case 'PENDING_PAYMENT':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
        dot: 'bg-amber-500 animate-pulse',
        label: 'Chờ thanh toán (Giữ chỗ)'
      };
    case 'PENDING_APPROVAL':
      return {
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800',
        dot: 'bg-indigo-500',
        label: 'Chờ Host duyệt'
      };
    case 'COMPLETED':
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
        dot: 'bg-blue-500',
        label: 'Đã hoàn thành'
      };
    case 'CANCELLED':
      return {
        bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
        dot: 'bg-red-500',
        label: 'Đã hủy'
      };
    case 'EXPIRED':
      return {
        bg: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
        dot: 'bg-zinc-400',
        label: 'Hết hạn giữ chỗ'
      };
    default:
      return {
        bg: 'bg-muted text-muted-foreground border-border',
        dot: 'bg-muted-foreground',
        label: status
      };
  }
}

export function BookingHistoryCard({
  booking,
  onCancelHold,
  onCancelBooking,
  isCancelling = false
}: BookingHistoryCardProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [isHoldExpired] = useState(() =>
    booking.holdExpiresAt ? new Date(booking.holdExpiresAt).getTime() < Date.now() : false
  );

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(booking.bookingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const { timeStr, dateStr } = formatDateRange(booking.startTime, booking.endTime);
  const statusConfig = getStatusBadge(booking.status);

  const isPendingPayment = booking.status === 'PENDING_PAYMENT';
  const isConfirmed = booking.status === 'CONFIRMED';

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md">
      {/* Top Banner Row: Code & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-sm font-bold text-foreground">
            {booking.bookingCode}
          </span>
          <button
            onClick={handleCopyCode}
            aria-label="Sao chép mã đặt chỗ"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Sao chép mã"
          >
            {copiedCode ? (
              <Check className="size-3.5 text-emerald-600" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span className="text-[11px] font-medium">{copiedCode ? 'Đã chép' : 'Chép'}</span>
          </button>
        </div>

        {/* Status Pill */}
        <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusConfig.bg}`}>
          <span className={`size-1.5 rounded-full ${statusConfig.dot}`} />
          {booking.status === 'CONFIRMED' && <CheckCircle2 className="size-3.5" />}
          {booking.status === 'PENDING_PAYMENT' && <Clock className="size-3.5" />}
          {booking.status === 'PENDING_APPROVAL' && <Hourglass className="size-3.5" />}
          {booking.status === 'COMPLETED' && <Sparkles className="size-3.5" />}
          {booking.status === 'CANCELLED' && <XCircle className="size-3.5" />}
          {booking.status === 'EXPIRED' && <AlertCircle className="size-3.5" />}
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12">
        {/* Left Column: Workspace Info */}
        <div className="sm:col-span-7 space-y-2">
          <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-primary sm:text-lg">
            {booking.workspaceName || 'NexSpace Hub'}
          </h3>

          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/80" />
            <span className="line-clamp-1">{booking.workspaceAddress || 'Khu đô thị công nghệ cao, TP.HCM'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1 rounded-lg bg-muted/60 px-2.5 py-1 font-medium text-foreground">
              {booking.resourceCategory === 'MEETING_ROOM' ? (
                <Users className="size-3.5 text-primary" />
              ) : booking.resourceCategory === 'PRIVATE_OFFICE' ? (
                <Building className="size-3.5 text-primary" />
              ) : (
                <Armchair className="size-3.5 text-primary" />
              )}
              <span>{booking.resourceCode || booking.resourceName || 'Chỗ ngồi tiêu chuẩn'}</span>
            </div>

            {booking.floorName && (
              <span className="rounded-lg bg-muted/60 px-2 py-1 font-medium">
                {booking.floorName}
              </span>
            )}

            {booking.zoneName && (
              <span className="rounded-lg bg-muted/60 px-2 py-1 font-medium">
                Khu: {booking.zoneName}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Time & Price */}
        <div className="flex flex-col justify-between sm:col-span-5 sm:border-l sm:border-border/60 sm:pl-5 space-y-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold">
              <Calendar className="size-3.5 text-primary" />
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              <span>{timeStr}</span>
              {booking.durationHours && (
                <span className="text-[11px] text-muted-foreground/80">({booking.durationHours}h)</span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <span className="text-[11px] font-medium text-muted-foreground">Tổng thanh toán</span>
            <div className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {formatAmount(booking.finalPrice)}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Notice Banner */}
      {booking.status === 'CANCELLED' && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <XCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>
              Đơn đã bị hủy {booking.cancelSource === 'ORGANIZER' ? 'bởi Organizer (Không gian)' : 'bởi Bạn (Khách hàng)'}
            </span>
          </div>
          {booking.cancelReason && (
            <div className="text-[11px] text-muted-foreground pl-5.5">
              Lý do: <span className="text-foreground">{booking.cancelReason}</span>
            </div>
          )}
          {booking.refundAmount != null && booking.refundAmount > 0 && (
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pl-5.5">
              Chính sách hoàn tiền: Hoàn {booking.refundPercent ?? 0}% ({formatAmount(booking.refundAmount)})
            </div>
          )}
        </div>
      )}

      {/* Hold Expiry Notice for Pending Bookings */}
      {isPendingPayment && booking.holdExpiresAt && !isHoldExpired && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2 font-medium">
            <Clock className="size-4 animate-spin text-amber-600 dark:text-amber-400" />
            <span>Chỗ ngồi đang được tạm giữ. Vui lòng thanh toán trước khi hết hạn!</span>
          </div>
          <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-200">
            Hết hạn: {new Date(booking.holdExpiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5 border-t border-border/60 pt-4">
        {/* Confirmed Booking Action: Digital Pass & Cancel Option */}
        {isConfirmed && (
          <>
            {onCancelBooking && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancelBooking(booking)}
                disabled={isCancelling}
                className="gap-1.5 text-muted-foreground hover:text-red-600 hover:border-red-200 dark:hover:border-red-900 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Hủy đặt chỗ</span>
              </Button>
            )}

            <Link
              to="/workspaces/confirmation"
              search={{ bookingCode: booking.bookingCode }}
              className="inline-flex"
            >
              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-sm hover:from-emerald-500 hover:to-teal-500 cursor-pointer"
              >
                <QrCode className="size-4" />
                <span>Xem vé & QR Check-in</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </Link>
          </>
        )}

        {/* Pending Payment Actions */}
        {isPendingPayment && !isHoldExpired && (
          <>
            {onCancelHold && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancelHold(booking)}
                disabled={isCancelling}
                className="gap-1.5 text-muted-foreground hover:text-red-600 hover:border-red-200 dark:hover:border-red-900 cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Hủy giữ chỗ</span>
              </Button>
            )}

            <Link
              to="/workspaces/review"
              search={{
                workspaceId: Number(booking.workspaceId) || 1
              }}
              className="inline-flex"
            >
              <Button
                size="sm"
                className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-md shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 cursor-pointer"
              >
                <CreditCard className="size-4" />
                <span>Thanh toán ngay</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </Link>
          </>
        )}

        {/* Rebook Action for Completed / Cancelled / Expired */}
        {(!isConfirmed && !isPendingPayment) && (
          <Link
            to="/workspaces/$workspaceId"
            params={{ workspaceId: String(booking.workspaceId || 1) }}
            className="inline-flex"
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <span>Đặt lại chỗ này</span>
              <ExternalLink className="size-3.5" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
