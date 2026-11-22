import { LoadingPlaceholder } from '@/components/ui/loading-placeholder';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { organizerPayoutQueries } from '../api/queries';
import { PayoutBalanceCards } from './payout-balance-cards';
import { AutoPayoutSettingsCard } from './auto-payout-settings-card';
import { WithdrawalHistoryTable } from './withdrawal-history-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, ArrowLeft } from '@/components/ui/hugeicons';
import { Link } from '@tanstack/react-router';

export const OrganizerPayoutsView: React.FC = () => {
  const { data: balance, isLoading: isBalanceLoading, error: balanceError } = useQuery(
    organizerPayoutQueries.balance()
  );

  const { data: settings, isLoading: isSettingsLoading } = useQuery(
    organizerPayoutQueries.settings()
  );

  const { data: history, isLoading: isHistoryLoading } = useQuery(
    organizerPayoutQueries.history(1, 20)
  );

  if (isBalanceLoading || isSettingsLoading) {
    return (
      <div className="p-6 space-y-4">
        <LoadingPlaceholder className="h-8 w-64 bg-slate-100 dark:bg-slate-800 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingPlaceholder key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/dashboard/organizer" className="hover:text-slate-800 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Dashboard
            </Link>
            <span>/</span>
            <span>Doanh thu & Chi trả</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Quản lý Chi trả & Rút tiền
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi số dư doanh thu, dòng tiền ký quỹ (HELD), rút tiền về ngân hàng và cài đặt rút tiền tự động hàng ngày.
          </p>
        </div>
      </div>

      {/* Cảnh báo chưa liên kết tài khoản ngân hàng */}
      {balance && !balance.hasConfiguredBank && (
        <Alert variant="destructive" className="border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30">
          <ShieldAlert className="h-4 w-4 text-rose-600" />
          <AlertTitle className="text-sm font-semibold text-rose-800 dark:text-rose-200">
            Chưa hoàn tất thông tin tài khoản ngân hàng
          </AlertTitle>
          <AlertDescription className="text-xs text-rose-700 dark:text-rose-300">
            Bạn cần cập nhật và xác thực số tài khoản ngân hàng trong{' '}
            <Link
              to="/dashboard/organizer/business-profile"
              className="font-bold underline hover:text-rose-900"
            >
              Hồ sơ doanh nghiệp
            </Link>{' '}
            để có thể thực hiện rút tiền hoặc kích hoạt tính năng Auto Payout.
          </AlertDescription>
        </Alert>
      )}

      {/* 4 Thẻ KPI số dư: Khả dụng, Đang tạm giữ HELD, Tổng doanh thu, Đã giải ngân */}
      {balance && <PayoutBalanceCards balance={balance} />}

      {/* Cấu hình chế độ Auto Payout & Xét duyệt */}
      {settings && <AutoPayoutSettingsCard settings={settings} />}

      {/* Bảng lịch sử rút tiền */}
      <WithdrawalHistoryTable history={history} isLoading={isHistoryLoading} />
    </div>
  );
};
