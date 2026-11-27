import { LoadingPlaceholder } from '@/components/ui/loading-placeholder';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { organizerPayoutQueries } from '../api/queries';
import { PayoutBalanceCards } from './payout-balance-cards';
import { AutoPayoutSettingsCard } from './auto-payout-settings-card';
import { WithdrawalHistoryTable } from './withdrawal-history-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Wallet, RefreshCw } from '@/components/ui/hugeicons';
import { Spinner } from '@/components/ui/spinner';
import { Link } from '@tanstack/react-router';
import { useLanguage } from '@/features/landing/context/language-context';
import { OrganizerPageHeader } from '@/components/layout/organizer-page-header';

export const OrganizerPayoutsView: React.FC = () => {
  const { language } = useLanguage();

  const {
    data: balance,
    isLoading: isBalanceLoading,
    isFetching: isBalanceFetching,
    refetch: refetchBalance
  } = useQuery(organizerPayoutQueries.balance());

  const {
    data: settings,
    isLoading: isSettingsLoading,
    isFetching: isSettingsFetching,
    refetch: refetchSettings
  } = useQuery(organizerPayoutQueries.settings());

  const {
    data: history,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    refetch: refetchHistory
  } = useQuery(organizerPayoutQueries.history(1, 20));

  const isRefreshing = isBalanceFetching || isSettingsFetching || isHistoryFetching;

  const handleRefresh = async () => {
    await Promise.all([refetchBalance(), refetchSettings(), refetchHistory()]);
  };

  if (isBalanceLoading || isSettingsLoading) {
    return (
      <div className="space-y-4 pb-12">
        <LoadingPlaceholder className="h-10 w-72 bg-muted rounded-xl" />
        <LoadingPlaceholder className="h-36 w-full bg-muted rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <LoadingPlaceholder key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Standard Header */}
      <OrganizerPageHeader
        icon={<Wallet className="h-5 w-5" />}
        title={language === 'vi' ? 'Quản lý Chi trả & Rút tiền' : 'Payouts & Balance Management'}
        description={
          language === 'vi'
            ? 'Theo dõi số dư doanh thu, dòng tiền ký quỹ (HELD), rút tiền về ngân hàng và cài đặt rút tiền tự động hàng ngày.'
            : 'Track revenue balance, escrow funds (HELD), bank withdrawals, and daily auto-payout configurations.'
        }
      >
        <Button
          variant="outline"
          size="sm"
          disabled={isRefreshing}
          onClick={() => void handleRefresh()}
          className="cursor-pointer gap-1.5 rounded-xl text-xs h-9"
        >
          {isRefreshing ? <Spinner className="size-3.5" /> : <RefreshCw className="size-3.5" />}
          <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
        </Button>
      </OrganizerPageHeader>

      {/* Cảnh báo chưa liên kết tài khoản ngân hàng */}
      {balance && !balance.hasConfiguredBank && (
        <Alert
          variant="destructive"
          className="border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200 rounded-xl"
        >
          <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <AlertTitle className="text-sm font-semibold">
            {language === 'vi'
              ? 'Chưa hoàn tất thông tin tài khoản ngân hàng'
              : 'Bank account information incomplete'}
          </AlertTitle>
          <AlertDescription className="text-xs text-rose-700 dark:text-rose-300 mt-1">
            {language === 'vi' ? (
              <>
                Bạn cần cập nhật và xác thực số tài khoản ngân hàng trong{' '}
                <Link
                  to="/dashboard/organizer/business-profile"
                  className="font-bold underline hover:text-rose-950 dark:hover:text-rose-100"
                >
                  Hồ sơ doanh nghiệp
                </Link>{' '}
                để có thể thực hiện rút tiền hoặc kích hoạt tính năng Auto Payout.
              </>
            ) : (
              <>
                You need to update and verify your bank account details in{' '}
                <Link
                  to="/dashboard/organizer/business-profile"
                  className="font-bold underline hover:text-rose-950 dark:hover:text-rose-100"
                >
                  Business Profile
                </Link>{' '}
                to withdraw funds or activate Auto Payout.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Hero Balance & 3 Compact Secondary Metric Cards */}
      {balance && <PayoutBalanceCards balance={balance} />}

      {/* Cấu hình chế độ Auto Payout & Xét duyệt */}
      {settings && <AutoPayoutSettingsCard settings={settings} />}

      {/* Bảng lịch sử rút tiền */}
      <WithdrawalHistoryTable history={history} isLoading={isHistoryLoading} />
    </div>
  );
};
