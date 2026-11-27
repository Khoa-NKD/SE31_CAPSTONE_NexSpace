import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Clock,
  HelpCircle,
  ArrowUpRight,
  TrendingUp,
  Building2,
  ShieldCheck,
  CheckCircle
} from '@/components/ui/hugeicons';
import type { OrganizerPayoutBalance } from '../api/types';
import { ManualWithdrawalDialog } from './manual-withdrawal-dialog';
import { useLanguage } from '@/features/landing/context/language-context';

interface PayoutBalanceCardsProps {
  balance: OrganizerPayoutBalance;
}

function formatVnd(val?: number | null): string {
  if (val == null || Number.isNaN(val)) return '0 ₫';
  return `${Math.round(val).toLocaleString('vi-VN')} ₫`;
}

export const PayoutBalanceCards: React.FC<PayoutBalanceCardsProps> = ({ balance }) => {
  const { language } = useLanguage();
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const canWithdraw = balance.canWithdraw && balance.withdrawableBalance >= 1000;

  return (
    <div className="space-y-3.5">
      {/* Hero Withdrawal Banner: Focus on Withdrawable Balance & Primary Action */}
      <Card className="relative overflow-hidden border border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] via-card to-card shadow-sm rounded-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 -mr-16 -mt-16 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <CardContent className="p-5 sm:p-6 relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            {/* Left Column: Withdrawable Balance & Account Information */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {language === 'vi' ? 'Sẵn sàng rút về ngân hàng' : 'Available for withdrawal'}
                </span>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Help"
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      {language === 'vi'
                        ? 'Doanh thu từ các đơn đặt chỗ đã hoàn tất quá 24h và không có khiếu nại. Bạn có thể rút ngay tức thì qua PayOS 24/7.'
                        : 'Balance from completed bookings past the 24h escrow window with no disputes. Ready to withdraw via PayOS 24/7.'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {language === 'vi' ? 'Số dư khả dụng có thể rút' : 'Withdrawable Balance'}
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                    {Math.round(balance.withdrawableBalance).toLocaleString('vi-VN')}
                  </span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₫</span>
                </div>
              </div>

              {/* Bank Account Info Chip */}
              <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {balance.bankName || (language === 'vi' ? 'Chưa liên kết ngân hàng' : 'No bank linked')}
                  {balance.bankAccountNumberMasked && (
                    <span className="font-mono text-muted-foreground font-normal">
                      ({balance.bankAccountNumberMasked})
                    </span>
                  )}
                </span>
                {balance.bankAccountHolder && (
                  <>
                    <span className="text-border hidden sm:inline">•</span>
                    <span className="uppercase text-[11px] font-semibold text-muted-foreground">
                      {balance.bankAccountHolder}
                    </span>
                  </>
                )}
                <span className="text-border hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="h-3 w-3" />
                  {language === 'vi' ? 'PayOS tức thì 24/7 · Miễn phí' : 'PayOS 24/7 Instant · 0 VND fee'}
                </span>
              </div>
            </div>

            {/* Right Column: Prominent Withdrawal Action */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-2 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-border/60">
              <Button
                size="lg"
                onClick={() => setWithdrawModalOpen(true)}
                disabled={!canWithdraw}
                className="w-full sm:w-auto cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm h-11 px-6 rounded-xl shadow-md hover:shadow-emerald-500/20 transition-all gap-2 flex items-center justify-center"
              >
                <ArrowUpRight className="h-4 w-4" />
                {language === 'vi' ? 'Rút tiền ngay' : 'Withdraw Now'}
              </Button>

              <span className="text-[11px] text-muted-foreground">
                {language === 'vi'
                  ? 'Hạn mức: Tối thiểu 1.000 ₫ · Tối đa 100% số dư'
                  : 'Min: 1,000 VND · Max: 100% balance'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 Compact Secondary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Đang tạm giữ (HELD / Escrow 24h) */}
        <Card className="border border-border/70 bg-card rounded-xl shadow-xs transition-shadow hover:shadow-sm">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                {language === 'vi' ? 'Đang tạm giữ (Ký quỹ HELD)' : 'Held in Escrow (HELD)'}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Held Info"
                      className="text-muted-foreground/70 hover:text-foreground transition-colors"
                    >
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {language === 'vi'
                      ? 'Khoản tiền từ các đơn mới hoặc vừa kết thúc trong vòng 24 giờ để đảm bảo xử lý khiếu nại của khách hàng (Escrow). Sau 24h không có tranh chấp, tiền sẽ tự động chuyển sang số dư khả dụng.'
                      : 'Funds from active or recently ended bookings within 24h escrow window. Released automatically after 24h.'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
              {formatVnd(balance.heldBalance)}
            </div>

            <p className="text-[11px] text-muted-foreground truncate">
              {language === 'vi' ? 'Ký quỹ an toàn 24h · Tự động mở khóa' : '24h safety escrow · Auto unlocked'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Đã giải ngân về ngân hàng */}
        <Card className="border border-border/70 bg-card rounded-xl shadow-xs transition-shadow hover:shadow-sm">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-sky-600 dark:text-sky-400">
                <CheckCircle className="h-3.5 w-3.5" />
                {language === 'vi' ? 'Đã giải ngân về ngân hàng' : 'Disbursed to Bank'}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Disbursed Info"
                      className="text-muted-foreground/70 hover:text-foreground transition-colors"
                    >
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {language === 'vi'
                      ? 'Tổng số tiền đã được chuyển thành công về tài khoản ngân hàng của bạn qua các lần rút thủ công hoặc Auto Payout.'
                      : 'Total revenue successfully transferred to your bank account via manual or auto payouts.'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {formatVnd(balance.paidOutTotal)}
            </div>

            <p className="text-[11px] text-muted-foreground truncate">
              {language === 'vi' ? 'Đã thực chuyển thành công qua PayOS' : 'Transferred successfully via PayOS'}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Tổng doanh thu thực nhận (All time) */}
        <Card className="border border-border/70 bg-card rounded-xl shadow-xs transition-shadow hover:shadow-sm">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
                {language === 'vi' ? 'Tổng doanh thu thực nhận' : 'Total Net Revenue'}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Revenue Info"
                      className="text-muted-foreground/70 hover:text-foreground transition-colors"
                    >
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {language === 'vi'
                      ? 'Tổng thu nhập toàn thời gian từ tất cả đơn đặt chỗ sau khi đã khấu trừ phí nền tảng NexSpace.'
                      : 'All-time net revenue earned after deducting NexSpace platform fee.'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {formatVnd(balance.grossRevenue)}
            </div>

            <p className="text-[11px] text-muted-foreground truncate">
              {language === 'vi' ? 'Đã trừ phí nền tảng · Toàn thời gian' : 'Net of platform fees · All time'}
            </p>
          </CardContent>
        </Card>
      </div>

      <ManualWithdrawalDialog
        open={withdrawModalOpen}
        onOpenChange={setWithdrawModalOpen}
        balance={balance}
      />
    </div>
  );
};
