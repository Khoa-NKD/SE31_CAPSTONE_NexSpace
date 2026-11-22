import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

interface AutoPayoutSettingsCardProps {
  settings: OrganizerPayoutSetting;
}

export const AutoPayoutSettingsCard: React.FC<AutoPayoutSettingsCardProps> = ({ settings }) => {
  const [requestAutoOpen, setRequestAutoOpen] = useState(false);
  const [requestCancelOpen, setRequestCancelOpen] = useState(false);

  const isAutoDaily = settings.payoutMode === 'AUTO_DAILY';
  const isPendingEnable = settings.approvalStatus === 'PENDING_ENABLE';
  const isPendingDisable = settings.approvalStatus === 'PENDING_DISABLE';
  const isRejected = settings.approvalStatus === 'REJECTED';

  const formatHour = (h?: number | null) => {
    if (h === undefined || h === null) return '09:00';
    return `${h < 10 ? `0${h}` : h}:00`;
  };

  return (
    <>
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Chế độ Chi trả & Rút tiền
                </CardTitle>
                {isAutoDaily ? (
                  <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 gap-1 text-[11px] font-semibold">
                    <Sparkles className="h-3 w-3" /> Tự động hàng ngày (Auto Daily)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 gap-1 text-[11px] font-semibold">
                    <ShieldCheck className="h-3 w-3 text-slate-500" /> Rút tiền thủ công (Manual)
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Quản lý cách thức giải ngân doanh thu từ ví NexSpace về tài khoản ngân hàng của bạn.
              </CardDescription>
            </div>

            {/* Trạng thái xét duyệt của Admin */}
            <div>
              {isPendingEnable && (
                <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 gap-1 text-xs py-1 px-2.5 font-medium animate-pulse">
                  <Clock className="h-3.5 w-3.5" />
                  {isAutoDaily
                    ? `Chờ Admin duyệt đổi sang ${formatHour(settings.pendingAutoPayoutHour)}`
                    : `Chờ Admin duyệt kích hoạt (${formatHour(settings.pendingAutoPayoutHour)})`}
                </Badge>
              )}
              {isPendingDisable && (
                <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 gap-1 text-xs py-1 px-2.5 font-medium animate-pulse">
                  <Clock className="h-3.5 w-3.5" /> Chờ Admin duyệt hủy Auto
                </Badge>
              )}
              {isAutoDaily && !isPendingDisable && !isPendingEnable && (
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 text-xs py-1 px-2.5 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Đang hoạt động ({formatHour(settings.autoPayoutHour)} hàng ngày)
                </Badge>
              )}
              {isRejected && (
                <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800 gap-1 text-xs py-1 px-2.5 font-medium">
                  <XCircle className="h-3.5 w-3.5" /> Yêu cầu gần nhất bị từ chối
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Chế độ rút tiền thủ công (Manual) */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                !isAutoDaily
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Rút tiền thủ công (Mặc định)
                    {!isAutoDaily && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                        Đang chọn
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Chủ động ấn nút rút tiền bất kỳ khi nào bạn có số dư khả dụng từ 1.000 đ. Thích hợp nếu bạn muốn kiểm soát chính xác dòng tiền.
                  </p>
                </div>
              </div>
            </div>

            {/* Box 2: Chế độ Auto Payout */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                isAutoDaily
                  ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Tự động hàng ngày (Auto Payout)
                    {isAutoDaily && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                        Đang chọn
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Hệ thống tự động gom toàn bộ số dư khả dụng và chuyển khoản qua PayOS vào{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400">
                      {formatHour(settings.autoPayoutHour)}
                    </strong>{' '}
                    hàng ngày mà không cần thao tác tay.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Phản hồi từ Admin nếu có từ chối */}
          {isRejected && settings.adminFeedback && (
            <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong>Lý do Admin từ chối yêu cầu Auto Payout:</strong> {settings.adminFeedback}
              </div>
            </div>
          )}

          {/* Nút hành động thay đổi cấu hình */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
              Mọi thay đổi chế độ rút tiền đều cần gửi yêu cầu lên Admin để bảo đảm an toàn bảo mật.
            </div>

            <div className="flex items-center gap-2">
              {!isAutoDaily ? (
                <Button
                  size="sm"
                  onClick={() => setRequestAutoOpen(true)}
                  disabled={isPendingEnable}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isPendingEnable ? 'Yêu cầu đang chờ duyệt' : 'Đăng ký Auto Payout'}
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRequestAutoOpen(true)}
                    disabled={isPendingEnable || isPendingDisable}
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-950/30 text-xs h-8 px-3 gap-1.5"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {isPendingEnable ? 'Đang chờ duyệt đổi giờ' : 'Đổi khung giờ Auto'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRequestCancelOpen(true)}
                    disabled={isPendingDisable || isPendingEnable}
                    className="text-amber-700 hover:text-amber-800 border-amber-200 hover:bg-amber-50 dark:border-amber-900/50 dark:hover:bg-amber-950/30 text-xs h-8 px-3 gap-1.5"
                  >
                    <CalendarCheck className="h-3.5 w-3.5" />
                    {isPendingDisable ? 'Yêu cầu hủy đang chờ duyệt' : 'Yêu cầu hủy Auto Payout'}
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
