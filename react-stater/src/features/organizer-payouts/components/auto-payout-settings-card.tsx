import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  CalendarCheck,
  ShieldCheck
} from '@/components/ui/hugeicons';
import type { OrganizerPayoutSetting } from '../api/types';
import { RequestAutoPayoutDialog } from './request-auto-payout-dialog';
import { RequestCancelAutoDialog } from './request-cancel-auto-dialog';
import { useLanguage } from '@/features/landing/context/language-context';

interface AutoPayoutSettingsCardProps {
  settings: OrganizerPayoutSetting;
}

const formatHour = (h?: number | null) => {
  if (h === undefined || h === null) return '09:00';
  return `${h < 10 ? `0${h}` : h}:00`;
};

export const AutoPayoutSettingsCard: React.FC<AutoPayoutSettingsCardProps> = ({ settings }) => {
  const { language } = useLanguage();
  const [requestAutoOpen, setRequestAutoOpen] = useState(false);
  const [requestCancelOpen, setRequestCancelOpen] = useState(false);

  const isAutoDaily = settings.payoutMode === 'AUTO_DAILY';
  const isPendingEnable = settings.approvalStatus === 'PENDING_ENABLE';
  const isPendingDisable = settings.approvalStatus === 'PENDING_DISABLE';
  const isRejected = settings.approvalStatus === 'REJECTED';

  return (
    <>
      <Card className="border border-border/70 shadow-sm rounded-2xl bg-card overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Header Row: Title + Status + Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  {language === 'vi' ? 'Phương thức Chi trả & Rút tiền' : 'Payout & Withdrawal Mode'}
                </h3>
                {isAutoDaily ? (
                  <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 gap-1 text-[11px] font-semibold">
                    <Sparkles className="h-3 w-3" />
                    {language === 'vi' ? 'Tự động hàng ngày (Auto Payout)' : 'Daily Auto Payout'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-border/80 text-muted-foreground gap-1 text-[11px] font-semibold">
                    <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    {language === 'vi' ? 'Rút tiền thủ công (Manual)' : 'Manual Withdrawal'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {language === 'vi'
                  ? 'Quản lý cách giải ngân doanh thu từ NexSpace về tài khoản ngân hàng của bạn.'
                  : 'Configure how your revenue balance is disbursed to your bank account.'}
              </p>
            </div>

            {/* Approval Badges */}
            <div className="flex items-center gap-2">
              {isPendingEnable && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-xs py-1 px-2.5 font-medium animate-pulse">
                  <Clock className="h-3.5 w-3.5" />
                  {isAutoDaily
                    ? (language === 'vi'
                        ? `Chờ duyệt đổi sang ${formatHour(settings.pendingAutoPayoutHour)}`
                        : `Pending hour change to ${formatHour(settings.pendingAutoPayoutHour)}`)
                    : (language === 'vi'
                        ? `Chờ duyệt kích hoạt (${formatHour(settings.pendingAutoPayoutHour)})`
                        : `Pending approval (${formatHour(settings.pendingAutoPayoutHour)})`)}
                </Badge>
              )}
              {isPendingDisable && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-xs py-1 px-2.5 font-medium animate-pulse">
                  <Clock className="h-3.5 w-3.5" />
                  {language === 'vi' ? 'Chờ duyệt hủy Auto' : 'Pending cancellation approval'}
                </Badge>
              )}
              {isAutoDaily && !isPendingDisable && !isPendingEnable && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-xs py-1 px-2.5 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {language === 'vi'
                    ? `Hoạt động lúc ${formatHour(settings.autoPayoutHour)} hàng ngày`
                    : `Active at ${formatHour(settings.autoPayoutHour)} daily`}
                </Badge>
              )}
              {isRejected && (
                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 text-xs py-1 px-2.5 font-medium">
                  <XCircle className="h-3.5 w-3.5" />
                  {language === 'vi' ? 'Yêu cầu bị từ chối' : 'Request rejected'}
                </Badge>
              )}
            </div>
          </div>

          {/* 2 Streamlined Mode Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Box 1: Manual */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                !isAutoDaily
                  ? 'border-emerald-500/40 bg-emerald-500/[0.04]'
                  : 'border-border/60 bg-muted/20 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {language === 'vi' ? 'Rút tiền thủ công' : 'Manual Withdrawal'}
                </span>
                {!isAutoDaily && (
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    {language === 'vi' ? 'Đang kích hoạt' : 'Active'}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {language === 'vi'
                  ? 'Chủ động bấm rút tiền bất kỳ khi nào có số dư khả dụng từ 1.000 ₫. Phù hợp nếu bạn muốn kiểm soát chính xác từng lệnh chuyển.'
                  : 'Manually request withdrawals whenever you have available funds (from 1,000 VND). Best for exact cash flow management.'}
              </p>
            </div>

            {/* Box 2: Auto Daily */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                isAutoDaily
                  ? 'border-indigo-500/40 bg-indigo-500/[0.04]'
                  : 'border-border/60 bg-muted/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  {language === 'vi' ? 'Tự động hàng ngày (Auto Payout)' : 'Daily Auto Payout'}
                </span>
                {isAutoDaily && (
                  <span className="text-[10px] bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                    {language === 'vi' ? 'Đang kích hoạt' : 'Active'}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {language === 'vi' ? (
                  <>
                    Hệ thống tự động chuyển toàn bộ số dư khả dụng về ngân hàng vào{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {formatHour(settings.autoPayoutHour)}
                    </strong>{' '}
                    mỗi ngày mà không cần thao tác tay.
                  </>
                ) : (
                  <>
                    Automatically transfers all available balance to your bank at{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {formatHour(settings.autoPayoutHour)}
                    </strong>{' '}
                    daily without manual effort.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Admin Feedback on Rejection */}
          {isRejected && settings.adminFeedback && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong>{language === 'vi' ? 'Lý do Admin từ chối yêu cầu:' : 'Admin Rejection Reason:'}</strong> {settings.adminFeedback}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
            <div className="text-muted-foreground flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/70" />
              {language === 'vi'
                ? 'Thay đổi phương thức Auto Payout cần duyệt qua Admin để bảo đảm an toàn.'
                : 'Auto Payout changes require Admin review for security assurance.'}
            </div>

            <div className="flex items-center gap-2">
              {!isAutoDaily ? (
                <Button
                  size="sm"
                  onClick={() => setRequestAutoOpen(true)}
                  disabled={isPendingEnable}
                  className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3.5 rounded-lg gap-1.5 shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isPendingEnable
                    ? (language === 'vi' ? 'Yêu cầu đang chờ duyệt' : 'Request Pending')
                    : (language === 'vi' ? 'Đăng ký Auto Payout' : 'Register Auto Payout')}
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRequestAutoOpen(true)}
                    disabled={isPendingEnable || isPendingDisable}
                    className="cursor-pointer text-xs h-8 px-3 rounded-lg gap-1.5 border-border/80"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {isPendingEnable
                      ? (language === 'vi' ? 'Đang chờ duyệt đổi giờ' : 'Pending Hour Change')
                      : (language === 'vi' ? 'Đổi khung giờ Auto' : 'Change Auto Hour')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRequestCancelOpen(true)}
                    disabled={isPendingDisable || isPendingEnable}
                    className="cursor-pointer text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 text-xs h-8 px-3 rounded-lg gap-1.5"
                  >
                    <CalendarCheck className="h-3.5 w-3.5" />
                    {isPendingDisable
                      ? (language === 'vi' ? 'Chờ duyệt hủy Auto' : 'Cancellation Pending')
                      : (language === 'vi' ? 'Hủy chế độ Auto' : 'Cancel Auto Mode')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <RequestAutoPayoutDialog
        open={requestAutoOpen}
        onOpenChange={setRequestAutoOpen}
        currentHour={settings.pendingAutoPayoutHour || settings.autoPayoutHour || 9}
        isAutoDaily={isAutoDaily}
      />

      <RequestCancelAutoDialog
        open={requestCancelOpen}
        onOpenChange={setRequestCancelOpen}
      />
    </>
  );
};
