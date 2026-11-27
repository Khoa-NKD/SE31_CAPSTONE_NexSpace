import { Spinner as Loader2 } from '@/components/ui/spinner';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import {
  RotateCcw,
  Clock,
  MapPin,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  CheckCircle2,
  XCircle,
  Clock3,
  ChevronRight,
  Ban,
  Search,
  CreditCard,
  FileText,
  Sparkles,
  ArrowRight
} from '@/components/ui/hugeicons';
import {
  useCancellationPreviewQuery,
  useCancelBookingMutation
} from '@/features/workspaces/api/booking-queries';
import { WorkspaceHeader } from '@/features/workspaces/components/workspace-header';
import { Footer } from '@/features/landing/components/footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCustomerRefunds,
  useCustomerRefundKpis,
  useCustomerBookings,
  useUpdateCustomerRefundBankInfo,
  useCreateComplaintRefund
} from '@/features/payments/api';
import type {
  CustomerRefundItemResponse,
  RefundSourceType
} from '@/features/payments/api/types';
import { useLanguage } from '@/features/landing/context/language-context';
import { toast } from 'sonner';

function formatCurrency(val?: number | null) {
  if (val == null || Number.isNaN(val)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
}

function formatExactDateTime(dateStr?: string | null, isVi = true) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const locale = isVi ? 'vi-VN' : 'en-GB';
    const time = d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    });
    const date = d.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return `${time} • ${date}`;
  } catch {
    return dateStr;
  }
}

function formatScheduleWindow(startStr?: string | null, endStr?: string | null, isVi = true) {
  if (!startStr || !endStr) return null;
  try {
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
    const locale = isVi ? 'vi-VN' : 'en-GB';
    const sTime = s.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const eTime = e.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const sDate = s.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return `${sTime} – ${eTime}, ${sDate}`;
  } catch {
    return null;
  }
}

function maskAccountNumber(acc?: string | null, revealed?: boolean) {
  if (!acc) return '—';
  if (revealed || acc.length <= 4) return acc;
  return `•••• ${acc.slice(-4)}`;
}

function getSourceText(source: RefundSourceType, isVi: boolean) {
  switch (source) {
    case 'PAYMENT_DISCREPANCY':
      return isVi ? 'Tự động hoàn (Thanh toán sau Hold)' : 'Auto-Refund (Paid After Hold)';
    case 'CUSTOMER_CANCEL':
      return isVi ? 'Hủy trước giờ đặt chỗ' : 'Pre-Booking Cancellation';
    case 'ADMIN_DISPUTE':
      return isVi ? 'Khiếu nại sau sử dụng' : 'Post-Usage Claim';
    case 'ORGANIZER_CANCEL':
      return isVi ? 'Chủ không gian hủy đơn' : 'Host Cancellation';
    default:
      return source;
  }
}

function renderSourceBadge(source: RefundSourceType, isVi: boolean) {
  const label = getSourceText(source, isVi);
  switch (source) {
    case 'PAYMENT_DISCREPANCY':
      return (
        <Badge className='bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 gap-1 font-medium text-xs py-0.5 px-2.5'>
          <RotateCcw className='h-3 w-3 text-indigo-600 dark:text-indigo-400' />
          <span>{label}</span>
        </Badge>
      );
    case 'CUSTOMER_CANCEL':
      return (
        <Badge className='bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25 gap-1 font-medium text-xs py-0.5 px-2.5'>
          <Ban className='h-3 w-3 text-sky-600 dark:text-sky-400' />
          <span>{label}</span>
        </Badge>
      );
    case 'ADMIN_DISPUTE':
      return (
        <Badge className='bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 gap-1 font-medium text-xs py-0.5 px-2.5'>
          <AlertCircle className='h-3 w-3 text-amber-600 dark:text-amber-400' />
          <span>{label}</span>
        </Badge>
      );
    case 'ORGANIZER_CANCEL':
      return (
        <Badge className='bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25 gap-1 font-medium text-xs py-0.5 px-2.5'>
          <Building2 className='h-3 w-3 text-teal-600 dark:text-teal-400' />
          <span>{label}</span>
        </Badge>
      );
    default:
      return (
        <Badge variant='outline' className='text-xs py-0.5 px-2.5'>
          {label}
        </Badge>
      );
  }
}

function renderStatusBadge(refund: CustomerRefundItemResponse, isVi: boolean) {
  if (refund.status === 'PROCESSED' || refund.status === 'APPROVED') {
    return (
      <Badge className='bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold text-xs py-0.5 px-2.5'>
        <CheckCircle2 className='h-3 w-3 text-emerald-600 dark:text-emerald-400' />
        <span>{isVi ? 'Đã hoàn tiền' : 'Refunded'}</span>
      </Badge>
    );
  }
  if (refund.status === 'REJECTED') {
    return (
      <Badge className='bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 font-semibold text-xs py-0.5 px-2.5'>
        <XCircle className='h-3 w-3 text-rose-600' />
        <span>{isVi ? 'Từ chối hoàn tiền' : 'Rejected'}</span>
      </Badge>
    );
  }
  if (refund.needsBankInfo) {
    return (
      <Badge className='bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 gap-1 font-semibold text-xs py-0.5 px-2.5'>
        <AlertCircle className='h-3 w-3 text-rose-600' />
        <span>{isVi ? 'Cần điền TK nhận hoàn' : 'Bank Info Required'}</span>
      </Badge>
    );
  }
  return (
    <Badge className='bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-semibold text-xs py-0.5 px-2.5'>
      <Clock3 className='h-3 w-3 text-amber-600 dark:text-amber-400' />
      <span>{isVi ? 'Đang xử lý' : 'In Progress'}</span>
    </Badge>
  );
}

export const REFUND_BANKS = [
  {
    bin: '970422',
    name: 'MB Bank',
    fullNameVi: 'MB Bank (Ngân hàng Quân Đội)',
    fullNameEn: 'MB Bank (Military Bank)',
    autoSupported: true
  },
  {
    bin: '970416',
    name: 'ACB',
    fullNameVi: 'ACB (Ngân hàng Á Châu)',
    fullNameEn: 'ACB (Asia Commercial Bank)',
    autoSupported: true
  },
  {
    bin: '970452',
    name: 'KienlongBank',
    fullNameVi: 'KienlongBank (Ngân hàng Kiên Long)',
    fullNameEn: 'KienlongBank',
    autoSupported: true
  },
  {
    bin: '970436',
    name: 'Vietcombank',
    fullNameVi: 'Vietcombank (Ngoại thương Việt Nam)',
    fullNameEn: 'Vietcombank',
    autoSupported: false
  },
  {
    bin: '970415',
    name: 'VietinBank',
    fullNameVi: 'VietinBank (Công thương Việt Nam)',
    fullNameEn: 'VietinBank',
    autoSupported: false
  },
  {
    bin: '970407',
    name: 'Techcombank',
    fullNameVi: 'Techcombank (Kỹ thương Việt Nam)',
    fullNameEn: 'Techcombank',
    autoSupported: false
  },
  {
    bin: '970418',
    name: 'BIDV',
    fullNameVi: 'BIDV (Đầu tư và Phát triển VN)',
    fullNameEn: 'BIDV',
    autoSupported: false
  },
  {
    bin: '970423',
    name: 'TPBank',
    fullNameVi: 'TPBank (Tiên Phong)',
    fullNameEn: 'TPBank',
    autoSupported: false
  },
  {
    bin: '970432',
    name: 'VPBank',
    fullNameVi: 'VPBank (Việt Nam Thịnh Vượng)',
    fullNameEn: 'VPBank',
    autoSupported: false
  }
];

export interface MyRefundsPageProps {
  initialAction?: 'cancel' | 'complaint' | 'bank' | 'detail';
  initialBookingId?: number;
  initialRefundId?: number;
}

