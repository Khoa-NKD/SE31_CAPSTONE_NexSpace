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
  Wallet,
  Clock,
  CheckCircle,
  HelpCircle,
  ArrowUpRight,
  TrendingUp,
  Building2
} from '@/components/ui/hugeicons';
import type { OrganizerPayoutBalance } from '../api/types';
import { ManualWithdrawalDialog } from './manual-withdrawal-dialog';

interface PayoutBalanceCardsProps {
  balance: OrganizerPayoutBalance;
}

export const PayoutBalanceCards: React.FC<PayoutBalanceCardsProps> = ({ balance }) => {
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Khả dụng có thể rút (Chính / Primary highlight) */}
        <Card className="relative overflow-hidden border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle className="h-4 w-4" />
                Khả dụng có thể rút
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-emerald-600/70 hover:text-emerald-700">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Số dư từ các đơn đặt chỗ đã kết thúc quá 24h và không có tranh chấp khiếu nại. Sẵn sàng rút về tài khoản bất cứ lúc nào.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {balance.withdrawableBalance.toLocaleString('vi-VN')}{' '}
              <span className="text-sm font-semibold text-slate-500">đ</span>
            </div>

            <div className="mt-4 pt-3 border-t border-emerald-100 dark:border-emerald-950/50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Tối thiểu: 50.000 đ
              </span>
              <Button
                size="sm"
                onClick={() => setWithdrawModalOpen(true)}
                disabled={!balance.canWithdraw}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 px-3 shadow-sm gap-1"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Rút tiền ngay
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Đang tạm giữ (HELD / Escrow) */}
        <Card className="relative overflow-hidden border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/40 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="h-4 w-4" />
                Đang tạm giữ (HELD)
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-amber-600/70 hover:text-amber-700">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Doanh thu từ các đơn đặt chỗ đang diễn ra hoặc nằm trong thời hạn 24 giờ sau khi kết thúc để bảo vệ quyền khiếu nại của khách hàng (Escrow). Sau 24h không có khiếu nại, số tiền này sẽ tự động chuyển sang Khả dụng.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="text-2xl lg:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              {balance.heldBalance.toLocaleString('vi-VN')}{' '}
              <span className="text-sm font-semibold text-slate-500">đ</span>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-100 dark:border-amber-950/50 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                Ký quỹ an toàn 24h
              </span>
              <span>Chưa thể rút</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Tổng doanh thu (Gross Revenue) */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Tổng doanh thu thực nhận
              </span>
            </div>

            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {balance.grossRevenue.toLocaleString('vi-VN')}{' '}
              <span className="text-sm font-semibold text-slate-500">đ</span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Đã trừ hoa hồng sàn</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">Toàn thời gian</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Đã giải ngân (Paid Out Total) & Tài khoản thụ hưởng */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Wallet className="h-4 w-4 text-slate-400" />
                Đã giải ngân về bank
              </span>
            </div>

            <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {balance.paidOutTotal.toLocaleString('vi-VN')}{' '}
              <span className="text-sm font-semibold text-slate-500">đ</span>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 truncate max-w-[120px]">
                <Building2 className="h-3 w-3 shrink-0" />
                {balance.bankName || 'Chưa liên kết'}
              </span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {balance.bankAccountNumberMasked || '••••'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ManualWithdrawalDialog
        open={withdrawModalOpen}
        onOpenChange={setWithdrawModalOpen}
        balance={balance}
      />
    </>
  );
};
