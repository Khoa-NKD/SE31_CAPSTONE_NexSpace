import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck
} from '@/components/ui/hugeicons';
import type { OrganizerPayoutBalance } from '../api/types';
import { useManualWithdrawalMutation } from '../api/mutations';
import { useLanguage } from '@/features/landing/context/language-context';

interface ManualWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: OrganizerPayoutBalance;
}

const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000, 2_000_000, 5_000_000];

export const ManualWithdrawalDialog: React.FC<ManualWithdrawalDialogProps> = ({
  open,
  onOpenChange,
  balance
}) => {
  const { language } = useLanguage();
  const [amount, setAmount] = useState<string>('');
  const [withdrawAll, setWithdrawAll] = useState<boolean>(false);
  const withdrawalMutation = useManualWithdrawalMutation();

  const available = Math.round(balance.withdrawableBalance);
  const numAmount = withdrawAll ? available : Number(amount) || 0;
  const isValidAmount = numAmount >= 1000 && numAmount <= available;

  const handleWithdrawAll = () => {
    setWithdrawAll(true);
    setAmount(available.toString());
  };

  const handleSelectQuickAmount = (val: number) => {
    if (val > available) {
      handleWithdrawAll();
    } else {
      setWithdrawAll(false);
      setAmount(val.toString());
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWithdrawAll(false);
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmount(raw);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAmount) return;

    withdrawalMutation.mutate(
      {
        amount: withdrawAll ? available : numAmount,
        withdrawAll
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setAmount('');
          setWithdrawAll(false);
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-5 sm:p-6 rounded-2xl">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <span className="p-1 rounded-lg bg-emerald-500/10">
              <ArrowUpRight className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider">
              {language === 'vi' ? 'Rút tiền về ngân hàng' : 'Withdrawal to Bank'}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {language === 'vi' ? 'Yêu cầu Rút tiền ngay' : 'Request Instant Payout'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {language === 'vi'
              ? 'Tiền sẽ được chuyển khoản tức thì 24/7 qua cổng PayOS đến tài khoản ngân hàng chính chủ của bạn.'
              : 'Funds will be transferred instantly 24/7 via PayOS to your verified bank account.'}
          </DialogDescription>
        </DialogHeader>

        {/* Beneficiary Account Details Box */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {language === 'vi' ? 'Tài khoản thụ hưởng' : 'Beneficiary Account'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-500/15 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              {language === 'vi' ? 'Đã liên kết' : 'Verified'}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-0.5">
            <span className="text-sm font-semibold text-foreground">
              {balance.bankName || (language === 'vi' ? 'Chưa liên kết' : 'Not linked')}
            </span>
            <span className="font-mono text-sm font-bold text-foreground tracking-wide">
              {balance.bankAccountNumberMasked || '••••'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5 border-t border-border/50">
            <span className="uppercase font-semibold tracking-wider">
              {balance.bankAccountHolder || (language === 'vi' ? 'CHỦ TÀI KHOẢN' : 'ACCOUNT HOLDER')}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {language === 'vi' ? 'Phí giao dịch: 0 ₫' : 'Fee: 0 VND'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <Label htmlFor="withdrawal-amount" className="font-medium text-foreground">
                {language === 'vi' ? 'Số tiền muốn rút (₫)' : 'Amount to withdraw (VND)'}
              </Label>
              <button
                type="button"
                onClick={handleWithdrawAll}
                className="cursor-pointer text-emerald-600 dark:text-emerald-400 hover:underline text-xs font-semibold"
              >
                {language === 'vi' ? 'Rút toàn bộ số dư' : 'Withdraw max'}
              </button>
            </div>

            <div className="relative">
              <Input
                id="withdrawal-amount"
                type="text"
                placeholder={language === 'vi' ? 'Ví dụ: 500,000' : 'E.g.: 500,000'}
                value={
                  withdrawAll
                    ? available.toLocaleString('vi-VN')
                    : amount
                      ? Number(amount).toLocaleString('vi-VN')
                      : ''
                }
                onChange={handleAmountChange}
                className="h-11 text-base font-bold tabular-nums pr-12 rounded-xl"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                ₫
              </span>
            </div>

            {/* Quick Amount Suggestion Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {QUICK_AMOUNTS.filter((v) => v <= available).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleSelectQuickAmount(v)}
                  className={`cursor-pointer text-xs rounded-lg px-2.5 py-1 border transition-colors ${
                    numAmount === v && !withdrawAll
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {(v / 1000).toLocaleString('vi-VN')}k ₫
                </button>
              ))}
              <button
                type="button"
                onClick={handleWithdrawAll}
                className={`cursor-pointer text-xs rounded-lg px-2.5 py-1 border transition-colors ${
                  withdrawAll
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {language === 'vi' ? 'Tất cả' : 'All'} ({available.toLocaleString('vi-VN')} ₫)
              </button>
            </div>

            <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
              <span>{language === 'vi' ? 'Hạn mức tối thiểu: 1.000 ₫' : 'Min: 1,000 VND'}</span>
              <span>
                {language === 'vi' ? 'Khả dụng:' : 'Available:'}{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {available.toLocaleString('vi-VN')} ₫
                </strong>
              </span>
            </div>
          </div>

          {numAmount > available && (
            <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                {language === 'vi'
                  ? 'Số tiền yêu cầu vượt quá số dư khả dụng có thể rút!'
                  : 'Requested amount exceeds withdrawable balance!'}
              </span>
            </div>
          )}

          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {language === 'vi'
                ? 'Giao dịch qua PayOS tự động xử lý và gửi thông báo biến động số dư tức thì.'
                : 'Payouts are executed instantly via PayOS with real-time notification.'}
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={withdrawalMutation.isPending}
              className="cursor-pointer rounded-xl"
            >
              {language === 'vi' ? 'Hủy bỏ' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={!isValidAmount || withdrawalMutation.isPending}
              className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl gap-1.5"
            >
              {withdrawalMutation.isPending
                ? (language === 'vi' ? 'Đang chuyển khoản...' : 'Processing...')
                : (language === 'vi' ? 'Xác nhận rút tiền' : 'Confirm Withdrawal')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