export function MyRefundsPage({
  initialAction,
  initialBookingId,
  initialRefundId
}: MyRefundsPageProps) {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const hasScrolledToTargetRef = useRef<string | null>(null);

  const [statusTab, setStatusTab] = useState<
    'ALL' | 'NEEDS_BANK' | 'PENDING' | 'PROCESSED' | 'REJECTED'
  >('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | RefundSourceType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedAccounts, setRevealedAccounts] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [selectedRefundForBank, setSelectedRefundForBank] =
    useState<CustomerRefundItemResponse | null>(null);
  const [selectedRefundDetail, setSelectedRefundDetail] =
    useState<CustomerRefundItemResponse | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(initialAction === 'cancel');
  const [complaintModalOpen, setComplaintModalOpen] = useState<boolean>(
    initialAction === 'complaint'
  );

  // Form state for Bank Update Modal
  const [editBankBin, setEditBankBin] = useState('970422');
  const [editBankName, setEditBankName] = useState('MB Bank (Ngân hàng Quân Đội)');
  const [editBankAccountNumber, setEditBankAccountNumber] = useState('');
  const [editBankAccountName, setEditBankAccountName] = useState('');

  // Form state for Pre-Booking Cancel & Refund Modal
  const [cancelBookingId, setCancelBookingId] = useState<number | undefined>(
    initialAction === 'cancel' ? initialBookingId : undefined
  );
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBankBin, setCancelBankBin] = useState('970422');
  const [cancelBankName, setCancelBankName] = useState('MB Bank (Ngân hàng Quân Đội)');
  const [cancelAccountNumber, setCancelAccountNumber] = useState('');
  const [cancelAccountName, setCancelAccountName] = useState('');

  // Form state for Post-Usage Complaint Refund Modal
  const [complaintBookingId, setComplaintBookingId] = useState<number | undefined>(
    initialAction === 'complaint' ? initialBookingId : undefined
  );
  const [complaintAmountRatio, setComplaintAmountRatio] = useState<'100' | '50' | 'CUSTOM'>('100');
  const [complaintCustomAmount, setComplaintCustomAmount] = useState<string>('');
  const [complaintReason, setComplaintReason] = useState('');
  const [complaintBankBin, setComplaintBankBin] = useState('970422');
  const [complaintBankName, setComplaintBankName] = useState('MB Bank (Ngân hàng Quân Đội)');
  const [complaintAccountNumber, setComplaintAccountNumber] = useState('');
  const [complaintAccountName, setComplaintAccountName] = useState('');

  // Queries
  const {
    data: refundsPage,
    isLoading,
    isFetching,
    refetch
  } = useCustomerRefunds({
    page: 0,
    size: 50,
    sort: 'createdAt,desc'
  });

  const { data: kpis, refetch: refetchKpis } = useCustomerRefundKpis();

  const { data: bookingsPage } = useCustomerBookings({
    page: 0,
    size: 50,
    sort: 'createdAt,desc'
  });

  const allRefunds = useMemo(
    () => refundsPage?.content ?? refundsPage?.listObjects ?? [],
    [refundsPage]
  );
  const allBookings = useMemo(
    () => bookingsPage?.content ?? bookingsPage?.listObjects ?? [],
    [bookingsPage]
  );

  const cancellableBookings = useMemo(
    () => allBookings.filter((b) => b.status === 'CONFIRMED' && !b.refundStatus),
    [allBookings]
  );

  const complainableBookings = useMemo(
    () =>
      allBookings.filter(
        (b) =>
          (b.status === 'COMPLETED' || b.status === 'CHECKED_IN' || b.status === 'CONFIRMED') &&
          !b.refundStatus
      ),
    [allBookings]
  );

  const selectedComplaintBooking = useMemo(
    () =>
      complainableBookings.find((b) => b.bookingId === complaintBookingId) ||
      complainableBookings[0] ||
      null,
    [complainableBookings, complaintBookingId]
  );

  const effectiveCancelBookingId = cancelBookingId ?? cancellableBookings[0]?.bookingId;
  const { data: cancelPreview, isLoading: isPreviewLoading } = useCancellationPreviewQuery(
    effectiveCancelBookingId,
    { enabled: cancelModalOpen && Boolean(effectiveCancelBookingId) }
  );

  // Mutations
  const updateBankMutation = useUpdateCustomerRefundBankInfo();
  const cancelBookingMutation = useCancelBookingMutation();
  const createComplaintMutation = useCreateComplaintRefund();

  // Filtered refunds
  const filteredRefunds = useMemo(() => {
    return allRefunds.filter((r) => {
      if (statusTab === 'NEEDS_BANK' && !r.needsBankInfo) return false;
      if (statusTab === 'PENDING' && r.status !== 'PENDING') return false;
      if (
        statusTab === 'PROCESSED' &&
        r.status !== 'PROCESSED' &&
        r.status !== 'APPROVED'
      ) {
        return false;
      }
      if (
        statusTab === 'REJECTED' &&
        r.status !== 'REJECTED' &&
        r.status !== 'FAILED'
      ) {
        return false;
      }
      if (sourceFilter !== 'ALL' && r.source !== sourceFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchCode = (r.bookingCode || '').toLowerCase().includes(q);
        const matchId = `rf-${r.id}`.includes(q) || String(r.id).includes(q);
        const matchWs = (r.workspaceName || '').toLowerCase().includes(q);
        const matchRef = (r.refundReference || '').toLowerCase().includes(q);
        const matchReason = (r.reason || '').toLowerCase().includes(q);
        if (!matchCode && !matchId && !matchWs && !matchRef && !matchReason) return false;
      }
      return true;
    });
  }, [allRefunds, statusTab, sourceFilter, searchQuery]);

  // Scroll to target refund card by URL id (refundId or bookingId) when data loads
  useEffect(() => {
    if (allRefunds.length === 0) return;
    if (!initialRefundId && !initialBookingId) return;

    const targetKey = `${initialRefundId ?? ''}-${initialBookingId ?? ''}-${initialAction ?? ''}`;
    if (hasScrolledToTargetRef.current === targetKey) return;

    const matched = allRefunds.find(
      (r) =>
        (initialRefundId != null && r.id === Number(initialRefundId)) ||
        (initialBookingId != null && r.bookingId === Number(initialBookingId))
    );
    if (!matched) return;

    hasScrolledToTargetRef.current = targetKey;

    const timer = setTimeout(() => {
      const el =
        document.getElementById(`refund-${matched.id}`) ||
        document.getElementById(`refund-booking-${matched.bookingId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (initialAction === 'bank' && matched.status === 'PENDING') {
        const defaultBin =
          matched.bankBin && REFUND_BANKS.some((b) => b.bin === matched.bankBin)
            ? matched.bankBin
            : '970422';
        const foundBank = REFUND_BANKS.find((b) => b.bin === defaultBin);
        setSelectedRefundForBank(matched);
        setEditBankBin(defaultBin);
        setEditBankName(foundBank?.fullNameVi || matched.bankName || 'MB Bank (Ngân hàng Quân Đội)');
        setEditBankAccountNumber(matched.bankAccountNumber || '');
        setEditBankAccountName(matched.bankAccountName || '');
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [allRefunds, initialRefundId, initialBookingId, initialAction]);

  const handleOpenBankModal = (refund: CustomerRefundItemResponse) => {
    setSelectedRefundForBank(refund);
    const defaultBin =
      refund.bankBin && REFUND_BANKS.some((b) => b.bin === refund.bankBin)
        ? refund.bankBin
        : '970422';
    const foundBank = REFUND_BANKS.find((b) => b.bin === defaultBin);
    setEditBankBin(defaultBin);
    setEditBankName(foundBank?.fullNameVi || refund.bankName || 'MB Bank (Ngân hàng Quân Đội)');
    setEditBankAccountNumber(refund.bankAccountNumber || '');
    setEditBankAccountName(refund.bankAccountName || '');
  };

  const handleSaveBankInfo = async () => {
    if (!selectedRefundForBank) return;
    if (!editBankAccountNumber.trim() || !editBankAccountName.trim()) {
      toast.error(
        isVi
          ? 'Vui lòng nhập đầy đủ số tài khoản và tên chủ tài khoản'
          : 'Please enter both account number and account holder name'
      );
      return;
    }

    try {
      const updated = await updateBankMutation.mutateAsync({
        refundId: selectedRefundForBank.id,
        data: {
          bankBin: editBankBin,
          bankName: editBankName,
          bankAccountNumber: editBankAccountNumber.trim(),
          bankAccountName: editBankAccountName.trim().toUpperCase()
        }
      });

      if (updated.status === 'PROCESSED') {
        toast.success(
          isVi
            ? 'Đã tự động hoàn tiền thành công về tài khoản của bạn!'
            : 'Refund automatically processed to your bank account!',
          {
            description: isVi
              ? `Số tiền ${formatCurrency(updated.approvedAmount || updated.requestedAmount)} đã chuyển về ${updated.bankName} (${updated.bankAccountNumber}).`
              : `Amount ${formatCurrency(updated.approvedAmount || updated.requestedAmount)} sent to ${updated.bankName} (${updated.bankAccountNumber}).`
          }
        );
      } else {
        toast.success(
          isVi
            ? 'Đã cập nhật tài khoản nhận tiền hoàn!'
            : 'Receiving bank account updated!',
          {
            description: `${updated.bankName} • ${updated.bankAccountNumber}`
          }
        );
      }

      setSelectedRefundForBank(null);
      void refetch();
      void refetchKpis();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isVi
            ? 'Không thể cập nhật thông tin tài khoản'
            : 'Failed to update bank account';
      toast.error(isVi ? 'Lỗi cập nhật tài khoản' : 'Update failed', { description: msg });
    }
  };

  const handleConfirmPreBookingCancel = async () => {
    const targetBookingId = effectiveCancelBookingId;
    if (!targetBookingId) {
      toast.error(isVi ? 'Vui lòng chọn đơn đặt chỗ cần hủy' : 'Please select a booking to cancel');
      return;
    }
    const needsBank = (cancelPreview?.refundAmount ?? 0) > 0;
    if (needsBank && (!cancelAccountNumber.trim() || !cancelAccountName.trim())) {
      toast.error(
        isVi
          ? 'Vui lòng điền số tài khoản và tên chủ tài khoản nhận hoàn'
          : 'Please fill in your bank account number and holder name'
      );
      return;
    }

    try {
      await cancelBookingMutation.mutateAsync({
        id: targetBookingId,
        reason:
          cancelReason.trim() ||
          (isVi
            ? 'Khách hàng hủy đơn trước giờ sử dụng'
            : 'Customer cancelled booking prior to start time'),
        bankBin: cancelBankBin,
        bankName: cancelBankName,
        bankAccountNumber: cancelAccountNumber.trim(),
        bankAccountName: cancelAccountName.trim().toUpperCase()
      });

      toast.success(
        isVi
          ? 'Đã hủy đơn & tạo yêu cầu hoàn tiền thành công!'
          : 'Booking cancelled & refund request created!'
      );
      setCancelModalOpen(false);
      setCancelReason('');
      setCancelAccountNumber('');
      setCancelAccountName('');
      void refetch();
      void refetchKpis();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isVi
            ? 'Không thể hủy đơn đặt chỗ'
            : 'Could not cancel booking';
      toast.error(isVi ? 'Không thể hủy đơn' : 'Cancel failed', { description: msg });
    }
  };

  const handleConfirmComplaintRefund = async () => {
    const targetBooking = selectedComplaintBooking;
    if (!targetBooking) {
      toast.error(
        isVi ? 'Vui lòng chọn đơn đặt chỗ cần khiếu nại' : 'Please select a booking to dispute'
      );
      return;
    }
    if (!complaintReason.trim()) {
      toast.error(
        isVi
          ? 'Vui lòng mô tả lý do khiếu nại yêu cầu hoàn tiền'
          : 'Please describe the reason for your refund claim'
      );
      return;
    }
    if (!complaintAccountNumber.trim() || !complaintAccountName.trim()) {
      toast.error(
        isVi
          ? 'Vui lòng nhập số tài khoản và tên chủ tài khoản nhận hoàn'
          : 'Please enter your bank account number and holder name'
      );
      return;
    }

    let requestedAmount = targetBooking.totalAmount;
    if (complaintAmountRatio === '50') {
      requestedAmount = Math.round(targetBooking.totalAmount * 0.5);
    } else if (complaintAmountRatio === 'CUSTOM') {
      const parsed = Number(complaintCustomAmount.replace(/\D/g, ''));
      if (!parsed || parsed < 1000 || parsed > targetBooking.totalAmount) {
        toast.error(
          isVi
            ? `Số tiền hoàn phải từ 1.000 ₫ đến ${formatCurrency(targetBooking.totalAmount)}`
            : `Refund amount must be between 1,000 ₫ and ${formatCurrency(targetBooking.totalAmount)}`
        );
        return;
      }
      requestedAmount = parsed;
    }

    try {
      await createComplaintMutation.mutateAsync({
        bookingId: targetBooking.bookingId,
        requestedAmount,
        reason: complaintReason.trim(),
        bankBin: complaintBankBin,
        bankName: complaintBankName,
        bankAccountNumber: complaintAccountNumber.trim(),
        bankAccountName: complaintAccountName.trim().toUpperCase()
      });

      toast.success(
        isVi
          ? 'Đã gửi khiếu nại yêu cầu hoàn tiền!'
          : 'Refund claim submitted successfully!',
        {
          description: isVi
            ? `Yêu cầu hoàn ${formatCurrency(requestedAmount)} cho đơn #${targetBooking.bookingCode} đang được xử lý.`
            : `Claim for ${formatCurrency(requestedAmount)} on #${targetBooking.bookingCode} is under review.`
        }
      );
      setComplaintModalOpen(false);
      setComplaintReason('');
      setComplaintAccountNumber('');
      setComplaintAccountName('');
      void refetch();
      void refetchKpis();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isVi
            ? 'Không thể gửi yêu cầu khiếu nại'
            : 'Could not submit refund claim';
      toast.error(isVi ? 'Gửi khiếu nại thất bại' : 'Submission failed', { description: msg });
    }
  };

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedId(key);
    toast.success(isVi ? `Đã sao chép: ${val}` : `Copied: ${val}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const needsBankCount =
    kpis?.needsBankInfoCount ?? allRefunds.filter((r) => r.needsBankInfo).length;

  return (
    <div className='bg-background text-foreground flex min-h-screen flex-col antialiased selection:bg-primary/20 relative'>
      <div
        className='pointer-events-none fixed inset-0 z-0 opacity-40 dark:opacity-20'
        style={{
          backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      <WorkspaceHeader />

      <main className='relative z-10 mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 lg:px-8'>
        {/* Breadcrumb */}
        <div className='flex items-center gap-1.5 text-xs text-muted-foreground mb-6'>
          <Link to='/' className='hover:text-foreground transition-colors'>
            {isVi ? 'Trang chủ' : 'Home'}
          </Link>
          <ChevronRight className='h-3.5 w-3.5' />
          <Link to='/workspaces/my-bookings' className='hover:text-foreground transition-colors'>
            {isVi ? 'Đơn đặt chỗ của tôi' : 'My Bookings'}
          </Link>
          <ChevronRight className='h-3.5 w-3.5' />
          <span className='font-medium text-foreground'>
            {isVi ? 'Hoàn tiền của tôi' : 'My Refunds'}
          </span>
        </div>

        {/* Page Title & Action Controls */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-border/80 pb-6'>
          <div>
            <div className='flex items-center gap-3 mb-1.5'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                <RotateCcw className='h-5 w-5' />
              </div>
              <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
                {isVi ? 'Hoàn tiền của tôi' : 'My Refunds'}
              </h1>
            </div>
            <p className='text-muted-foreground text-xs sm:text-sm max-w-2xl'>
              {isVi
                ? 'Theo dõi trạng thái hoàn tiền, tài khoản ngân hàng thụ hưởng và gửi yêu cầu hoàn tiền cho đơn đặt chỗ.'
                : 'Track your refund status, receiving bank accounts, and submit refund requests for your bookings.'}
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2.5'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                void refetch();
                void refetchKpis();
              }}
              disabled={isFetching}
              className='gap-1.5 text-xs font-semibold h-9 rounded-xl border-border cursor-pointer'
            >
              {isFetching ? <Loader2 className='h-3.5 w-3.5' /> : <Clock className='h-3.5 w-3.5' />}
              <span>{isVi ? 'Làm mới' : 'Refresh'}</span>
            </Button>

            <Button
              variant='outline'
              size='sm'
              onClick={() => setCancelModalOpen(true)}
              className='gap-1.5 text-xs font-semibold h-9 rounded-xl border-border hover:bg-muted cursor-pointer'
            >
              <Ban className='h-3.5 w-3.5 text-sky-600' />
              <span>{isVi ? 'Hủy đơn trước giờ' : 'Cancel Upcoming'}</span>
            </Button>

            <Button
              size='sm'
              onClick={() => setComplaintModalOpen(true)}
              className='gap-1.5 text-xs font-semibold h-9 rounded-xl shadow-xs cursor-pointer'
            >
              <AlertCircle className='h-3.5 w-3.5' />
              <span>{isVi ? 'Khiếu nại hoàn tiền' : 'Dispute & Refund'}</span>
            </Button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6'>
          <div className='bg-card border-border/80 rounded-2xl border p-4 shadow-2xs flex items-center justify-between'>
            <div>
              <p className='text-xs text-muted-foreground font-medium'>
                {isVi ? 'Tổng yêu cầu' : 'Total Requests'}
              </p>
              <p className='text-xl sm:text-2xl font-bold text-foreground mt-0.5'>
                {kpis?.totalCount ?? allRefunds.length}
              </p>
              <p className='text-[11px] text-muted-foreground mt-0.5'>
                {formatCurrency(
                  kpis?.totalRequestedAmount ??
                    allRefunds.reduce((s, r) => s + (r.requestedAmount || 0), 0)
                )}
              </p>
            </div>
            <div className='h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0'>
              <FileText className='h-5 w-5' />
            </div>
          </div>

          <div className='bg-card border-border/80 rounded-2xl border p-4 shadow-2xs flex items-center justify-between'>
            <div>
              <p className='text-xs text-muted-foreground font-medium'>
                {isVi ? 'Đã hoàn về TK' : 'Refunded'}
              </p>
              <p className='text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5'>
                {kpis?.processedCount ??
                  allRefunds.filter((r) => r.status === 'PROCESSED' || r.status === 'APPROVED')
                    .length}
              </p>
              <p className='text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5'>
                {formatCurrency(
                  kpis?.totalRefundedAmount ??
                    allRefunds
                      .filter((r) => r.status === 'PROCESSED' || r.status === 'APPROVED')
                      .reduce((s, r) => s + (r.approvedAmount || r.requestedAmount || 0), 0)
                )}
              </p>
            </div>
            <div className='h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0'>
              <CheckCircle2 className='h-5 w-5' />
            </div>
          </div>

          <div className='bg-card border-border/80 rounded-2xl border p-4 shadow-2xs flex items-center justify-between'>
            <div>
              <p className='text-xs text-muted-foreground font-medium'>
                {isVi ? 'Đang xử lý' : 'In Progress'}
              </p>
              <p className='text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5'>
                {kpis?.pendingCount ?? allRefunds.filter((r) => r.status === 'PENDING').length}
              </p>
              <p className='text-[11px] text-muted-foreground mt-0.5'>
                {isVi ? 'Chờ chuyển khoản' : 'Awaiting payout'}
              </p>
            </div>
            <div className='h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0'>
              <Clock3 className='h-5 w-5' />
            </div>
          </div>

          <div
            className={`bg-card rounded-2xl border p-4 shadow-2xs flex items-center justify-between ${
              needsBankCount > 0 ? 'border-rose-500/40 bg-rose-500/5' : 'border-border/80'
            }`}
          >
            <div>
              <p className='text-xs text-muted-foreground font-medium'>
                {isVi ? 'Cần điền STK' : 'Needs Bank Info'}
              </p>
              <p
                className={`text-xl sm:text-2xl font-bold mt-0.5 ${
                  needsBankCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                }`}
              >
                {needsBankCount}
              </p>
              <p className='text-[11px] text-muted-foreground mt-0.5'>
                {isVi ? 'MB, ACB, KienlongBank...' : 'Add receiving account'}
              </p>
            </div>
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                needsBankCount > 0
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <CreditCard className='h-5 w-5' />
            </div>
          </div>
        </div>

        {/* Filter Bar: Status Tabs + Reason Select + Search */}
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6'>
          <Tabs
            value={statusTab}
            onValueChange={(v) => setStatusTab(v as typeof statusTab)}
            className='w-full lg:w-auto'
          >
            <TabsList className='bg-muted/60 p-1 rounded-xl border border-border/70 h-auto flex flex-wrap gap-1'>
              <TabsTrigger
                value='ALL'
                className='rounded-lg text-xs font-medium px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs'
              >
                {isVi ? 'Tất cả' : 'All'} ({allRefunds.length})
              </TabsTrigger>
              {needsBankCount > 0 && (
                <TabsTrigger
                  value='NEEDS_BANK'
                  className='rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs text-rose-600 dark:text-rose-400'
                >
                  {isVi ? 'Cần điền STK' : 'Needs Bank'} ({needsBankCount})
                </TabsTrigger>
              )}
              <TabsTrigger
                value='PENDING'
                className='rounded-lg text-xs font-medium px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs'
              >
                {isVi ? 'Đang xử lý' : 'In Progress'} (
                {allRefunds.filter((r) => r.status === 'PENDING').length})
              </TabsTrigger>
              <TabsTrigger
                value='PROCESSED'
                className='rounded-lg text-xs font-medium px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs'
              >
                {isVi ? 'Đã hoàn tiền' : 'Refunded'} (
                {
                  allRefunds.filter(
                    (r) => r.status === 'PROCESSED' || r.status === 'APPROVED'
                  ).length
                }
                )
              </TabsTrigger>
              <TabsTrigger
                value='REJECTED'
                className='rounded-lg text-xs font-medium px-3 py-1.5 data-[state=active]:bg-card data-[state=active]:shadow-xs'
              >
                {isVi ? 'Từ chối' : 'Rejected'} (
                {allRefunds.filter((r) => r.status === 'REJECTED').length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5'>
            <select
              aria-label={isVi ? 'Lọc theo loại hoàn tiền' : 'Filter by refund type'}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as 'ALL' | RefundSourceType)}
              className='h-9 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary'
            >
              <option value='ALL'>
                {isVi ? 'Tất cả loại hoàn tiền' : 'All Refund Types'}
              </option>
              <option value='PAYMENT_DISCREPANCY'>
                {isVi ? 'Tự động hoàn (Thanh toán sau Hold)' : 'Auto-Refund (Paid After Hold)'}
              </option>
              <option value='CUSTOMER_CANCEL'>
                {isVi ? 'Hủy trước giờ đặt chỗ' : 'Pre-Booking Cancellation'}
              </option>
              <option value='ADMIN_DISPUTE'>
                {isVi ? 'Khiếu nại sau sử dụng' : 'Post-Usage Claim'}
              </option>
              <option value='ORGANIZER_CANCEL'>
                {isVi ? 'Chủ không gian hủy đơn' : 'Host Cancellation'}
              </option>
            </select>

            <div className='relative w-full sm:w-64'>
              <Search className='pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground' />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isVi
                    ? 'Tìm mã #RF, mã đơn, không gian...'
                    : 'Search #RF, booking code, hub...'
                }
                className='h-9 pl-9 text-xs rounded-xl bg-card'
              />
            </div>
          </div>
        </div>

        {/* Refund Cards List */}
        {isLoading ? (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <Loader2 className='h-8 w-8 text-primary mb-3' />
            <p className='text-sm text-muted-foreground'>
              {isVi
                ? 'Đang tải danh sách yêu cầu hoàn tiền...'
                : 'Loading your refund requests...'}
            </p>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className='bg-card border-border/80 rounded-2xl border p-12 text-center shadow-xs max-w-lg mx-auto my-8'>
            <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4'>
              <RotateCcw className='h-7 w-7' />
            </div>
            <h3 className='text-lg font-bold mb-1'>
              {isVi ? 'Chưa có yêu cầu hoàn tiền nào' : 'No refund requests found'}
            </h3>
            <p className='text-xs text-muted-foreground mb-6 leading-relaxed'>
              {isVi
                ? 'Khi phát sinh hoàn tiền tự động do chuyển khoản sau thời gian giữ chỗ, hủy đơn trước giờ, hoặc khiếu nại dịch vụ, mọi thông tin sẽ hiển thị tại đây.'
                : 'Any automatic refunds from late post-hold payments, pre-booking cancellations, or service claims will appear here.'}
            </p>
            <div className='flex flex-wrap items-center justify-center gap-2.5'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setCancelModalOpen(true)}
                className='text-xs font-semibold h-9 rounded-xl cursor-pointer'
              >
                {isVi ? 'Hủy đơn trước giờ' : 'Cancel Upcoming Booking'}
              </Button>
              <Button
                size='sm'
                onClick={() => setComplaintModalOpen(true)}
                className='text-xs font-semibold h-9 rounded-xl cursor-pointer'
              >
                {isVi ? 'Khiếu nại hoàn tiền' : 'Submit Refund Claim'}
              </Button>
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-4'>
            {filteredRefunds.map((refund) => {
              const isProcessed =
                refund.status === 'PROCESSED' || refund.status === 'APPROVED';
              const isPending = refund.status === 'PENDING';
              const accRevealed = revealedAccounts[refund.id] ?? false;
              const effectiveRefundAmount =
                refund.approvedAmount ?? refund.requestedAmount ?? 0;
              const originalPaid =
                refund.originalPaidAmount || refund.requestedAmount || effectiveRefundAmount;
              const refundPercent =
                originalPaid > 0
                  ? Math.round((effectiveRefundAmount / originalPaid) * 100)
                  : 100;
              const scheduleText = formatScheduleWindow(
                refund.bookingStartTime,
                refund.bookingEndTime,
                isVi
              );

              const isTargetHighlighted =
                (initialRefundId != null && refund.id === Number(initialRefundId)) ||
                (initialBookingId != null && refund.bookingId === Number(initialBookingId));

              return (
                <div
                  key={refund.id}
                  id={`refund-${refund.id}`}
                  data-booking-anchor={`refund-booking-${refund.bookingId}`}
                  className={`scroll-mt-28 bg-card hover:border-border transition-all duration-300 rounded-2xl border p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
                    isTargetHighlighted
                      ? 'border-primary ring-2 ring-primary/30 bg-primary/[0.02] shadow-md'
                      : refund.needsBankInfo
                        ? 'border-rose-500/40'
                        : isProcessed
                          ? 'border-emerald-500/25'
                          : 'border-border/80'
                  }`}
                >
                  {/* Left: Main Booking & Refund Info */}
                  <div
                    id={`refund-booking-${refund.bookingId}`}
                    className='scroll-mt-28 flex-1 space-y-3.5 min-w-0'
                  >
                    {/* Badges Row */}
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20'>
                        #RF-{refund.id}
                      </span>
                      <span className='font-mono text-xs font-semibold text-foreground bg-muted/80 px-2 py-0.5 rounded-md border border-border/60'>
                        #{refund.bookingCode}
                      </span>
                      {renderSourceBadge(refund.source, isVi)}
                      {renderStatusBadge(refund, isVi)}
                    </div>

                    {/* Workspace Title & Address */}
                    <div>
                      <div className='flex items-center gap-2 mb-1'>
                        <Building2 className='h-4 w-4 text-primary shrink-0' />
                        <h3 className='text-base sm:text-lg font-bold text-foreground truncate'>
                          {refund.workspaceName || 'NexSpace Workspace'}
                        </h3>
                      </div>
                      {refund.workspaceAddress && (
                        <div className='flex items-center gap-1.5 text-xs text-muted-foreground pl-6'>
                          <MapPin className='h-3.5 w-3.5 text-muted-foreground/70 shrink-0' />
                          <span className='truncate'>{refund.workspaceAddress}</span>
                        </div>
                      )}
                    </div>

                    {/* Seat, Schedule & Timestamps Row */}
                    <div className='flex flex-wrap items-center gap-x-4 gap-y-2 pt-0.5 pl-6 text-xs'>
                      <div className='bg-primary/10 text-primary px-2.5 py-1 rounded-md font-semibold'>
                        {refund.resourceName || refund.seatCode || (isVi ? 'Chỗ ngồi' : 'Workspace Seat')}
                      </div>
                      {scheduleText && (
                        <div className='flex items-center gap-1.5 text-muted-foreground'>
                          <Clock className='h-3.5 w-3.5' />
                          <span className='font-medium text-foreground'>{scheduleText}</span>
                        </div>
                      )}
                      <div className='text-muted-foreground'>
                        {isVi ? 'Tạo lúc:' : 'Requested:'}{' '}
                        <span className='font-medium text-foreground'>
                          {formatExactDateTime(refund.createdAt, isVi)}
                        </span>
                      </div>
                      {refund.processedAt && (
                        <div className='text-emerald-700 dark:text-emerald-400 font-semibold'>
                          {isVi ? 'Hoàn tất lúc:' : 'Refunded at:'}{' '}
                          <span>{formatExactDateTime(refund.processedAt, isVi)}</span>
                        </div>
                      )}
                    </div>

                    {/* Inline Action Prompt if Bank Account is needed */}
                    {refund.needsBankInfo && (
                      <div className='ml-6 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs'>
                        <div className='flex items-center gap-2 text-rose-800 dark:text-rose-200'>
                          <AlertCircle className='h-4 w-4 text-rose-600 shrink-0' />
                          <span>
                            {isVi
                              ? 'Vui lòng điền tài khoản nhận tiền hoàn (Hỗ trợ tự động: MB Bank, ACB, KienlongBank).'
                              : 'Please add your receiving bank account (Auto-refund supported: MB Bank, ACB, KienlongBank).'}
                          </span>
                        </div>
                        <button
                          type='button'
                          onClick={() => handleOpenBankModal(refund)}
                          className='text-rose-700 dark:text-rose-300 font-bold underline underline-offset-2 shrink-0 cursor-pointer text-left sm:text-right'
                        >
                          {isVi ? 'Điền STK ngay →' : 'Add Account →'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Refund Amount, Receiving Bank Pill & Actions */}
                  <div className='flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border/60'>
                    {/* Amount Display */}
                    <div className='flex sm:flex-col items-baseline sm:items-end justify-between gap-2'>
                      <div className='text-right'>
                        <span className='text-[11px] text-muted-foreground block'>
                          {isProcessed
                            ? isVi
                              ? `Đã hoàn (${refundPercent}%)`
                              : `Refunded (${refundPercent}%)`
                            : isVi
                              ? `Số tiền hoàn (${refundPercent}%)`
                              : `Refund Amount (${refundPercent}%)`}
                        </span>
                        <span className='text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400'>
                          +{formatCurrency(effectiveRefundAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Receiving Bank Pill */}
                    {refund.bankName && refund.bankAccountNumber && (
                      <div className='bg-muted/40 border-border/80 flex items-center justify-between gap-2.5 rounded-xl border px-3 py-1.5 text-xs'>
                        <div className='flex items-center gap-1.5 min-w-0'>
                          <CreditCard className='h-3.5 w-3.5 text-primary shrink-0' />
                          <span className='font-semibold text-foreground truncate max-w-[120px]'>
                            {refund.bankName.split('(')[0].trim()}
                          </span>
                          <span className='font-mono font-bold text-foreground'>
                            {maskAccountNumber(refund.bankAccountNumber, accRevealed)}
                          </span>
                        </div>
                        <div className='flex items-center gap-0.5'>
                          <button
                            type='button'
                            onClick={() =>
                              setRevealedAccounts((prev) => ({
                                ...prev,
                                [refund.id]: !prev[refund.id]
                              }))
                            }
                            className='text-muted-foreground hover:text-foreground p-1 cursor-pointer'
                            title={
                              accRevealed
                                ? isVi
                                  ? 'Ẩn số TK'
                                  : 'Hide Account'
                                : isVi
                                  ? 'Hiện số TK'
                                  : 'Show Account'
                            }
                          >
                            {accRevealed ? (
                              <EyeOff className='h-3.5 w-3.5' />
                            ) : (
                              <Eye className='h-3.5 w-3.5' />
                            )}
                          </button>
                          <button
                            type='button'
                            onClick={() =>
                              handleCopy(refund.bankAccountNumber!, `acc-${refund.id}`)
                            }
                            className='text-muted-foreground hover:text-primary p-1 cursor-pointer'
                            title={isVi ? 'Sao chép STK' : 'Copy Account Number'}
                          >
                            {copiedId === `acc-${refund.id}` ? (
                              <Check className='h-3.5 w-3.5 text-emerald-600' />
                            ) : (
                              <Copy className='h-3.5 w-3.5' />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className='flex flex-wrap items-center gap-2'>
                      {isPending && (
                        <Button
                          size='sm'
                          variant={refund.needsBankInfo ? 'default' : 'outline'}
                          onClick={() => handleOpenBankModal(refund)}
                          className={`h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer ${
                            refund.needsBankInfo
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : ''
                          }`}
                        >
                          <CreditCard className='h-3.5 w-3.5' />
                          <span>
                            {refund.needsBankInfo
                              ? isVi
                                ? 'Điền TK nhận hoàn'
                                : 'Add Bank Info'
                              : isVi
                                ? 'Đổi TK nhận'
                                : 'Change Bank'}
                          </span>
                        </Button>
                      )}

                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => setSelectedRefundDetail(refund)}
                        className='h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-border hover:bg-muted'
                      >
                        <span>{isVi ? 'Xem chi tiết' : 'Details'}</span>
                        <ArrowRight className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal 1: Add / Edit Receiving Bank Account */}
      {selectedRefundForBank && (
        <Dialog
          open={Boolean(selectedRefundForBank)}
          onOpenChange={(open) => !open && setSelectedRefundForBank(null)}
        >
          <DialogContent className='sm:max-w-md rounded-2xl'>
            <DialogHeader>
              <DialogTitle className='text-base font-bold flex items-center gap-2'>
                <CreditCard className='h-4 w-4 text-primary' />
                <span>
                  {isVi
                    ? 'Tài khoản ngân hàng nhận tiền hoàn'
                    : 'Receiving Bank Account'}
                </span>
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                #RF-{selectedRefundForBank.id} • #{selectedRefundForBank.bookingCode} •{' '}
                <strong className='text-emerald-600 dark:text-emerald-400'>
                  {formatCurrency(
                    selectedRefundForBank.approvedAmount ??
                      selectedRefundForBank.requestedAmount
                  )}
                </strong>
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3.5 py-2 text-xs'>
              <div className='rounded-xl border border-primary/25 bg-primary/5 p-3 flex items-center gap-2.5'>
                <Sparkles className='h-4 w-4 text-primary shrink-0' />
                <span className='text-muted-foreground leading-snug'>
                  {isVi
                    ? 'Hỗ trợ hoàn tiền tự động 24/7 qua PayOS đối với: MB Bank, ACB, KienlongBank.'
                    : 'Instant 24/7 auto-refund via PayOS supported for: MB Bank, ACB, KienlongBank.'}
                </span>
              </div>

              <div className='space-y-1.5'>
                <label htmlFor='edit-bank-bin' className='font-semibold text-foreground block'>
                  {isVi ? 'Ngân hàng nhận (*):' : 'Bank (*):'}
                </label>
                <select
                  id='edit-bank-bin'
                  value={editBankBin}
                  onChange={(e) => {
                    const bin = e.target.value;
                    setEditBankBin(bin);
                    const found = REFUND_BANKS.find((b) => b.bin === bin);
                    if (found) setEditBankName(isVi ? found.fullNameVi : found.fullNameEn);
                  }}
                  className='w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                >
                  {REFUND_BANKS.map((b) => (
                    <option key={b.bin} value={b.bin}>
                      {isVi ? b.fullNameVi : b.fullNameEn}
                      {b.autoSupported
                        ? isVi
                          ? ' ⚡ (Hoàn tự động PayOS)'
                          : ' ⚡ (PayOS Auto-Refund)'
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className='space-y-1.5'>
                <label
                  htmlFor='edit-bank-account-num'
                  className='font-semibold text-foreground block'
                >
                  {isVi ? 'Số tài khoản (*):' : 'Account Number (*):'}
                </label>
                <input
                  id='edit-bank-account-num'
                  type='text'
                  value={editBankAccountNumber}
                  onChange={(e) => setEditBankAccountNumber(e.target.value)}
                  placeholder={isVi ? 'VD: 0987654321' : 'e.g. 0987654321'}
                  className='w-full rounded-xl border border-border bg-background p-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                />
              </div>

              <div className='space-y-1.5'>
                <label
                  htmlFor='edit-bank-account-name'
                  className='font-semibold text-foreground block'
                >
                  {isVi ? 'Tên chủ tài khoản (Không dấu) (*):' : 'Account Holder Name (*):'}
                </label>
                <input
                  id='edit-bank-account-name'
                  type='text'
                  value={editBankAccountName}
                  onChange={(e) => setEditBankAccountName(e.target.value)}
                  placeholder={isVi ? 'VD: NGUYEN VAN A' : 'e.g. NGUYEN VAN A'}
                  className='w-full rounded-xl border border-border bg-background p-2.5 text-xs uppercase text-foreground focus:outline-none focus:ring-2 focus:ring-primary'
                />
              </div>
            </div>

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setSelectedRefundForBank(null)}
                disabled={updateBankMutation.isPending}
                className='text-xs h-9 rounded-xl cursor-pointer'
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </Button>
              <Button
                size='sm'
                onClick={handleSaveBankInfo}
                disabled={updateBankMutation.isPending}
                className='text-xs h-9 rounded-xl font-semibold gap-1.5 cursor-pointer'
              >
                {updateBankMutation.isPending && <Loader2 className='h-3.5 w-3.5' />}
                <span>{isVi ? 'Lưu & Nhận tiền hoàn' : 'Save & Receive Refund'}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal 2: Pre-Booking Cancellation & Refund */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className='sm:max-w-lg rounded-2xl'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <Ban className='h-4 w-4 text-sky-600' />
              <span>
                {isVi
                  ? 'Hủy đơn đặt chỗ trước giờ & Hoàn tiền'
                  : 'Cancel Upcoming Booking & Refund'}
              </span>
            </DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              {isVi
                ? 'Áp dụng cho các đơn đã xác nhận nhưng chưa tới thời gian sử dụng.'
                : 'Applicable for confirmed bookings prior to their scheduled start time.'}
            </DialogDescription>
          </DialogHeader>

          {cancellableBookings.length === 0 ? (
            <div className='py-6 text-center space-y-2 text-xs text-muted-foreground'>
              <p className='font-semibold text-foreground'>
                {isVi
                  ? 'Không có đơn đặt chỗ nào ở trạng thái Đã xác nhận để hủy.'
                  : 'You have no confirmed upcoming bookings available to cancel.'}
              </p>
            </div>
          ) : (
            <div className='space-y-3.5 py-2 text-xs'>
              <div>
                <label
                  htmlFor='cancel-booking-select'
                  className='font-semibold text-foreground block mb-1'
                >
                  {isVi ? 'Chọn đơn đặt chỗ (*):' : 'Select Booking (*):'}
                </label>
                <select
                  id='cancel-booking-select'
                  value={effectiveCancelBookingId}
                  onChange={(e) => setCancelBookingId(Number(e.target.value))}
                  className='w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground'
                >
                  {cancellableBookings.map((b) => (
                    <option key={b.bookingId} value={b.bookingId}>
                      #{b.bookingCode} — {b.workspaceName} ({b.resourceName}) •{' '}
                      {formatCurrency(b.totalAmount)}
                    </option>
                  ))}
                </select>
              </div>

              {isPreviewLoading ? (
                <div className='flex items-center gap-2 p-3 rounded-xl bg-muted/40 text-muted-foreground'>
                  <Loader2 className='h-4 w-4 text-primary' />
                  <span>
                    {isVi
                      ? 'Đang tính số tiền hoàn theo chính sách...'
                      : 'Calculating policy refund...'}
                  </span>
                </div>
              ) : cancelPreview ? (
                <div className='rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-1'>
                  <div className='flex items-center justify-between'>
                    <span className='font-semibold text-foreground'>
                      {isVi ? 'Số tiền hoàn dự kiến:' : 'Estimated Refund:'}
                    </span>
                    <span className='text-sm font-bold text-emerald-600 dark:text-emerald-400'>
                      {formatCurrency(cancelPreview.refundAmount || 0)} (
                      {cancelPreview.refundPercent}%)
                    </span>
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    {cancelPreview.cancellationPolicyExplanation}
                  </p>
                </div>
              ) : null}

              <div className='space-y-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3'>
                <span className='font-semibold text-foreground block'>
                  {isVi ? 'Tài khoản nhận tiền hoàn:' : 'Receiving Bank Account:'}
                </span>
                <div>
                  <label
                    htmlFor='cancel-bank-bin'
                    className='text-[11px] text-muted-foreground block mb-0.5'
                  >
                    {isVi ? 'Ngân hàng:' : 'Bank:'}
                  </label>
                  <select
                    id='cancel-bank-bin'
                    value={cancelBankBin}
                    onChange={(e) => {
                      const bin = e.target.value;
                      setCancelBankBin(bin);
                      const found = REFUND_BANKS.find((b) => b.bin === bin);
                      if (found) setCancelBankName(isVi ? found.fullNameVi : found.fullNameEn);
                    }}
                    className='w-full rounded-lg border border-border bg-background p-2 text-xs'
                  >
                    {REFUND_BANKS.map((b) => (
                      <option key={b.bin} value={b.bin}>
                        {isVi ? b.fullNameVi : b.fullNameEn}
                        {b.autoSupported ? ' ⚡' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <label
                      htmlFor='cancel-acc-num'
                      className='text-[11px] text-muted-foreground block mb-0.5'
                    >
                      {isVi ? 'Số tài khoản (*):' : 'Account Number (*):'}
                    </label>
                    <input
                      id='cancel-acc-num'
                      type='text'
                      value={cancelAccountNumber}
                      onChange={(e) => setCancelAccountNumber(e.target.value)}
                      placeholder='0987654321'
                      className='w-full rounded-lg border border-border bg-background p-2 text-xs font-mono'
                    />
                  </div>
                  <div>
                    <label
                      htmlFor='cancel-acc-name'
                      className='text-[11px] text-muted-foreground block mb-0.5'
                    >
                      {isVi ? 'Chủ tài khoản (*):' : 'Account Holder (*):'}
                    </label>
                    <input
                      id='cancel-acc-name'
                      type='text'
                      value={cancelAccountName}
                      onChange={(e) => setCancelAccountName(e.target.value)}
                      placeholder='NGUYEN VAN A'
                      className='w-full rounded-lg border border-border bg-background p-2 text-xs uppercase'
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor='cancel-reason-input'
                  className='font-semibold text-foreground block mb-1'
                >
                  {isVi ? 'Lý do hủy:' : 'Cancellation Reason:'}
                </label>
                <textarea
                  id='cancel-reason-input'
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={
                    isVi ? 'Nhập lý do thay đổi lịch trình...' : 'Reason for cancellation...'
                  }
                  className='w-full rounded-xl border border-border bg-background p-2.5 text-xs'
                />
              </div>
            </div>
          )}

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setCancelModalOpen(false)}
              className='text-xs h-9 rounded-xl cursor-pointer'
            >
              {isVi ? 'Đóng' : 'Close'}
            </Button>
            {cancellableBookings.length > 0 && (
              <Button
                size='sm'
                onClick={handleConfirmPreBookingCancel}
                disabled={cancelBookingMutation.isPending}
                className='bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 rounded-xl font-semibold gap-1.5 cursor-pointer'
              >
                {cancelBookingMutation.isPending && <Loader2 className='h-3.5 w-3.5' />}
                <span>
                  {isVi ? 'Xác nhận hủy & Hoàn tiền' : 'Confirm Cancel & Refund'}
                </span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Post-Usage Complaint & Refund Claim */}
      <Dialog open={complaintModalOpen} onOpenChange={setComplaintModalOpen}>
        <DialogContent className='sm:max-w-lg rounded-2xl'>
          <DialogHeader>
            <DialogTitle className='text-base font-bold flex items-center gap-2'>
              <AlertCircle className='h-4 w-4 text-amber-600' />
              <span>
                {isVi
                  ? 'Khiếu nại dịch vụ & Yêu cầu hoàn tiền'
                  : 'Service Dispute & Refund Claim'}
              </span>
            </DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              {isVi
                ? 'Dành cho các đơn đã sử dụng nhưng gặp sự cố về không gian hoặc chất lượng dịch vụ.'
                : 'For past or active bookings that experienced workspace or service quality issues.'}
            </DialogDescription>
          </DialogHeader>

          {complainableBookings.length === 0 ? (
            <div className='py-6 text-center space-y-2 text-xs text-muted-foreground'>
              <p className='font-semibold text-foreground'>
                {isVi
                  ? 'Không có đơn đặt chỗ nào đủ điều kiện gửi khiếu nại mới.'
                  : 'No eligible bookings found for a new refund claim.'}
              </p>
            </div>
          ) : (
            <div className='space-y-3.5 py-2 text-xs'>
              <div>
                <label
                  htmlFor='complaint-booking-select'
                  className='font-semibold text-foreground block mb-1'
                >
                  {isVi ? 'Chọn đơn đặt chỗ (*):' : 'Select Booking (*):'}
                </label>
                <select
                  id='complaint-booking-select'
                  value={selectedComplaintBooking?.bookingId}
                  onChange={(e) => setComplaintBookingId(Number(e.target.value))}
                  className='w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground'
                >
                  {complainableBookings.map((b) => (
                    <option key={b.bookingId} value={b.bookingId}>
                      #{b.bookingCode} — {b.workspaceName} ({b.resourceName}) •{' '}
                      {formatCurrency(b.totalAmount)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedComplaintBooking && (
                <div className='space-y-1.5'>
                  <span className='font-semibold text-foreground block'>
                    {isVi ? 'Mức hoàn tiền yêu cầu (*):' : 'Requested Refund (*):'}
                  </span>
                  <div className='grid grid-cols-3 gap-2'>
                    <button
                      type='button'
                      onClick={() => setComplaintAmountRatio('100')}
                      className={`rounded-xl border p-2 text-center cursor-pointer transition-all ${
                        complaintAmountRatio === '100'
                          ? 'border-primary bg-primary/10 font-bold text-primary'
                          : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      100% ({formatCurrency(selectedComplaintBooking.totalAmount)})
                    </button>
                    <button
                      type='button'
                      onClick={() => setComplaintAmountRatio('50')}
                      className={`rounded-xl border p-2 text-center cursor-pointer transition-all ${
                        complaintAmountRatio === '50'
                          ? 'border-primary bg-primary/10 font-bold text-primary'
                          : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      50% (
                      {formatCurrency(Math.round(selectedComplaintBooking.totalAmount * 0.5))})
                    </button>
                    <button
                      type='button'
                      onClick={() => setComplaintAmountRatio('CUSTOM')}
                      className={`rounded-xl border p-2 text-center cursor-pointer transition-all ${
                        complaintAmountRatio === 'CUSTOM'
                          ? 'border-primary bg-primary/10 font-bold text-primary'
                          : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      {isVi ? 'Số tiền khác' : 'Custom Amount'}
                    </button>
                  </div>
                  {complaintAmountRatio === 'CUSTOM' && (
                    <input
                      type='number'
                      value={complaintCustomAmount}
                      onChange={(e) => setComplaintCustomAmount(e.target.value)}
                      placeholder={
                        isVi
                          ? `Nhập số tiền (tối đa ${selectedComplaintBooking.totalAmount} đ)`
                          : `Enter amount (max ${selectedComplaintBooking.totalAmount} VND)`
                      }
                      className='w-full rounded-xl border border-border bg-background p-2.5 text-xs font-mono mt-1.5'
                    />
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor='complaint-reason-input'
                  className='font-semibold text-foreground block mb-1'
                >
                  {isVi ? 'Lý do khiếu nại (*):' : 'Claim Reason (*):'}
                </label>
                <textarea
                  id='complaint-reason-input'
                  rows={2}
                  value={complaintReason}
                  onChange={(e) => setComplaintReason(e.target.value)}
                  placeholder={
                    isVi
                      ? 'Mô tả sự cố bạn gặp phải tại không gian...'
                      : 'Describe the issue experienced during your session...'
                  }
                  className='w-full rounded-xl border border-border bg-background p-2.5 text-xs'
                />
              </div>

              <div className='space-y-2.5 rounded-xl border border-primary/25 bg-primary/5 p-3'>
                <span className='font-semibold text-foreground block'>
                  {isVi ? 'Tài khoản nhận tiền hoàn:' : 'Receiving Bank Account:'}
                </span>
                <div>
                  <label
                    htmlFor='complaint-bank-bin'
                    className='text-[11px] text-muted-foreground block mb-0.5'
                  >
                    {isVi ? 'Ngân hàng:' : 'Bank:'}
                  </label>
                  <select
                    id='complaint-bank-bin'
                    value={complaintBankBin}
                    onChange={(e) => {
                      const bin = e.target.value;
                      setComplaintBankBin(bin);
                      const found = REFUND_BANKS.find((b) => b.bin === bin);
                      if (found) setComplaintBankName(isVi ? found.fullNameVi : found.fullNameEn);
                    }}
                    className='w-full rounded-lg border border-border bg-background p-2 text-xs'
                  >
                    {REFUND_BANKS.map((b) => (
                      <option key={b.bin} value={b.bin}>
                        {isVi ? b.fullNameVi : b.fullNameEn}
                        {b.autoSupported ? ' ⚡' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <label
                      htmlFor='complaint-acc-num'
                      className='text-[11px] text-muted-foreground block mb-0.5'
                    >
                      {isVi ? 'Số tài khoản (*):' : 'Account Number (*):'}
                    </label>
                    <input
                      id='complaint-acc-num'
                      type='text'
                      value={complaintAccountNumber}
                      onChange={(e) => setComplaintAccountNumber(e.target.value)}
                      placeholder='0987654321'
                      className='w-full rounded-lg border border-border bg-background p-2 text-xs font-mono'
                    />
                  </div>
                  <div>
                    <label
                      htmlFor='complaint-acc-name'
                      className='text-[11px] text-muted-foreground block mb-0.5'
                    >
                      {isVi ? 'Chủ tài khoản (*):' : 'Account Holder (*):'}
                    </label>
                    <input
                      id='complaint-acc-name'
                      type='text'
                      value={complaintAccountName}
                      onChange={(e) => setComplaintAccountName(e.target.value)}
                      placeholder='NGUYEN VAN A'
                      className='w-full rounded-lg border border-border bg-background p-2 text-xs uppercase'
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setComplaintModalOpen(false)}
              className='text-xs h-9 rounded-xl cursor-pointer'
            >
              {isVi ? 'Đóng' : 'Close'}
            </Button>
            {complainableBookings.length > 0 && (
              <Button
                size='sm'
                onClick={handleConfirmComplaintRefund}
                disabled={createComplaintMutation.isPending}
                className='text-xs h-9 rounded-xl font-semibold gap-1.5 cursor-pointer'
              >
                {createComplaintMutation.isPending && <Loader2 className='h-3.5 w-3.5' />}
                <span>{isVi ? 'Gửi yêu cầu hoàn tiền' : 'Submit Refund Claim'}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Refund Details & Timeline Dialog */}
      {selectedRefundDetail && (
        <Dialog
          open={Boolean(selectedRefundDetail)}
          onOpenChange={(open) => !open && setSelectedRefundDetail(null)}
        >
          <DialogContent className='sm:max-w-lg rounded-2xl'>
            <DialogHeader>
              <DialogTitle className='text-base font-bold flex items-center gap-2'>
                <RotateCcw className='h-4 w-4 text-primary' />
                <span>
                  {isVi
                    ? `Chi tiết hoàn tiền #RF-${selectedRefundDetail.id}`
                    : `Refund Details #RF-${selectedRefundDetail.id}`}
                </span>
              </DialogTitle>
              <DialogDescription className='text-xs'>
                #{selectedRefundDetail.bookingCode} • {selectedRefundDetail.workspaceName}
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-2 text-xs'>
              {/* Summary Strip */}
              <div className='flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-3.5 rounded-xl border border-border'>
                <div>
                  <span className='text-muted-foreground block text-[11px]'>
                    {isVi ? 'Số tiền hoàn' : 'Refund Amount'}
                  </span>
                  <span className='text-lg font-bold text-emerald-600 dark:text-emerald-400'>
                    {formatCurrency(
                      selectedRefundDetail.approvedAmount ??
                        selectedRefundDetail.requestedAmount
                    )}
                  </span>
                </div>
                <div className='flex flex-wrap items-center gap-1.5'>
                  {renderSourceBadge(selectedRefundDetail.source, isVi)}
                  {renderStatusBadge(selectedRefundDetail, isVi)}
                </div>
              </div>

              {/* Bank & Transaction Info Box */}
              <div className='rounded-xl border border-border/80 bg-card p-3.5 space-y-2'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    {isVi ? 'Ngân hàng nhận hoàn:' : 'Receiving Bank:'}
                  </span>
                  <span className='font-semibold text-foreground'>
                    {selectedRefundDetail.bankName || (isVi ? 'Chưa cập nhật' : 'Not provided')}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    {isVi ? 'Số tài khoản nhận:' : 'Account Number:'}
                  </span>
                  <span className='font-mono font-bold text-foreground'>
                    {selectedRefundDetail.bankAccountNumber || '—'}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    {isVi ? 'Chủ tài khoản:' : 'Account Holder:'}
                  </span>
                  <span className='font-semibold uppercase text-foreground'>
                    {selectedRefundDetail.bankAccountName || '—'}
                  </span>
                </div>
                {selectedRefundDetail.refundReference && (
                  <div className='flex justify-between pt-1.5 border-t border-border/60'>
                    <span className='text-muted-foreground'>
                      {isVi ? 'Mã giao dịch hoàn PayOS:' : 'PayOS Payout Ref:'}
                    </span>
                    <span className='font-mono font-bold text-primary'>
                      {selectedRefundDetail.refundReference}
                    </span>
                  </div>
                )}
              </div>

              {/* 4-Step Visual Timeline */}
              <div className='space-y-3 rounded-xl border border-border/80 p-4'>
                <div className='font-bold text-foreground uppercase tracking-wider text-[11px]'>
                  {isVi ? 'Tiến trình xử lý & Thời gian' : 'Processing Timeline'}
                </div>

                {/* Step 1 */}
                <div className='flex items-start gap-3'>
                  <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0 mt-0.5' />
                  <div className='flex-1'>
                    <div className='flex justify-between font-semibold text-foreground'>
                      <span>
                        {isVi ? '1. Ghi nhận yêu cầu hoàn tiền' : '1. Refund Request Created'}
                      </span>
                      <span>{formatExactDateTime(selectedRefundDetail.createdAt, isVi)}</span>
                    </div>
                    <p className='text-muted-foreground text-[11px] mt-0.5'>
                      {selectedRefundDetail.reason ||
                        getSourceText(selectedRefundDetail.source, isVi)}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className='flex items-start gap-3'>
                  {selectedRefundDetail.bankAccountNumber ? (
                    <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0 mt-0.5' />
                  ) : (
                    <AlertCircle className='h-4 w-4 text-rose-600 shrink-0 mt-0.5' />
                  )}
                  <div className='flex-1'>
                    <div className='flex justify-between font-semibold text-foreground'>
                      <span>
                        {isVi
                          ? '2. Tài khoản ngân hàng nhận tiền'
                          : '2. Receiving Bank Account'}
                      </span>
                      <span>
                        {selectedRefundDetail.bankAccountNumber
                          ? isVi
                            ? 'Đã xác nhận'
                            : 'Verified'
                          : isVi
                            ? 'Chờ bổ sung'
                            : 'Pending'}
                      </span>
                    </div>
                    <p className='text-muted-foreground text-[11px] mt-0.5'>
                      {selectedRefundDetail.bankAccountNumber
                        ? `${selectedRefundDetail.bankName} • ${selectedRefundDetail.bankAccountNumber}`
                        : isVi
                          ? 'Vui lòng cập nhật số tài khoản để nhận tiền hoàn'
                          : 'Please provide your bank account to receive funds'}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className='flex items-start gap-3'>
                  {selectedRefundDetail.reviewedAt ||
                  selectedRefundDetail.status === 'PROCESSED' ? (
                    <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0 mt-0.5' />
                  ) : selectedRefundDetail.status === 'REJECTED' ? (
                    <XCircle className='h-4 w-4 text-rose-600 shrink-0 mt-0.5' />
                  ) : (
                    <Clock3 className='h-4 w-4 text-amber-500 shrink-0 mt-0.5' />
                  )}
                  <div className='flex-1'>
                    <div className='flex justify-between font-semibold text-foreground'>
                      <span>
                        {isVi ? '3. Duyệt lệnh hoàn tiền' : '3. Refund Authorization'}
                      </span>
                      <span>
                        {formatExactDateTime(selectedRefundDetail.reviewedAt, isVi) ||
                          (selectedRefundDetail.status === 'PROCESSED'
                            ? isVi
                              ? 'Tự động duyệt'
                              : 'Auto-approved'
                            : isVi
                              ? 'Đang xử lý'
                              : 'In progress')}
                      </span>
                    </div>
                    {selectedRefundDetail.adminNote && (
                      <p className='text-muted-foreground text-[11px] mt-0.5'>
                        {selectedRefundDetail.adminNote}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 4 */}
                <div className='flex items-start gap-3'>
                  {selectedRefundDetail.status === 'PROCESSED' ||
                  selectedRefundDetail.status === 'APPROVED' ? (
                    <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0 mt-0.5' />
                  ) : selectedRefundDetail.status === 'REJECTED' ? (
                    <XCircle className='h-4 w-4 text-rose-600 shrink-0 mt-0.5' />
                  ) : (
                    <Clock3 className='h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5' />
                  )}
                  <div className='flex-1'>
                    <div className='flex justify-between font-semibold text-foreground'>
                      <span>
                        {isVi
                          ? '4. Tiền hoàn về tài khoản'
                          : '4. Funds Disbursed to Bank Account'}
                      </span>
                      <span className='text-emerald-600 dark:text-emerald-400 font-bold'>
                        {formatExactDateTime(selectedRefundDetail.processedAt, isVi) ||
                          (isVi ? 'Chưa hoàn tất' : 'Pending')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className='gap-2 sm:gap-0'>
              {selectedRefundDetail.status === 'PENDING' && (
                <Button
                  size='sm'
                  onClick={() => {
                    const target = selectedRefundDetail;
                    setSelectedRefundDetail(null);
                    handleOpenBankModal(target);
                  }}
                  className='text-xs h-9 rounded-xl font-semibold cursor-pointer'
                >
                  {isVi ? 'Cập nhật TK ngân hàng' : 'Update Bank Account'}
                </Button>
              )}
              <Button
                variant='outline'
                size='sm'
                onClick={() => setSelectedRefundDetail(null)}
                className='text-xs h-9 rounded-xl cursor-pointer'
              >
                {isVi ? 'Đóng' : 'Close'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </div>
  );
}
